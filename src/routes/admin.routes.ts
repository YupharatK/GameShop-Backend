// src/routes/admin.routes.ts
import { Router } from 'express';
import { getAllUsers, getUserTransactions } from '../controllers/admin.controller.js';
import { adminMiddleware } from '../middleware/admin.middleware.js';

const router = Router();

// Endpoint ทั้งหมดในนี้จะถูกป้องกันโดย adminMiddleware
router.use(adminMiddleware);

// GET /api/admin/users
router.get('/users', getAllUsers);

// GET /api/admin/transactions/:userId
router.get('/transactions/:userId', getUserTransactions);

export default router;