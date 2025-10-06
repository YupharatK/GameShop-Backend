// src/routes/ranking.routes.ts
import { Router } from 'express';
import { updateAllRanks } from '../controllers/ranking.controller.js';
import { adminMiddleware } from '../middleware/admin.middleware.js';

const router = Router();

// POST /api/rankings/update
// ใช้ adminMiddleware เพื่อให้แน่ใจว่าเฉพาะ Admin เท่านั้นที่เรียกใช้ได้
router.post('/update', adminMiddleware, updateAllRanks);

export default router;