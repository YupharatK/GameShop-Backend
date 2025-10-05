// src/controllers/user.controller.ts
import type { Request, Response } from 'express';
import { updateUserService } from '../services/user.service.js';

export const updateUserProfile = async (req: Request, res: Response) => {
  try {
    // 1. ดึง userId จาก middleware (req.user ที่เราแนบเข้าไป)
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized access.' });
    }

    // 2. ดึงข้อมูลที่ต้องการอัปเดตจาก body และ file
    const { username, email } = req.body;
    const profileImagePath = req.file ? req.file.path : undefined;

    // 3. เรียกใช้ service เพื่ออัปเดตข้อมูล
    const updateData = {
      username,
      email,
      ...(profileImagePath && { profile_image_url: profileImagePath })
    };
    const updatedUser = await updateUserService(userId, updateData);

    return res.status(200).json({ message: 'Profile updated successfully!', user: updatedUser });

  } catch (error: any) {
    console.error('Update Profile Error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Username or email already in use.' });
    }
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};