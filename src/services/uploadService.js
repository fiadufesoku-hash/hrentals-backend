import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import pkg from "multer-storage-cloudinary";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const { CloudinaryStorage } = pkg;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Cloudinary storage
const cloudStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "horentals",
    allowed_formats: ["jpg", "jpeg", "png"],
  },
});

export const cloudUpload = multer({ storage: cloudStorage });

// Local storage (for development)
const localStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = path.join(process.cwd(), "uploads");
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => cb(null, `${Date.now()}_${file.originalname}`),
});

export const localUpload = multer({ storage: localStorage });

// Choose dynamically based on USE_RAILWAY
export const upload = process.env.USE_RAILWAY === "true" ? cloudUpload : localUpload;
