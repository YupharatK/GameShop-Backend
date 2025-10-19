// src/controllers/order.controller.ts
import type { Request, Response } from 'express';
import {
  createOrderService,
  applyDiscountToExistingOrderService,
} from '../services/order.service.js';

// POST /api/orders/checkout
export const checkout = async (req: Request, res: Response) => {
  try {
    const { items, discountCode } = req.body ?? {};
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Cart is empty' });
    }

    const userId = (req as any)?.user?.id ?? Number(req.headers['x-user-id']);
    if (!Number.isFinite(userId)) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const result = await createOrderService(userId, items, discountCode);
    return res.status(200).json(result);
  } catch (err: any) {
    console.error('[checkout] error:', err);
    const msg = err?.message || 'Internal Server Error';
    const status =
      msg === 'Insufficient funds.' ||
      msg.startsWith('Invalid discount') ||
      msg.includes('Cart is empty')
        ? 400
        : 500;
    return res.status(status).json({ message: msg });
  }
};

// PATCH /api/orders/:id/discount
export const applyDiscountToOrderController = async (req: Request, res: Response) => {
  try {
    const orderId = Number(req.params.id);
    const { discountCode } = req.body ?? {};

    if (!Number.isFinite(orderId)) {
      return res.status(400).json({ message: 'Invalid order id' });
    }
    if (!discountCode || typeof discountCode !== 'string') {
      return res.status(400).json({ message: 'discountCode is required' });
    }

    const userId = (req as any)?.user?.id ?? Number(req.headers['x-user-id']);
    if (!Number.isFinite(userId)) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const result = await applyDiscountToExistingOrderService(orderId, discountCode, userId);
    return res.status(200).json(result);
  } catch (err: any) {
    console.error('[applyDiscountToOrderController] error:', err);
    const msg = err?.message || 'Internal Server Error';
    const status =
      msg === 'Order not found.' ||
      msg === 'Forbidden.' ||
      msg.startsWith('Invalid discount') ||
      msg.includes('maximum usage')
        ? 400
        : 500;
    return res.status(status).json({ message: msg });
  }
};
