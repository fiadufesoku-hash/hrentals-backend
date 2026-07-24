import express from "express";
import dotenv from "dotenv";
import { ApolloServer } from "apollo-server-express";
import jwt from "jsonwebtoken";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { v2 as cloudinary } from "cloudinary";

import { typeDefs } from "./graphql/schema.js";
import resolvers from "./graphql/resolvers.js";
import { handleCollectionCallback } from "./services/momoService.js";
import { upload } from "./services/uploadService.js";

dotenv.config({ path: "./src/.env" });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 4000;
const app = express();

// ==================== CLOUDINARY DEBUG INIT ====================
console.log('\n🔧 CLOUDINARY CONFIGURATION DEBUG ===========');
console.log('USE_RAILWAY:', process.env.USE_RAILWAY);
console.log('CLOUDINARY_URL exists:', !!process.env.CLOUDINARY_URL);

// Initialize Cloudinary for testing
try {
  if (process.env.CLOUDINARY_URL) {
    cloudinary.config(process.env.CLOUDINARY_URL);
    console.log('✅ Cloudinary configured successfully');
    console.log('Cloud Name:', cloudinary.config().cloud_name);
    console.log('API Key:', '***' + (cloudinary.config().api_key?.slice(-4) || ''));
  } else {
    console.log('❌ CLOUDINARY_URL not found in environment');
  }
} catch (error) {
  console.error('❌ Cloudinary config failed:', error.message);
}

// ==================== SERVER SETUP ====================
// CORS – allow Web client requests
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json());

// Serve uploaded images when running locally
if (process.env.USE_RAILWAY !== "true") {
  const uploadsDir = path.join(__dirname, "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use("/uploads", express.static(uploadsDir));
}

// ==================== DEBUG & TEST ROUTES ====================
// 1. Test Cloudinary Connection
app.get("/api/debug-cloudinary", async (req, res) => {
  try {
    console.log('\n🔍 CLOUDINARY CONNECTION TEST ===========');
    
    const config = cloudinary.config();
    console.log('Config check:', {
      cloud_name: config.cloud_name,
      api_key: config.api_key ? '***' + config.api_key.slice(-4) : 'missing',
      secure: config.secure
    });
    
    // Test by listing resources
    const result = await cloudinary.api.resources({
      type: 'upload',
      max_results: 5,
      prefix: 'horentals'
    });
    
    console.log('✅ Cloudinary test successful');
    console.log('Resources found:', result.resources?.length || 0);
    
    res.json({
      success: true,
      message: 'Cloudinary is connected!',
      cloud_name: config.cloud_name,
      resources_count: result.resources?.length || 0,
      resources: result.resources?.map(r => ({
        public_id: r.public_id,
        url: r.secure_url,
        format: r.format
      })) || [],
      config: {
        cloud_name: config.cloud_name,
        api_key: config.api_key ? '***' + config.api_key.slice(-4) : null,
        secure: config.secure
      }
    });
    
  } catch (error) {
    console.error('❌ Cloudinary test failed:', error.message);
    console.error('Stack:', error.stack);
    
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      message: 'Cloudinary connection failed. Check CLOUDINARY_URL in .env'
    });
  }
});

// 2. Test File Upload Configuration
app.get("/api/debug-upload-config", (req, res) => {
  console.log('\n🔍 UPLOAD CONFIGURATION ===========');
  
  const config = {
    USE_RAILWAY: process.env.USE_RAILWAY,
    CLOUDINARY_URL: process.env.CLOUDINARY_URL ? 
      process.env.CLOUDINARY_URL.substring(0, 50) + '...' : 'Not set',
    BASE_URL: process.env.BASE_URL || `http://localhost:${PORT}`,
    PORT: PORT,
    NODE_ENV: process.env.NODE_ENV || 'development'
  };
  
  console.log('Config:', config);
  
  res.json({
    success: true,
    config: config,
    message: process.env.USE_RAILWAY === "true" ? 
      "Using Cloudinary for uploads" : "Using local storage for uploads"
  });
});

// 3. Test Upload with Sample Image
app.get("/api/test-upload", async (req, res) => {
  try {
    console.log('\n🔍 TEST UPLOAD TO CLOUDINARY ===========');
    
    // Upload a test image to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(
      'https://res.cloudinary.com/demo/image/upload/sample.jpg',
      {
        folder: 'horentals-test',
        public_id: `test-${Date.now()}`,
        overwrite: true
      }
    );
    
    console.log('✅ Test upload successful');
    console.log('URL:', uploadResult.secure_url);
    console.log('Public ID:', uploadResult.public_id);
    
    res.json({
      success: true,
      message: 'Test upload successful',
      uploaded_image: {
        url: uploadResult.secure_url,
        public_id: uploadResult.public_id,
        format: uploadResult.format,
        bytes: uploadResult.bytes
      }
    });
    
  } catch (error) {
    console.error('❌ Test upload failed:', error.message);
    
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Test upload to Cloudinary failed'
    });
  }
});

// ==================== FILE UPLOADS (WITH DEBUGGING) ====================
app.post("/api/upload", upload.single("image"), (req, res) => {
  console.log('\n📤 SINGLE FILE UPLOAD ===========');
  console.log('File received:', req.file?.originalname);
  console.log('File size:', req.file?.size, 'bytes');
  console.log('File path:', req.file?.path);
  console.log('Is Cloudinary URL?', req.file?.path?.startsWith('http'));
  
  if (!req.file) {
    console.log('❌ No file uploaded');
    return res.status(400).json({ error: "No file uploaded" });
  }

  const isCloudinary = req.file.path?.startsWith("http");
  const base = process.env.BASE_URL || `http://localhost:${PORT}`;
  const url = isCloudinary ? req.file.path : `${base}/uploads/${req.file.filename}`;
  
  console.log('✅ Upload successful');
  console.log('Final URL:', url);
  
  res.json({ 
    success: true, 
    imageUrl: url,
    isCloudinary: isCloudinary,
    debug: {
      originalName: req.file.originalname,
      size: req.file.size,
      path: req.file.path
    }
  });
});

app.post("/api/upload-multiple", upload.array("images", 10), (req, res) => {
  console.log('\n📤 MULTIPLE FILE UPLOAD ===========');
  console.log('Files received:', req.files?.length || 0);
  console.log('USE_RAILWAY:', process.env.USE_RAILWAY);
  console.log('Upload type:', process.env.USE_RAILWAY === "true" ? "Cloudinary" : "Local Storage");
  
  if (!req.files?.length) {
    console.log('❌ No files uploaded');
    return res.status(400).json({ error: "No files" });
  }

  const base = process.env.BASE_URL || `http://localhost:${PORT}`;
  const urls = req.files.map(f => {
    console.log(`   File: ${f.originalname}`);
    console.log(`     Size: ${f.size} bytes`);
    console.log(`     Path: ${f.path}`);
    console.log(`     Is Cloudinary: ${f.path?.startsWith('http')}`);
    console.log(`     Contains cloudinary.com: ${f.path?.includes('cloudinary.com')}`);
    
    const url = f.path.startsWith("http") ? f.path : `${base}/uploads/${f.filename}`;
    console.log(`     Final URL: ${url}`);
    return {
      url: url,
      isCloudinary: f.path?.startsWith('http'),
      originalName: f.originalname
    };
  });

  console.log('✅ Upload successful');
  console.log('Total URLs:', urls.length);
  
  // Return both array of URLs and object with debug info
  res.json({ 
    success: true, 
    imageUrls: urls.map(u => u.url),
    debug: {
      totalFiles: urls.length,
      cloudinaryCount: urls.filter(u => u.isCloudinary).length,
      localCount: urls.filter(u => !u.isCloudinary).length,
      files: urls
    }
  });
});

// ==================== HEALTH CHECK WITH CLOUDINARY STATUS ====================
app.get("/health", async (req, res) => {
  try {
    // Test Cloudinary connection
    const cloudinaryStatus = process.env.CLOUDINARY_URL ? 
      await cloudinary.api.ping().then(() => 'connected').catch(() => 'failed') : 
      'not configured';
    
    res.json({
      status: "OK",
      timestamp: new Date().toISOString(),
      cloudinary: cloudinaryStatus,
      upload_service: process.env.USE_RAILWAY === "true" ? "cloudinary" : "local",
      port: PORT
    });
  } catch (error) {
    res.status(500).json({
      status: "ERROR",
      error: error.message
    });
  }
});

// ==================== OTHER ROUTES ====================
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
  // Add GraphQL request logging
  formatError: (error) => {
    console.error('GraphQL Error:', error);
    return error;
  },
  plugins: [{
    requestDidStart: async (requestContext) => {
      console.log('\n🔍 GraphQL Request ===========');
      console.log('Operation:', requestContext.request.operationName);
      console.log('Query:', requestContext.request.query?.substring(0, 100) + '...');
      
      return {
        willSendResponse: async (requestContext) => {
          console.log('✅ GraphQL Response sent');
        }
      };
    }
  }],
});

await server.start();
server.applyMiddleware({ app, path: "/graphql", cors: false });

// ==================== SERVER START ====================
// Vercel serverless environment doesn't require app.listen()
if (!process.env.VERCEL) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log('\n🚀 SERVER STARTED ===========');
    console.log(`Port: ${PORT}`);
    console.log(`GraphQL: ${process.env.BASE_URL || `http://localhost:${PORT}`}/graphql`);
    console.log(`Health: ${process.env.BASE_URL || `http://localhost:${PORT}`}/health`);
    console.log(`Cloudinary Test: ${process.env.BASE_URL || `http://localhost:${PORT}`}/api/debug-cloudinary`);
    console.log(`Upload Config: ${process.env.BASE_URL || `http://localhost:${PORT}`}/api/debug-upload-config`);
    console.log(`Test Upload: ${process.env.BASE_URL || `http://localhost:${PORT}`}/api/test-upload`);
    console.log(`USE_RAILWAY: ${process.env.USE_RAILWAY}`);
    console.log(`Upload Service: ${process.env.USE_RAILWAY === "true" ? "☁️ Cloudinary" : "💾 Local Storage"}`);
    console.log('======================================\n');
  });
}

export default app;