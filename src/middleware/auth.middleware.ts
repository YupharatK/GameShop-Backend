// src/middleware/auth.middleware.ts
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// ... (Type Declaration for Express.Request)
declare global {
  namespace Express {
    interface Request {
      user?: { // '?' หมายถึงเป็น property ที่อาจจะไม่มีก็ได้ (optional)
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
      console.error('[AuthMiddleware] Failed: No token or invalid format.');
      return res.status(401).json({ message: 'Authentication token is required and must be in Bearer format.' });
    }

    const token = authHeader.split(' ')[1];

    // ========== START: ส่วนที่แก้ไข Error ==========
    // เพิ่มเงื่อนไขนี้เพื่อตรวจสอบว่ามี Token อยู่จริงหรือไม่หลังจาก split
    // การตรวจสอบนี้จะทำให้ TypeScript รู้ว่าหลังจากนี้ 'token' เป็น string แน่นอน
    if (!token) {
      console.error('[AuthMiddleware] Failed: Token is malformed or missing after "Bearer " prefix.');
      return res.status(401).json({ message: 'Token is malformed or missing.' });
    }
    // ========== END: ส่วนที่แก้ไข Error ==========

    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      console.error('[AuthMiddleware] CRITICAL ERROR: JWT_SECRET is not set on the server!');
      return res.status(500).json({ message: 'Server configuration error.' });
    }
    
    console.log('[AuthMiddleware] Attempting to verify token...');
    
    // ณ จุดนี้ Error จะหายไปแล้ว เพราะ 'token' ถูกรับประกันแล้วว่าเป็น string
    const decoded = jwt.verify(token, jwtSecret);
    
    if (typeof decoded === 'object' && decoded !== null && 'id' in decoded && 'role' in decoded) {
      console.log('[AuthMiddleware] Token verified successfully! Decoded Data:', decoded);
      
      req.user = {
        id: decoded.id,
        role: decoded.role
      };
      
      next();
    } else {
      throw new Error('Invalid token payload structure');
    }
  } catch (error) {
  // ตรวจสอบว่า error เป็น instance ของ Error หรือไม่
  if (error instanceof Error) {
    console.error('[AuthMiddleware] TOKEN VERIFICATION FAILED!', error.name, error.message);
  } else {
    // ถ้าไม่ใช่ ให้ log ตัว error นั้นออกมาตรงๆ
    console.error('[AuthMiddleware] An unexpected error occurred:', error);
  }
  return res.status(401).json({ message: 'Invalid or expired token.' });
}
};