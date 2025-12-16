import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "@fluidjs/multer-cloudinary";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 UPLOAD SERVICE INITIALIZATION ===========');
console.log('   USE_RAILWAY:', process.env.USE_RAILWAY);
console.log('   CLOUDINARY_URL exists:', !!process.env.CLOUDINARY_URL);

// Configure Cloudinary with error handling
try {
  if (process.env.CLOUDINARY_URL) {
    console.log('   Configuring Cloudinary...');
    cloudinary.config(process.env.CLOUDINARY_URL);
    console.log('   ✅ Cloudinary configured');
    console.log('   Cloud Name:', cloudinary.config().cloud_name);
  } else {
    console.log('   ⚠️ CLOUDINARY_URL not found in environment');
  }
} catch (error) {
  console.error('   ❌ Cloudinary config failed:', error.message);
}

// LOCAL STORAGE (for development)
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

// CLOUDINARY STORAGE
let cloudStorage;
try {
  cloudStorage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: "horentals",
      allowed_formats: ["jpg", "jpeg", "png", "webp"],
    },
  });
  console.log('   ✅ CloudinaryStorage created');
} catch (error) {
  console.error('   ❌ CloudinaryStorage failed:', error.message);
  cloudStorage = localStorage; // Fallback to local
}

export const cloudUpload = multer({ 
  storage: cloudStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// CRITICAL: Log which upload is being used
const useCloudinary = process.env.USE_RAILWAY === "true";
console.log('   Using:', useCloudinary ? '☁️ Cloudinary' : '💾 Local Storage');
export const upload = useCloudinary ? cloudUpload : localUpload;