// src/controllers/gameType.controller.ts
import type { Request, Response } from 'express';
import { getAllGameTypesService } from '../services/gameType.service.js';

export const getAllGameTypes = async (req: Request, res: Response) => {
  try {
    const gameTypes = await getAllGameTypesService();
    return res.status(200).json(gameTypes);
  } catch (error) {
    console.error('Get All Game Types Controller Error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};