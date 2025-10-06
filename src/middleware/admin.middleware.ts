// src/middleware/admin.middleware.ts
import type { Request, Response, NextFunction } from 'express';
import { authMiddleware } from './auth.middleware.js';

export const adminMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // 1. เรียกใช้ authMiddleware ก่อนเพื่อตรวจสอบ Token
  authMiddleware(req, res, () => {
    // 2. ถ้า Token ถูกต้อง ให้ตรวจสอบ role ต่อ
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden: Admin access required.' });
    }
    // 3. ถ้าเป็น Admin ให้ผ่านไปทำงานขั้นต่อไป
    next();
  });
};