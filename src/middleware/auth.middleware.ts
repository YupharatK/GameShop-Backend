// src/middleware/auth.middleware.ts
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        role: string;
      };
    }
  }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  console.log('[AuthMiddleware] Middleware is running for URL:', req.originalUrl);
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication token is required.' });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Token is malformed.' });
    }

    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      console.error('[AuthMiddleware] CRITICAL ERROR: JWT_SECRET is not set!');
      return res.status(500).json({ message: 'Server configuration error.' });
    }
    
    const decoded = jwt.verify(token, jwtSecret);
    
    if (typeof decoded === 'object' && decoded !== null && 'id' in decoded && 'role' in decoded) {
      console.log('[AuthMiddleware] Token verified successfully! Decoded Data:', decoded);
      
      // ========== START: ส่วนที่แก้ไข Error ==========
      // แปลงประเภทข้อมูลให้ถูกต้องและปลอดภัยก่อนกำหนดค่า
      req.user = {
        id: Number(decoded.id), // ใช้ Number() เพื่อให้แน่ใจว่าเป็น number
        role: String(decoded.role) // ใช้ String() เพื่อให้แน่ใจว่าเป็น string
      };
      // ========== END: ส่วนที่แก้ไข Error ==========
      
      next();
    } else {
      throw new Error('Invalid token payload structure');
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error('[AuthMiddleware] TOKEN VERIFICATION FAILED!', error.name, error.message);
    } else {
      console.error('[AuthMiddleware] An unexpected error occurred:', error);
    }
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
};