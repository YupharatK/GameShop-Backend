// src/controllers/auth.controller.ts
import type { Request, Response } from 'express';
import { authenticateUser, createUserService } from '../services/user.service.js';
import jwt from 'jsonwebtoken';

export const register = async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;
    const profileImagePath = req.file ? req.file.path : null;

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

    // ✨ สร้าง Object ที่ปลอดภัยเพื่อส่งกลับ
    const safeUser = {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        profile_image: newUser.profile_image
    };

    return res.status(201).json({ message: 'User registered successfully!', user: safeUser });

  } catch (error: any) {
    console.error('Registration Error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Username or email already exists.' });
    }
    return res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await authenticateUser(email, password);

    // ✨ ตรวจสอบ JWT Secret Key เพื่อความปลอดภัย
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        console.error('JWT_SECRET is not set in environment variables!');
        return res.status(500).json({ message: 'Internal Server Error: Server configuration is incomplete.' });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      jwtSecret,
      { expiresIn: '1h' }
    );

    const redirectTo = user.role === 'ADMIN' ? '/dashboard' : '/homepage';

    return res.status(200).json({
      message: 'Login successful!',
      token: token,
      redirectTo: redirectTo,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        // ✨ เพิ่ม profile_image เข้ามา
        profile_image: user.profile_image
      }
    });

  } catch (error: any) {
    console.error('Login Error:', error);
    if (error.message === 'Invalid credentials') {
        return res.status(401).json({ message: 'Invalid email or password.' });
    }
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};