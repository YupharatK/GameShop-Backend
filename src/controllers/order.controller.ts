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

    // ดึง userId จาก auth middleware (หรือ header สำรอง)
    const userId = (req as any)?.user?.id ?? Number(req.headers['x-user-id']);
    if (!Number.isFinite(userId)) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const result = await createOrderService(userId, items, discountCode);
    return res.status(200).json(result);

  } catch (err: any) {
    console.error('[checkout] error:', err);
    const msg = err?.message || 'Internal Server Error';

    // จัดกลุ่ม error ให้ชัดขึ้น
    if (
      msg === 'Cart is empty' ||
      msg === 'Insufficient funds.' ||
      msg === 'Invalid discount code.' ||
      msg === 'This discount code has reached its maximum usage.' ||
      msg === 'This user already used this discount code.'
    ) {
      return res.status(400).json({ message: msg });
    }

    // กรณี permission
    if (msg === 'Unauthorized' || msg === 'Forbidden.') {
      return res.status(msg === 'Unauthorized' ? 401 : 403).json({ message: msg });
    }

    return res.status(500).json({ message: 'Internal Server Error' });
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

    if (
      msg === 'Order not found.' ||
      msg === 'Invalid order id' ||
      msg === 'Invalid discount code.' ||
      msg === 'This discount code has reached its maximum usage.' ||
      msg === 'This user already used this discount code.'
    ) {
      return res.status(400).json({ message: msg });
    }

    if (msg === 'Unauthorized') {
      return res.status(401).json({ message: msg });
    }
    if (msg === 'Forbidden.') {
      return res.status(403).json({ message: msg });
    }

    return res.status(500).json({ message: 'Internal Server Error' });
  }
};
