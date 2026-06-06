// Minimal Express server for the Figma Diff Tool backend.
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import crypto from "crypto";
import { diff } from "./diff.js";

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Allow the front-end to call this API during dev
app.use(express.json()); // Parse incoming JSON request bodies

// Health check route - confirms the server is running
app.get("/", (req, res) => {
  res.json({ message: "Figma Diff Tool API is running" });
});

// In-memory store for OAuth state values (temporary)
const oauthStates = new Set();
// Temporary token storage - holds the most recent access token for testing
// Will replace this with real session management later
let currentAccessToken = null;

// Start the OAuth flow - redirects the user to Figma's authorization page
app.get("/auth/figma", (req, res) => {
  // Generate a random state value to prevent CSRF attacks
  const state = crypto.randomBytes(16).toString("hex");
  oauthStates.add(state);

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

  // Redirect the user to Figma
  res.redirect(authUrl.toString());
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
  if (!state || !oauthStates.has(state)) {
    console.error("Invalid or missing state parameter");
    return res.status(400).json({ error: "Invalid state parameter" });
  }

  // State is valid - remove it from the set so it can't be reused
  oauthStates.delete(state);

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
    currentAccessToken = tokenData.access_token;

    // Redirect back to the React client
    res.redirect(`${process.env.CLIENT_URL}/paste`);
  } catch (err) {
    console.error("Token exchange error:", err);
    res.status(500).json({ error: "Token exchange failed" });
  }
});

// Test endpoint — fetches a Figma file's version history.
// Usage: /api/test-versions/YOUR_FILE_KEY
app.get("/api/test-versions/:fileKey", async (req, res) => {
  if (!currentAccessToken) {
    return res.status(401).json({
      error:
        "No access token available. Visit /auth/figma to authenticate first.",
    });
  }

  const { fileKey } = req.params;

  try {
    const figmaResponse = await fetch(
      `https://api.figma.com/v1/files/${fileKey}/versions`,
      {
        headers: {
          Authorization: `Bearer ${currentAccessToken}`,
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
  if (!currentAccessToken) {
    return res.status(401).json({
      error:
        "No access token available. Visit /auth/figma to authenticate first.",
    });
  }

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
        headers: { Authorization: `Bearer ${currentAccessToken}` },
      }),
      fetch(`https://api.figma.com/v1/files/${fileKey}?version=${to}`, {
        headers: { Authorization: `Bearer ${currentAccessToken}` },
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
  if (!currentAccessToken) {
    return res.status(401).json({ error: "No access token available." });
  }

  const { fileKey, nodeId } = req.params;
  const { version } = req.query;

  try {
    const url = `https://api.figma.com/v1/images/${fileKey}?ids=${nodeId}&format=png&scale=1${version ? `&version=${version}` : ""}`;

    const figmaRes = await fetch(url, {
      headers: { Authorization: `Bearer ${currentAccessToken}` },
    });

    if (!figmaRes.ok) {
      const errorText = await figmaRes.text();
      console.error("Figma image API error:", figmaRes.status, errorText);
      return res.status(500).json({ error: "Failed to fetch frame image" });
    }

    const data = await figmaRes.json();
    const imageUrl = data.images?.[nodeId] || null;

    res.json({ imageUrl });
  } catch (err) {
    console.error("Frame image error:", err);
    res.status(500).json({ error: "Failed to fetch frame image" });
  }
});

// File info endpoint - returns basic file metadata
// Usage: /api/file-info/FILE_KEY
app.get("/api/file-info/:fileKey", async (req, res) => {
  if (!currentAccessToken) {
    return res.status(401).json({ error: "No access token available." });
  }

  const { fileKey } = req.params;

  try {
    const figmaRes = await fetch(
      `https://api.figma.com/v1/files/${fileKey}?depth=1`,
      {
        headers: { Authorization: `Bearer ${currentAccessToken}` },
      },
    );

    if (!figmaRes.ok) {
      return res.status(500).json({ error: "Failed to fetch file info" });
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
