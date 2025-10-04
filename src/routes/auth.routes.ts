// src/routes/auth.routes.ts
import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import upload from '../middleware/upload.middleware.js'; // Import middleware ของเรา

const router = Router();

// เมื่อมี request มาที่ path นี้
// 1. multer จะทำงานก่อน (upload.single) เพื่อจัดการไฟล์ที่ชื่อ 'profileImage'
// 2. ถ้าไฟล์ผ่าน middleware, Express จะเรียก AuthController.register ต่อไป
router.post('/auth/register', upload.single('profileImage'), AuthController.register);

export default router;