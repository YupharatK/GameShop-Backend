// src/controllers/order.controller.ts
import type { Request, Response } from 'express';
import { createOrderService } from '../services/order.service.js';

export const checkout = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { items } = req.body;

    if (!userId) return res.status(401).json({ message: "Unauthorized." });
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Cart items are required." });
    }
    
    const result = await createOrderService(userId, items);
    return res.status(201).json({ message: 'Purchase successful!', ...result });

  } catch (error: any) {
    if (error.message === 'Insufficient funds.') {
      return res.status(402).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};