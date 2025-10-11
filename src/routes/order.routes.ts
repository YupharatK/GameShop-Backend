// src/routes/order.routes.ts
import { Router } from 'express';
import { checkout } from '../controllers/order.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();
router.post('/checkout', authMiddleware, checkout);
export default router;