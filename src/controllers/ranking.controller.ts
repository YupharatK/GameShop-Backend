import type { Request, Response } from 'express';
import { updateGameRanksService } from '../services/ranking.service.js';

export const updateAllRanks = async (req: Request, res: Response) => {
  try {
    const result = await updateGameRanksService();
    return res.status(200).json(result);
  } catch (error) {
    console.error('Update Ranks Controller Error:', error);
    return res.status(500).json({ message: 'Internal Server Error while updating ranks.' });
  }
};