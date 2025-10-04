// src/routes/auth.routes.ts
import { Router } from 'express';
import { register } from '../controllers/auth.controller.js';
import upload from '../middleware/upload.middleware.js';

const router = Router();

// Middleware 'upload.single('profile_image')' จะทำงานก่อนฟังก์ชัน 'register'
// 'profile_image' คือชื่อ field ของไฟล์ที่ Front-end จะต้องส่งมา
router.post('/register', upload.single('profile_image'), register);

// คุณอาจจะมี route สำหรับ login ที่นี่ด้วย
// router.post('/login', login);

export default router;