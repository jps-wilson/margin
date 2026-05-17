// Minimal Express server for the Figma Diff Tool backend.
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import crypto from "crypto";

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

    // For now, just respond with confirmation (no token leaked to the response)
    res.json({
      message: "OAuth complete - access token received",
      tokenType: tokenData.token_type,
      expiresIn: tokenData.expires_in,
    });
  } catch (err) {
    console.error("Token exchange error:", err);
    res.status(500).json({ error: "Token exchange failed" });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
