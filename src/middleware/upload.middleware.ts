// src/middleware/upload.middleware.ts
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// กำหนดตำแหน่งที่จะเก็บไฟล์
const uploadDir = 'public/uploads/profiles';

// ตรวจสอบและสร้าง directory ถ้ายังไม่มี
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ตั้งค่า DiskStorage สำหรับ Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir); // บอก Multer ให้เก็บไฟล์ที่นี่
  },
  filename: (req, file, cb) => {
    // สร้างชื่อไฟล์ใหม่ที่ไม่ซ้ำกัน โดยใช้ timestamp + ชื่อไฟล์เดิม
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + fileExtension);
  }
});

// สร้าง Middleware สำหรับตรวจสอบว่าเป็นไฟล์รูปภาพหรือไม่
const fileFilter = (req: any, file: any, cb: any) => {
  const allowedTypes = /jpeg|jpg|png|gif/;
  const mimetype = allowedTypes.test(file.mimetype);
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

  if (mimetype && extname) {
    return cb(null, true);
  }
  cb('Error: File upload only supports the following filetypes - ' + allowedTypes);
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 5 }, // จำกัดขนาดไฟล์ไม่เกิน 5MB
  fileFilter: fileFilter
});

export default upload;