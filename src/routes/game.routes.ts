// src/routes/game.routes.ts
import { Router } from 'express';
import { createGame, getAllGames, updateGame, deleteGame, getUserGames,searchGames } from '../controllers/game.controller.js';
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

// GET /api/games/ -> ดึงเกมทั้งหมด
router.get('/', getAllGames);

// GET /api/games/search?q=term -> ค้นหาเกม
router.get('/search', searchGames);

// PATCH /api/games/:id -> อัปเดตเกม
router.patch('/:id', adminMiddleware, upload.single('game_image'), updateGame);

// DELETE /api/games/:id -> ลบเกม
router.delete('/:id', adminMiddleware, deleteGame);

router.get('/users/:userId', getUserGames);

export default router;