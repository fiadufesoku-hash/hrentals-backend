import express from "express";
import dotenv from "dotenv";
import { ApolloServer } from "apollo-server-express";
import jwt from "jsonwebtoken";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

import { typeDefs } from "./graphql/schema.js";
import resolvers from "./graphql/resolvers.js";
import { JWT_SECRET, PORT } from "./config/env.js";
import { handleCollectionCallback } from "./services/momoService.js";
import { upload } from "./services/uploadService.js"; // ✅ our dynamic upload

dotenv.config();

// ---------------- DATABASE ----------------
process.env.DATABASE_URL =
  process.env.USE_RAILWAY === "true"
    ? process.env.DATABASE_URL_RAILWAY
    : process.env.DATABASE_URL;

console.log(
  "Using database:",
  process.env.DATABASE_URL.includes("railway") ? "Railway" : "Local XAMPP"
);

// ---------------- APP SETUP ----------------
const app = express();

// CORS
app.use(
  cors({
    origin: "*",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

// Serve local uploads if using local storage
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ---------------- FILE UPLOAD ROUTES ----------------
// Single file
app.post("/api/upload", upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  // Cloudinary: req.file.path, Local: /uploads/filename
  const imageUrl = req.file.path || `/uploads/${req.file.filename}`;
  res.json({ success: true, imageUrl, filename: req.file.filename });
});

// Multiple files
app.post("/api/upload-multiple", upload.array("images", 10), (req, res) => {
  if (!req.files || req.files.length === 0)
    return res.status(400).json({ error: "No files uploaded" });

  const imageUrls = req.files.map((f) => f.path || `/uploads/${f.filename}`);
  res.json({ success: true, imageUrls, count: req.files.length });
});

// ---------------- OTHER ROUTES ----------------
app.get("/health", (req, res) => res.send("OK"));
app.post("/momo/collection/callback", handleCollectionCallback);
app.post("/momo/disburse/callback", (req, res) =>
  console.log("Disbursement callback received:", req.body)
);

// ---------------- GRAPHQL ----------------
const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => {
    const token = req.headers.authorization?.replace("Bearer ", "") || "";
    if (!token) return {};
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      return { user: { id: decoded.id } };
    } catch {
      return {};
    }
  },
  introspection: true,
  playground: true,
});

await server.start();
server.applyMiddleware({ app, path: "/graphql", cors: false });

// ---------------- START SERVER ----------------
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server ready at http://localhost:${PORT}`);
  console.log(`🚀 GraphQL ready at http://localhost:${PORT}/graphql`);
  console.log(`📁 File uploads at http://localhost:${PORT}/api/upload`);
});
