// src/controllers/admin.controller.ts
import type { Request, Response } from 'express';
import { getAllUsersService, getUserTransactionsService, getAllTransactionsService} from '../services/admin.service.js';

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await getAllUsersService();
    return res.status(200).json(users);
  } catch (error) {
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const getUserTransactions = async (req: Request, res: Response) => {
  try {
    const { userId: userIdParam } = req.params; // ใช้ Destructuring เพื่อความชัดเจน

    // 1. ตรวจสอบว่ามี userId ส่งมาหรือไม่
    if (!userIdParam) {
      return res.status(400).json({ message: 'User ID is required.' });
    }

    // 2. เมื่อผ่านการตรวจสอบแล้ว userIdParam จะเป็น string แน่นอน
    const userId = parseInt(userIdParam, 10);

    // 3. การตรวจสอบ isNaN ของคุณยังคงทำงานได้ดี
    if (isNaN(userId)) {
      return res.status(400).json({ message: 'Invalid user ID.' });
    }

    const transactions = await getUserTransactionsService(userId);
    return res.status(200).json(transactions);
  } catch (error) {
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const getAllTransactions = async (req: Request, res: Response) => {
  try {
    const transactions = await getAllTransactionsService();
    return res.status(200).json(transactions);
  } catch (error) {
    // Log a more descriptive error on the server if possible
    console.error("Controller error fetching all transactions:", error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};