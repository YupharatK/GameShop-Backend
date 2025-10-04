// src/controllers/auth.controller.ts
import type { Request, Response } from 'express';
import { UserService } from '../services/user.service.js';
import bcrypt from 'bcrypt';

export const AuthController = {
  register: async (req: Request, res: Response): Promise<void> => {
    try {
      const { username, email, password } = req.body;

      // -- Validation --
      if (!username || !email || !password) {
        res.status(400).json({ message: 'Please provide all required fields.' });
        return;
      }

      if (!req.file) {
        res.status(400).json({ message: 'Profile image is required.' });
        return;
      }

      // ตรวจสอบว่ามีอีเมลนี้ในระบบแล้วหรือยัง
      const existingUser = await UserService.findByEmail(email);
      if (existingUser) {
        res.status(409).json({ message: 'Email already in use.' }); // 409 Conflict
        return;
      }

      // -- Process --
      // 1. เข้ารหัสรหัสผ่าน
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // 2. สร้าง URL สำหรับรูปภาพที่อัปโหลด
      const profileImageUrl = `/uploads/profiles/${req.file.filename}`;

      // 3. บันทึกข้อมูลลงฐานข้อมูล
      const newUserId = await UserService.register({
        username,
        email,
        password_hash: hashedPassword,
        profile_image_url: profileImageUrl,
      });

      res.status(201).json({ message: 'User registered successfully!', userId: newUserId });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error during registration.' });
    }
  }
};