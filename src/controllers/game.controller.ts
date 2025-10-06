// src/controllers/game.controller.ts
import type { Request, Response } from 'express';
import { createGameService } from '../services/game.service.js';

export const createGame = async (req: Request, res: Response) => {
  try {
    // เอา rank_position ออก
    const { name, price, type_id, description } = req.body;
    const imageUrl = req.file?.path;

    // เอา rank_position ออกจาก validation
    if (!name || !price || !type_id || !description || !imageUrl) {
      return res.status(400).json({ message: 'All fields including image are required.' });
    }

    const newGame = await createGameService({
      name,
      price: parseFloat(price),
      type_id: parseInt(type_id, 10),
      description,
      // ไม่ต้องส่ง rank_position
      image_url: imageUrl
    });

    return res.status(201).json({ message: 'Game added successfully!', game: newGame });

  } catch (error: any) {
    console.error('Create Game Error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};