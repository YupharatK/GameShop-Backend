// src/routes/game.routes.ts
import { Router } from 'express';
import { createGame } from '../controllers/game.controller.js';
import { adminMiddleware } from '../middleware/admin.middleware.js';
import upload from '../middleware/upload.middleware.js';

const router = Router();

// POST /api/games/
// 1. adminMiddleware: ตรวจสอบว่าเป็น Admin หรือไม่
// 2. upload.single('game_image'): รับไฟล์รูปภาพชื่อ 'game_image'
// 3. createGame: ทำงานเมื่อผ่าน Middleware ทั้งสองแล้ว
router.post(
  '/',
  adminMiddleware,
  upload.single('game_image'),
  createGame
);

export default router;