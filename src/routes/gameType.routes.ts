// src/routes/gameType.routes.ts
import { Router } from 'express';
import { getAllGameTypes } from '../controllers/gameType.controller.js';

const router = Router();

// GET /api/gametypes/
router.get('/', getAllGameTypes);

export default router;