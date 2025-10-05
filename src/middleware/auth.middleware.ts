// src/middleware/auth.middleware.ts
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// ขยาย Request interface ของ Express เพื่อเพิ่ม property 'user'
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number;
        role: string;
      };
    }
  }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication token required.' });
  }

  const token = authHeader.split(' ')[1];

  // ===================== โค้ดที่เพิ่มเข้ามาเพื่อแก้ไข =====================
  // เพิ่มการตรวจสอบว่า token มีอยู่จริงหรือไม่หลังจาก split
  if (!token) {
    return res.status(401).json({ message: 'Token is malformed or missing.' });
  }
  // =====================================================================

  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    return res.status(500).json({ message: 'Server configuration error.' });
  }

  try {
    // เมื่อผ่านเงื่อนไขข้างบนมาได้ TypeScript จะมั่นใจว่า token เป็น string แน่นอน
    const decoded = jwt.verify(token, jwtSecret);

    if (typeof decoded === 'object' && decoded !== null && 'userId' in decoded && 'role' in decoded) {
      req.user = {
        userId: decoded.userId,
        role: decoded.role
      };
      next();
    } else {
      throw new Error('Invalid token payload');
    }
  } catch (error) {
    return res.status(403).json({ message: 'Invalid or expired token.' });
  }
};