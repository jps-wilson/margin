// Minimal Express server for the Figma Diff Tool backend.
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import crypto from "crypto";
import { diff } from "./diff.js";
import { error } from "console";

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const IS_PROD = process.env.NODE_ENV === "production";
const SESSION_COOKIE = "mdt_sid";

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

// Health check route - confirms the server is running
app.get("/", (req, res) => {
  res.json({ message: "Figma Diff Tool API is running" });
});

// *Session Storage*
// Per-session token store. Keyed by a random session id stored in an
// httpOnly cookie on the visitor's browser, so each visitor gets their own
// Figma access token instead of everyone sharing one global variable.
// NOTE: this is in-memory, so it resets on server restart (eg: Render
// free-tier spin-down after inactivity).

const sessions = new Map(); // sessionId -> { accessToken, obtainedAt }
const pendingStates = new Map(); // oauth state -> sessionId (short-lived, CSRF check)

function getOrCreateSessionId(req, res) {
  let sessionId = req.cookies[SESSION_COOKIE];
  if (!sessionId) {
    sessionId = crypto.randomBytes(24).toString("hex");
    res.cookie(SESSION_COOKIE, sessionId, {
      httpOnly: true,
      secure: IS_PROD,
      sameSite: IS_PROD ? "none" : "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    });
  }
  return sessionId;
}

function requireAccessToken(req, res) {
  const sessionId = req.cookies[SESSION_COOKIE];
  const session = sessionId ? sessions.get(sessionId) : null;

  if (!session) {
    res.status(401).json({
      error: "Not connected to Figma. Visit /auth/figma to authenticate.",
    });
    return null;
  }

  return session.accessToken;
}

// *OAuth flow*

// Start the OAuth flow -> redirects the user to Figma's authorization page
app.get("/auth/figma", (req, res) => {
  const sessionId = getOrCreateSessionId(req, res);

  // Generate a random state value to prevent CSRF attacks, tied to this
  // specific visitor's session so the callback can't be highjacked to write
  // a token into someone else's sessioon.
  const state = crypto.randomBytes(16).toString("hex");
  pendingStates.set(state, sessionId);

  // Build the Figma auth URL
  const authUrl = new URL("https://www.figma.com/oauth");
  authUrl.searchParams.set("client_id", process.env.FIGMA_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", process.env.FIGMA_REDIRECT_URI);
  authUrl.searchParams.set(
    "scope",
    "file_content:read,file_metadata:read,file_versions:read",
  );
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("response_type", "code");

  // Redirect the user to Figma
  res.redirect(authUrl.toString());
});

// OAuth callback - Figma redirects here after user aproves
app.get("/auth/callback", async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    console.error("Figma OAuth error:", error);
    return res.status(400).json({ error: `Figma returned an error: ${error}` });
  }

  // Verify the state param to prevent CSRF, and recover which session this auth belongs to
  const sessionId = state ? pendingStates.get(state) : null;
  if (!state || !sessionId) {
    console.error("Invalid or missing state parameter");
    return res.status(400).json({ error: "Invalid state parameter" });
  }
  pendingStates.delete(state);

  // Exchange code for access token
  try {
    const tokenResponse = await fetch("https://api.figma.com/v1/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " +
          Buffer.from(
            `${process.env.FIGMA_CLIENT_ID}:${process.env.FIGMA_CLIENT_SECRET}`,
          ).toString("base64"),
      },
      body: new URLSearchParams({
        redirect_uri: process.env.FIGMA_REDIRECT_URI,
        code,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Token exchange failed:", tokenResponse.status, errorText);
      return res.status(500).json({ error: "Token exchange failed" });
    }

    const tokenData = await tokenResponse.json();
    console.log("Token exchange successful. Token type:", tokenData.token_type);

    // Store the token under THIS visitor's session only
    sessions.set(sessionId, {
      accessToken: tokenData.accessToken,
      obtainedAt: Date.now(),
    });

    // Redirect back to React client
    res.redirect(`${process.env.CLIENT_URL}/paste`);
  } catch (err) {
    console.error("Token exchange error:", err);
    res.status(500).json({ error: "Token exchange failed" });
  }
});

// --- API ENDPOINTS ----

/**
 * Version endpoint - fetches a Figma file's version history
 * Usage: /api/version/YOUR_FILE_KEY
 */
app.get("api/versions/:fileKey", async (req, res) => {
  const accessToken = requireAccessToken(req, res);
  if (!accessToken) return; // response already sent

  const { fileKey } = req.params;

  try {
    const figmaResponse = await fetch(
      `https://api.figma.com/v1/files${fileKey}/versions`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    if (!figmaResponse.ok) {
      const errorText = await figmaResponse.text();
      console.error("Figma API call failed:", figmaResponse.status, errorText);
      return res.status(figmaResponse.status).json({
        error: "figma API call failed",
        status: figmaResponse.status,
      });
    }

    const versionsData = await figmaResponse.json();
    res.json(versionsData);
  } catch (err) {
    console.error("Error fetching versions:", err);
    res.status(500).json({ error: "Failed to fetch versions" });
  }
});

app.get("/api/diff/:fileKey", async (req, res) => {
  const accessToken = requireAccessToken(req, res);
  if (!accessToken) return;

  const { fileKey } = req.params;
  const { from, to } = req.query;

  if (!from || !to) {
    return res
      .status(400)
      .json({ error: "Missing 'from' and 'to' version IDs" });
  }

  try {
    const [fromRes, toRes] = await Promise.all([
      fetch(`https://api.figma.com/v1/files/${fileKey}?version=${from}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
      fetch(`https://api.figma.com/v1/files/${fileKey}?version=${to}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
    ]);

    if (!fromRes.ok || !toRes.ok) {
      console.error("Figma API error:", fromRes.status, toRes.status);
      return res
        .status(fromRes.ok ? toRes.status : fromRes.status)
        .json({ error: "Failed to fetch file versions from Figma" });
    }

    const [fromFile, toFile] = await Promise.all([
      fromRes.json(),
      toRes.json(),
    ]);

    const result = diff(fromFile, toFile);

    res.json({
      ...result,
      fileName: toFile.name || fromFile.name || "Untitled",
      fromDate: fromFile.lastModified,
      toDate: toFile.lastModified,
    });
  } catch (err) {
    console.error("Diff error:", err);
    res.status(500).json({ error: "Diff failed" });
  }
});

/**
 * Frame image endpoint - renders a specific Figma node as a PNG
 * Usage: /api/frame-image/FILE_KEY/NODE_ID?version=VERSION_ID
 */
app.get("/api/frame-image/:fileKey/:nodeId", async (req, res) => {
  const accessToken = requireAccessToken(req, res);
  if (!accessToken) return;

  const { fileKey, nodeId } = req.params;
  const { version } = req.query;

  try {
    const url = `https://api.figma.com/v1/images/${fileKey}?ids=${nodeId}&format=png&scale=1${version ? `&version=${version}` : ""}`;

    const figmaRes = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!figmaRes.ok) {
      const errorText = await figmaRes.text();
      console.error("Figma image API error:", figmaRes.status, errorText);
      return res
        .status(figmaRes.status)
        .json({ error: "Failed to fetch frame image" });
    }

    const data = await figmaRes.json();
    const imageUrl = data.images?.[nodeId] || null;

    res.json({ imageUrl });
  } catch (err) {
    console.error("Frame image error:", err);
    res.status(500).json({ error: "Failed to fetch frame image" });
  }
});

/**
 * File info endpoint - returns basic file metadata
 * Usage: /api/file-info/FILE_KEY
 */
app.get("/api/file-info/:fileKey", async (req, res) => {
  const accessToken = requireAccessToken(req, res);
  if (!accessToken) return;

  const { fileKey } = req.params;

  try {
    const figmaRes = await fetch(
      `https://api.figma.com/v1/files/${fileKey}?depth=1`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    if (!figmaRes.ok) {
      return res
        .status(figmaRes.status)
        .json({ error: "Failed to fetch file info" });
    }

    const data = await figmaRes.json();
    res.json({
      name: data.name,
      lastModified: data.lastModified,
    });
  } catch (err) {
    console.error("File info error:", err);
    res.status(500).json({ error: "Failed to fetch file info" });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
