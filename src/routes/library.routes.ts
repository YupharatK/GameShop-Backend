// src/routes/library.routes.ts
import { Router } from 'express';
import { getUserLibrary } from '../controllers/library.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js'; // 1. Import middleware สำหรับตรวจสอบ token

const router = Router();

// 2. กำหนด route สำหรับ GET /api/library
// ใช้ authMiddleware เพื่อให้แน่ใจว่าเฉพาะผู้ใช้ที่ login แล้วเท่านั้นที่เข้าถึงได้
router.get('/', authMiddleware, getUserLibrary);

export default router;