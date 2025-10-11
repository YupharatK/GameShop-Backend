// src/routes/wallet.routes.ts
import { Router } from 'express';
import { getWalletData, topupWallet } from '../controllers/wallet.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

// ดึงข้อมูล Wallet และ Transaction (ต้อง Login)
router.get('/', authMiddleware, getWalletData);

// เติมเงิน (ต้อง Login)
router.post('/topup', authMiddleware, topupWallet);

export default router;