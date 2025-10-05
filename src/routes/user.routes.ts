// src/routes/user.routes.ts
import { Router } from 'express';
import { updateUserProfile } from '../controllers/user.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import upload from '../middleware/upload.middleware.js';

const router = Router();

// PATCH /api/users/profile
// 1. authMiddleware: ตรวจสอบ Token ก่อนเสมอ
// 2. upload.single(...): จัดการไฟล์รูปภาพ (ถ้ามีส่งมา)
// 3. updateUserProfile: ทำงานเมื่อผ่าน middleware ทั้งสองแล้ว
router.patch(
  '/profile', 
  authMiddleware, 
  upload.single('profile_image'), 
  updateUserProfile
);

export default router;