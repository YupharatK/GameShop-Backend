// src/middleware/upload.middleware.ts
import multer from 'multer';
import path from 'path';
import type { Request } from 'express';
import fs from 'fs';

const uploadDir = 'public/uploads/';

// ตรวจสอบและสร้าง directory ถ้ายังไม่มี
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, { recursive: true });
}

// ตั้งค่าที่จัดเก็บไฟล์
const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb) => {
    cb(null, uploadDir);
  },
  filename: (req: Request, file: Express.Multer.File, cb) => {
    // สร้างชื่อไฟล์ใหม่ที่ไม่ซ้ำกัน เพื่อป้องกันการเขียนทับ
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// ฟิลเตอร์ไฟล์ ให้รับเฉพาะไฟล์รูปภาพ (jpeg, png, gif)
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png' || file.mimetype === 'image/gif') {
    cb(null, true);
  } else {
    // ปฏิเสธไฟล์ประเภทอื่น
    cb(new Error('Only image files (jpeg, png, gif) are allowed!'));
  }
};

const upload = multer({ 
  storage: storage, 
  fileFilter: fileFilter,
  limits: {
    fileSize: 1024 * 1024 * 5 // จำกัดขนาดไฟล์ไม่เกิน 5MB
  }
});

export default upload;