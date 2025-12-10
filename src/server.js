// services/uploadService.js
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import { createRequire } from 'node:module'; // Add this

const require = createRequire(import.meta.url); // Add this
const pkg = require('multer-storage-cloudinary'); // Change to require
const { CloudinaryStorage } = pkg; // Destructure from pkg

dotenv.config();

// ---------------- LOCAL STORAGE ----------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const localStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = path.join(__dirname, "../uploads");
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}_${file.originalname}`;
    cb(null, uniqueName);
  },
});

export const localUpload = multer({
  storage: localStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed!"), false);
  },
});

// ---------------- CLOUDINARY STORAGE ----------------
cloudinary.config(process.env.CLOUDINARY_URL);

const cloudStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "horentals",
    allowed_formats: ["jpg", "jpeg", "png"],
  },
});

export const cloudUpload = multer({ storage: cloudStorage });

// ---------------- DYNAMIC UPLOAD ----------------
export const upload = process.env.USE_RAILWAY === "true" ? cloudUpload : localUpload;