import express from 'express';
import {
  getAllDiscounts,
  createDiscount,
  updateDiscount,
  deleteDiscount
} from '../controllers/discout.controller.js';

const router = express.Router();

router.get('/', getAllDiscounts);
router.post('/', createDiscount);
router.put('/:id', updateDiscount);
router.delete('/:id', deleteDiscount);

export default router;
