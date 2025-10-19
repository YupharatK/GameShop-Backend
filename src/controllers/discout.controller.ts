import type { Request, Response } from 'express';
import {
  getAllDiscountsService,
  createDiscountService,
  updateDiscountService,
  deleteDiscountService
} from '../services/discount.service.js';

export const getAllDiscounts = async (req: Request, res: Response) => {
  try {
    const discounts = await getAllDiscountsService();
    return res.status(200).json(discounts);
  } catch (error) {
    console.error('Error fetching discounts:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const createDiscount = async (req: Request, res: Response) => {
  try {
    const result = await createDiscountService(req.body);
    return res.status(201).json({ message: 'Discount created', result });
  } catch (error) {
    console.error('Error creating discount:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const updateDiscount = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const result = await updateDiscountService(id, req.body);
    return res.status(200).json({ message: 'Discount updated', result });
  } catch (error) {
    console.error('Error updating discount:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const deleteDiscount = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const result = await deleteDiscountService(id);
    return res.status(200).json({ message: 'Discount deleted', result });
  } catch (error) {
    console.error('Error deleting discount:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};
