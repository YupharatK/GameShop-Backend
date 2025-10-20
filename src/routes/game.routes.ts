// src/routes/game.routes.ts
import { Router } from 'express';
import {
  createGame,
  getAllGames,
  updateGame,
  deleteGame,
  getUserGames,
  searchGames,
  getGameById,
  getTopSellers
} from '../controllers/game.controller.js';
import { adminMiddleware } from '../middleware/admin.middleware.js';
import upload from '../middleware/upload.middleware.js';

const router = Router();

// สร้างเกม (admin)
router.post('/', adminMiddleware, upload.single('game_image'), createGame);

// ดึงทั้งหมด
router.get('/', getAllGames);

// ค้นหา
router.get('/search', searchGames);

// ✅ เส้นทาง “เฉพาะ” ต้องมาอยู่เหนือ `/:id`
router.get('/users/:userId', getUserGames);
router.get('/top-sellers', getTopSellers);

// อัปเดต/ลบ (admin)
router.patch('/:id', adminMiddleware, upload.single('game_image'), updateGame);
router.delete('/:id', adminMiddleware, deleteGame);

// ✅ วางสุดท้าย: ดึงตาม id
router.get('/:id', getGameById);

export default router;
