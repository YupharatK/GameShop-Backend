// src/server.ts

// --- Core Imports ---
import express from 'express';
import type { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// --- Route Imports ---
// (อย่าลืม .js ต่อท้ายไฟล์ที่เราสร้างขึ้นเอง)
import apiRoutes from './routes/index.js';

// --- Initial Configuration ---
dotenv.config();

// ตั้งค่า __dirname สำหรับใช้งานกับ ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// --- Middlewares ---

// 1. Middleware สำหรับอ่าน JSON body จาก request
app.use(express.json());

// 2. Middleware สำหรับทำให้ไฟล์ในโฟลเดอร์ public/uploads เข้าถึงได้ผ่าน URL
// ตัวอย่าง: ไฟล์ที่ /public/uploads/profiles/image.jpg จะเข้าถึงได้ที่ http://localhost:3000/uploads/profiles/image.jpg
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));


// --- API Routes ---

// เรียกใช้ Routes ทั้งหมดที่กำหนดไว้ในโฟลเดอร์ /routes
app.use(apiRoutes);


// --- Root & Health Check Route ---

// Route พื้นฐานสำหรับทดสอบว่าเซิร์ฟเวอร์ทำงานอยู่
app.get('/', (req: Request, res: Response) => {
    res.status(200).json({ 
        status: 'OK', 
        message: 'Welcome to GameShop API' 
    });
});


// --- Server Startup ---

// เริ่มการทำงานของเซิร์ฟเวอร์
app.listen(PORT, () => {
  console.log(`✅ Server is running smoothly on http://localhost:${PORT}`);
});