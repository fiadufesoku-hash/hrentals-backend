import express from "express";
import dotenv from "dotenv";
import { ApolloServer } from "apollo-server-express";
import jwt from "jsonwebtoken";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import { typeDefs } from "./graphql/schema.js";
import resolvers from "./graphql/resolvers.js";
import { handleCollectionCallback } from "./services/momoService.js";
import { upload } from "./services/uploadService.js";

dotenv.config({ path: "./src/.env" });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// CORS – allow Flutter Web from anywhere
app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);

app.use(express.json());

// Serve uploaded images when running locally
if (process.env.USE_RAILWAY !== "true") {
  app.use("/uploads", express.static(path.join(__dirname, "uploads")));
}

// ==================== FILE UPLOADS ====================
app.post("/api/upload", upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const isCloudinary = req.file.path?.startsWith("http");
  const base = process.env.BASE_URL || `http://localhost:${PORT}`;
  const url = isCloudinary ? req.file.path : `${base}/uploads/${req.file.filename}`;

  res.json({ success: true, imageUrl: url });
});

app.post("/api/upload-multiple", upload.array("images", 10), (req, res) => {
  if (!req.files?.length) return res.status(400).json({ error: "No files" });

  const base = process.env.BASE_URL || `http://localhost:${PORT}`;
  const urls = req.files.map(f => 
    f.path.startsWith("http") ? f.path : `${base}/uploads/${f.filename}`
  );

  res.json({ success: true, imageUrls: urls });
});

// ==================== OTHER ROUTES ====================
app.get("/health", (_, res) => res.send("OK"));
app.post("/momo/collection/callback", handleCollectionCallback);
app.post("/momo/disburse/callback", (req, res) => {
  console.log("Disbursement:", req.body);
  res.sendStatus(200);
});

// ==================== GRAPHQL ====================
const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => {
    const token = req.headers.authorization?.replace("Bearer ", "") || "";
    if (!token) return { user: null };

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      return { user: { id: decoded.id } };
    } catch {
      return { user: null };
    }
  },
  introspection: true,
  playground: true,
});

await server.start();
server.applyMiddleware({ app, path: "/graphql", cors: false });

// ==================== START ====================
const PORT = process.env.PORT || 4000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`GraphQL → ${process.env.BASE_URL || `http://localhost:${PORT}`}/graphql`);
});"throw new Error('RAILWAY IS NOW USING NEW CODE - VICTORY PROOF');" 
"// RAILWAY TEST: If you see this crash, I'm using new code" 
"throw new Error('RAILWAY IS NOW USING NEW CODE - VICTORY PROOF');" 
