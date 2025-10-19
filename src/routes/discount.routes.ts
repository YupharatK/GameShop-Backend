import { Router } from 'express';
import {
  getAllDiscounts,
  getActiveDiscounts,
  createDiscount,
  updateDiscount,
  deleteDiscount
} from '../controllers/discout.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

// ลูกค้าทั่วไปควรเรียกอันนี้ (ซ่อนโค้ดที่เต็มสิทธิ์แล้ว)
router.get('/active', getActiveDiscounts);

// แอดมินใช้ (แสดงทั้งหมด)
router.get('/', authMiddleware, getAllDiscounts);
router.post('/', authMiddleware, createDiscount);
router.put('/:id', authMiddleware, updateDiscount);
router.delete('/:id', authMiddleware, deleteDiscount);

export default router;
