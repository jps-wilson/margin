import "varlock/auto-load";
import session from "express-session";
import express from "express";
import cors from "cors";
import crypto from "crypto";
import { diff } from "./diff.js";
import { createClient } from "redis";
import { RedisStore } from "connect-redis";

const isProd = process.env.NODE_ENV === "production";

const redisClient = createClient({ url: process.env.REDIS_URL });
redisClient.on("error", (err) => console.error("Redis error:", err));
await redisClient.connect();

const app = express();
const PORT = process.env.PORT || 3000;

// Required behind Render TLS proxies, or `secure` cookies never get set
app.set("trust proxy", 1);

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL ?? "http://localhost:5173", // only the frontend can call the API with cookies
    credentials: true, // allows the browser to cookies cross-origin
  }),
);
app.use(express.json());

app.use(
  session({
    store: new RedisStore({ client: redisClient }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false, // don't create a session until someone actually logs in
    cookie: {
      httpOnly: true, // JavaScript can't read the session cookie (safer)
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  }),
);

// Health check route - confirms the server is running
app.get("/", (req, res) => {
  res.json({ message: "Figma Diff Tool API is running" });
});

function getAccessToken(req, res) {
  const token = req.session?.figmaAccessToken;
  if (!token) {
    res.status(401).json({
      error: "Not authenticated. Connect Figma first.",
    });
    return null;
  }
  return token;
}
// Start the OAuth flow - redirects the user to Figma's authorization page
app.get("/auth/figma", (req, res) => {
  // Generate a random state value to prevent CSRF attacks
  const state = crypto.randomBytes(16).toString("hex");
  req.session.oauthState = state;

  // Build the Figma authorization URL
  const authUrl = new URL("https://www.figma.com/oauth");
  authUrl.searchParams.set("client_id", process.env.FIGMA_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", process.env.FIGMA_REDIRECT_URI);
  authUrl.searchParams.set(
    "scope",
    "file_content:read,file_metadata:read,file_versions:read",
  );
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("response_type", "code");

  // Save session before redirecting — ensures oauthState is persisted before
  // Figma bounces the user back to /auth/callback (critical for new sessions in incognito)
  req.session.save((err) => {
    if (err) return res.status(500).json({ error: "Session save failed" });
    res.redirect(authUrl.toString());
  });
});

// OAuth callback - Figma redirects here after the user approves
app.get("/auth/callback", async (req, res) => {
  const { code, state, error } = req.query;

  // Handle errors from Figma
  if (error) {
    console.error("Figma OAuth error:", error);
    return res.status(400).json({ error: `Figma returned an error: ${error}` });
  }

  // Verify the state parameter to prevent CSRF
  if (!state || req.session.oauthState !== state) {
    console.error("Invalid or missing state parameter");
    return res.status(400).json({ error: "Invalid state parameter" });
  }
  delete req.session.oauthState;

  // Exchange the code for an access token
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
    req.session.figmaAccessToken = tokenData.access_token;

    // Redirect back to the React client
    res.redirect(`${process.env.CLIENT_URL}/paste`);
  } catch (err) {
    console.error("Token exchange error:", err);
    res.status(500).json({ error: "Token exchange failed" });
  }
});

app.get("/auth/me", (req, res) => {
  res.json({ authenticated: Boolean(req.session?.figmaAccessToken) });
});

app.get("/auth/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: "Logout failed" });
    res.redirect(process.env.CLIENT_URL ?? "/");
  });
});

// Versions endpoint - fetches a Figma file's version history
// Usage: /api/version/YOUR_FILE_KEY
app.get("/api/versions/:fileKey", async (req, res) => {
  const token = getAccessToken(req, res);
  if (!token) return;

  const { fileKey } = req.params;

  try {
    const figmaResponse = await fetch(
      `https://api.figma.com/v1/files/${fileKey}/versions`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!figmaResponse.ok) {
      const errorText = await figmaResponse.text();
      console.error("Figma API call failed:", figmaResponse.status, errorText);
      return res.status(figmaResponse.status).json({
        error: "Figma API call failed",
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
  const token = getAccessToken(req, res);
  if (!token) return;

  const { fileKey } = req.params;
  const { from, to } = req.query;

  if (!from || !to) {
    return res
      .status(400)
      .json({ error: "Missing 'from' and 'to' version IDs" });
  }

  try {
    // Fetch both versions in parallel
    const [fromRes, toRes] = await Promise.all([
      fetch(`https://api.figma.com/v1/files/${fileKey}?version=${from}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch(`https://api.figma.com/v1/files/${fileKey}?version=${to}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ]);

    if (!fromRes.ok || !toRes.ok) {
      console.error("Figma API error:", fromRes.status, toRes.status);
      return res
        .status(500)
        .json({ error: "Failed to fetch file versions from Figma" });
    }

    const [fromFile, toFile] = await Promise.all([
      fromRes.json(),
      toRes.json(),
    ]);

    // Run the diff
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

// Frame image endpoint — renders a specific Figma node as a PNG.
// Usage: /api/frame-image/FILE_KEY/NODE_ID?version=VERSION_ID
app.get("/api/frame-image/:fileKey/:nodeId", async (req, res) => {
  const token = getAccessToken(req, res);
  if (!token) return;

  const { fileKey, nodeId } = req.params;
  const { version } = req.query;

  try {
    const url = `https://api.figma.com/v1/images/${fileKey}?ids=${nodeId}&format=png&scale=1${version ? `&version=${version}` : ""}`;

    const figmaRes = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!figmaRes.ok) {
      const errorText = await figmaRes.text();
      console.error("Figma image API error:", figmaRes.status, errorText);
      return res
        .status(figmaRes.status)
        .json({ error: errorText, status: figmaRes.status });
    }

    const imageData = await figmaRes.json();
    const imageUrl = imageData.images?.[nodeId] || null;

    res.json({ imageUrl, status: figmaRes.status });
  } catch (err) {
    console.error("Frame image error:", err);
    res.status(500).json({
      error: "Failed to fetch frame image",
      status: 500,
      details: err.message,
    });
  }
});

// File info endpoint - returns basic file metadata
// Usage: /api/file-info/FILE_KEY
app.get("/api/file-info/:fileKey", async (req, res) => {
  const token = getAccessToken(req, res);
  if (!token) return;

  const { fileKey } = req.params;

  try {
    const figmaRes = await fetch(
      `https://api.figma.com/v1/files/${fileKey}?depth=1`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    if (!figmaRes.ok) {
      const errorText = await figmaRes.text();
      console.error("Figma API error:", figmaRes.status, errorText);
      return res
        .status(figmaRes.status)
        .json({ error: errorText, status: figmaRes.status });
    }

    const data = await figmaRes.json();
    res.json(data);
  } catch (err) {
    console.error("File info error:", err);
    res.status(500).json({
      error: "Failed to fetch file info",
      status: 500,
      details: err.message,
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
