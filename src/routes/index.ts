// src/routes/index.ts
import { Router } from 'express';
// import gameRoutes from './game.routes';
import authRoutes from './auth.routes.js'; // <-- Import

const router = Router();

// router.use('/api', gameRoutes);
router.use('/api', authRoutes); // <-- เพิ่มเข้าไป

export default router;