// src/controllers/auth.controller.ts
import type { Request, Response } from 'express';
import { authenticateUser, createUserService } from '../services/user.service.js';
import jwt from 'jsonwebtoken';

export const register = async (req: Request, res: Response) => {
  // Log เมื่อฟังก์ชันเริ่มทำงาน
  console.log('[Auth Controller] Register function triggered.');
  try {
    const { username, email, password } = req.body;
    const profileImagePath = req.file ? req.file.path : null;

    // Log ข้อมูลที่ได้รับจาก request
    console.log('[Auth Controller] Register Body:', req.body);
    console.log('[Auth Controller] Register File:', req.file);

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Username, email, and password are required.' });
    }
    if (!profileImagePath) {
      return res.status(400).json({ message: 'Profile image is required.' });
    }

    const newUser = await createUserService({ 
      username, 
      email, 
      password, 
      profileImage: profileImagePath 
    });

    // Log ข้อมูลผู้ใช้ใหม่ที่ได้จาก service
    console.log('[Auth Controller] User created successfully in service:', newUser);

    const safeUser = {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        profile_image: newUser.profile_image
    };
    
    // Log ก่อนส่ง response กลับไป
    console.log('[Auth Controller] Sending successful registration response.');
    return res.status(201).json({ message: 'User registered successfully!', user: safeUser });

  } catch (error: any) {
    // Log error ที่เกิดขึ้น
    console.error('[Auth Controller] Registration Error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Username or email already exists.' });
    }
    return res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};

export const login = async (req: Request, res: Response) => {
  // Log เมื่อฟังก์ชันเริ่มทำงาน
  console.log('[Auth Controller] Login function triggered.');
  try {
    const { email, password } = req.body;
    
    // Log ข้อมูลที่ได้รับจาก request
    console.log('[Auth Controller] Login Body:', req.body);

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await authenticateUser(email, password);

    // Log ข้อมูล user ที่ยืนยันตัวตนสำเร็จ
    console.log('[Auth Controller] User authenticated successfully:', user);

    const jwtSecret = process.env.JWT_SECRET;

    // Log เพื่อตรวจสอบว่า JWT_SECRET ถูกโหลดมาถูกต้องหรือไม่ (สำคัญมาก)
    console.log('[Auth Controller] JWT_SECRET from environment:', jwtSecret ? 'Loaded' : 'NOT FOUND!');

    if (!jwtSecret) {
        console.error('JWT_SECRET is not set in environment variables!');
        return res.status(500).json({ message: 'Internal Server Error: Server configuration is incomplete.' });
    }

    // Log ข้อมูลที่จะใส่ใน Token
    const payload = { id: user.id, role: user.role };
    console.log('[Auth Controller] Creating token with payload:', payload);

    const token = jwt.sign(
      payload,
      jwtSecret,
      { expiresIn: '1h' }
    );

    // Log token ที่สร้างเสร็จแล้ว (เพื่อตรวจสอบ)
    console.log('[Auth Controller] Token created successfully.');

    const redirectTo = user.role === 'ADMIN' ? '/admin/dashboard' : '/homepage';

    // Log ก่อนส่ง response กลับไป
    console.log('[Auth Controller] Sending successful login response.');
    return res.status(200).json({
      message: 'Login successful!',
      token: token,
      redirectTo: redirectTo,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        profile_image: user.profile_image
      }
    });

  } catch (error: any) {
    // Log error ที่เกิดขึ้น
    console.error('[Auth Controller] Login Error:', error);
    if (error.message === 'Invalid credentials') {
        return res.status(401).json({ message: 'Invalid email or password.' });
    }
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};