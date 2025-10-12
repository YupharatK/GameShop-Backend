// src/controllers/wallet.controller.ts
import type { Request, Response } from 'express';
import { getUserWalletDataService, topupWalletService } from '../services/wallet.service.js';

export const getWalletData = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized.' });
    }
    const walletData = await getUserWalletDataService(userId);
    return res.status(200).json(walletData);
  } catch (error) {
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const topupWallet = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { amount } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized.' });
    }
    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount specified.' });
    }
    
    const result = await topupWalletService(userId, amount);
    return res.status(200).json({ message: 'Top-up successful!', ...result });
  } catch (error) {
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};