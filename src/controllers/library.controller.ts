// src/controllers/library.controller.ts
import type { Request, Response } from 'express';
// 1. Import service function ที่เราสร้างไว้ (ปรับ path ให้ถูกต้อง)
import { getOwnedGameIdsByUserIdService } from '../services/user.service.js'; 

export const getUserLibrary = async (req: Request, res: Response) => {
  try {
    // 2. ดึง user id จาก middleware ที่ถอดรหัส token (req.user)
    // TypeScript อาจไม่รู้จัก req.user เราจึงต้อง cast type เป็น any
    const userId = (req as any).user.id; 

    // 3. ตรวจสอบว่ามี userId หรือไม่ (ป้องกันกรณี middleware ผิดพลาด)
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    // 4. เรียกใช้ Service เพื่อดึงข้อมูล game IDs
    const gameIds = await getOwnedGameIdsByUserIdService(userId);

    // 5. ส่งข้อมูลกลับไปให้ Frontend
    return res.status(200).json(gameIds);
    
  } catch (error) {
    console.error("Get User Library Error:", error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};