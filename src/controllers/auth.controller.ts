// src/controllers/auth.controller.ts
import type { Request, Response } from 'express';
import { authenticateUser, createUserService } from '../services/user.service.js';
import jwt from 'jsonwebtoken';

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

//Login function
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // ตรวจสอบว่าส่ง email และ password มาครบหรือไม่
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    // เรียก service เพื่อยืนยันตัวตน
    const user = await authenticateUser(email, password);

    // ถ้า authenticateUser คืนค่ามาได้ แสดงว่า login ถูกต้อง
    // สร้าง JWT Token
    const token = jwt.sign(
      { userId: user.id, role: user.role }, // Payload ที่จะเก็บใน token
      process.env.JWT_SECRET || 'your_default_secret_key', // Secret Key
      { expiresIn: '1h' } // Token หมดอายุใน 1 ชั่วโมง
    );

    // ตรวจสอบ role เพื่อกำหนดหน้าที่จะ redirect ไป
    const redirectTo = user.role === 'ADMIN' ? '/dashboard' : '/homepage';

    // ส่ง token และข้อมูล user (ยกเว้นรหัสผ่าน) กลับไป
    return res.status(200).json({
      message: 'Login successful!',
      token: token,
      redirectTo: redirectTo,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });

  } catch (error: any) {
    console.error('Login Error:', error);
    // ถ้า service โยน error มา (เช่น รหัสผ่านผิด, ไม่พบ user)
    if (error.message === 'Invalid credentials') {
        return res.status(401).json({ message: 'Invalid email or password.' });
    }
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};