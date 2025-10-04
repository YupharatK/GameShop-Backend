// src/controllers/auth.controller.ts
import type { Request, Response } from 'express';
import { createUserService } from '../services/user.service.js';

export const register = async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;
    
    // req.file จะถูกสร้างขึ้นโดย multer middleware
    // เราจะเก็บ path ของไฟล์ที่ถูกบันทึกไว้
    const profileImagePath = req.file ? req.file.path : null;

    // ตรวจสอบข้อมูลเบื้องต้น
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Username, email, and password are required.' });
    }
    
    // ถ้าบังคับให้อัปโหลดรูป
    if (!profileImagePath) {
      return res.status(400).json({ message: 'Profile image is required.' });
    }

    // ส่ง path ของรูปภาพไปให้ service ด้วย
    const newUser = await createUserService({ 
      username, 
      email, 
      password, 
      profileImage: profileImagePath 
    });

    // ส่ง Response กลับไปหา Front-end
    return res.status(201).json({ message: 'User registered successfully!', user: newUser });

  } catch (error: any) {
    // จัดการ Error (เช่น username หรือ email ซ้ำ)
    console.error('Registration Error:', error);
    // คุณอาจจะเพิ่ม Logic ตรวจสอบ error code จาก database ที่นี่
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Username or email already exists.' });
    }
    return res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};