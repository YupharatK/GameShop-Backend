// src/controllers/game.controller.ts
import type { Request, Response } from 'express';
import { 
  createGameService, 
  getAllGamesService, 
  updateGameService,
  deleteGameService 
} from '../services/game.service.js';


// POST /api/games/ -> สร้างเกมใหม่
export const createGame = async (req: Request, res: Response) => {
  try {
   
    const { name, price, type_id, description } = req.body;
    const imageUrl = req.file?.path;

    
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

// GET /api/games/ -> ดึงเกมทั้งหมด
export const getAllGames = async (req: Request, res: Response) => {
  try {
    const games = await getAllGamesService();
    return res.status(200).json(games);
  } catch (error: any) {
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// PATCH /api/games/:id -> อัปเดตเกม
export const updateGame = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const imageUrl = req.file ? req.file.path : undefined;
    const gameData = { ...req.body, image_url: imageUrl };

    if (!id) {
      return res.status(400).json({ message: 'Game ID is required.' });
    }

    const updatedGame = await updateGameService(parseInt(id, 10), gameData);
    return res.status(200).json({ message: 'Game updated successfully!', game: updatedGame });
  } catch (error: any) {
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// DELETE /api/games/:id -> ลบเกม
export const deleteGame = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: 'Game ID is required.' });
    }
    await deleteGameService(parseInt(id, 10));
    return res.status(200).json({ message: 'Game deleted successfully!' });
  } catch (error: any) {
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};