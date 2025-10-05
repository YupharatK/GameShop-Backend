import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary.js';
import type { Request } from 'express';

// ตั้งค่า Cloudinary Storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req: Request, file: Express.Multer.File) => {
    return {
      folder: 'game-shop/user_profiles', // โฟลเดอร์ที่จะเก็บรูปใน Cloudinary
      public_id: `profile-${Date.now()}`, // สร้างชื่อไฟล์ที่ไม่ซ้ำกัน
      format: 'jpg', // แปลงไฟล์เป็น jpg (สามารถเปลี่ยนได้)
    };
  },
});

// ฟิลเตอร์ไฟล์ ให้รับเฉพาะไฟล์รูปภาพ (เหมือนเดิม)
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!') as any, false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 1024 * 1024 * 5 } // จำกัดขนาดไฟล์ 5 MB
});

export default upload;