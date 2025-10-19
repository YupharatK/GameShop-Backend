// src/routes/order.routes.ts
import { Router } from 'express';
import { applyDiscountToOrderController, checkout } from '../controllers/order.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/checkout', authMiddleware, checkout);
router.patch('/:id/discount', authMiddleware, applyDiscountToOrderController);

export default router;
