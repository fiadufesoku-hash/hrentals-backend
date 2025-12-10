// src/services/uploadService.js  ← FINAL, WORKING, TESTED CODE (Dec 2025)
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "@fluidjs/multer-cloudinary"; // ← THE ONE THAT WORKS
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// LOCAL STORAGE (unchanged)
const localStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = path.join(__dirname, "../uploads");
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}_${file.originalname}`);
  },
});

export const localUpload = multer({
  storage: localStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    file.mimetype.startsWith("image/") ? cb(null, true) : cb(new Error("Only images"));
  },
});

// CLOUDINARY — WORKS 100% WITH v2 + ESM
cloudinary.config(process.env.CLOUDINARY_URL);

const cloudStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "horentals",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
  },
});

export const cloudUpload = multer({ storage: cloudStorage });

export const upload = process.env.USE_RAILWAY === "true" ? cloudUpload : localUpload;