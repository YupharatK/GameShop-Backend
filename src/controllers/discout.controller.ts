import type { Request, Response } from 'express';
import {
  getAllDiscountsService,
  getActiveDiscountsService,
  createDiscountService,
  updateDiscountService,
  deleteDiscountService
} from '../services/discount.service.js';

export const getAllDiscounts = async (_req: Request, res: Response) => {
  try {
    const rows = await getAllDiscountsService();
    return res.status(200).json(rows);
  } catch (e) {
    console.error('[discounts] getAll error:', e);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const getActiveDiscounts = async (_req: Request, res: Response) => {
  try {
    const rows = await getActiveDiscountsService();
    return res.status(200).json(rows);
  } catch (e) {
    console.error('[discounts] getActive error:', e);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const createDiscount = async (req: Request, res: Response) => {
  try {
    const { code, discount_percent, max_usage } = req.body ?? {};
    await createDiscountService({ code, discount_percent, max_usage });
    return res.status(201).json({ message: 'Created' });
  } catch (e) {
    console.error('[discounts] create error:', e);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const updateDiscount = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { code, discount_percent, max_usage, used_count } = req.body ?? {};
    await updateDiscountService(id, { code, discount_percent, max_usage, used_count });
    return res.status(200).json({ message: 'Updated' });
  } catch (e) {
    console.error('[discounts] update error:', e);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const deleteDiscount = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    await deleteDiscountService(id);
    return res.status(200).json({ message: 'Deleted' });
  } catch (e) {
    console.error('[discounts] delete error:', e);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};
