// Minimal Express server for the Figma Diff Tool backend.

import express from "express";
import cors from "cors";
import dotenv from "dotenv";

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

// Start the server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
