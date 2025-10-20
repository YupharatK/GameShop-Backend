// src/controllers/game.controller.ts
import type { Request, Response } from 'express';
import { 
  createGameService, 
  getAllGamesService, 
  updateGameService,
  deleteGameService, 
  getGamesByUserService,
  searchGamesService,
  getGameByIdService,
  getTopSellersFromOrderItemsService
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

export const getUserGames = async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.userId);
    if (!Number.isFinite(userId)) return res.status(400).json({ message: 'Invalid userId' });
    const games = await getGamesByUserService(userId);
    return res.status(200).json(games);
  } catch (e) {
    console.error('getUserGames error:', e);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// GET /api/games/search?q=term -> ค้นหาเกม
export const searchGames = async (req: Request, res: Response) => {
  try {
    const searchTerm = req.query.q as string;

    if (!searchTerm) {
      return res.status(200).json([]); // ถ้าไม่มีคำค้นหา ส่ง array ว่างกลับไป
    }

    const games = await searchGamesService(searchTerm);
    return res.status(200).json(games);

  } catch (error) {
    console.error('Search Games Controller Error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// GET /api/games/:id -> ดึงเกมตาม ID
export const getGameById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id; // 1. ดึง id ออกมาใส่ตัวแปรก่อน

    // ====================== โค้ดที่ต้องเพิ่มเข้ามา ======================
    // 2. เพิ่มการตรวจสอบว่ามี id ส่งมาใน parameter หรือไม่
    if (!id) {
      return res.status(400).json({ message: 'Game ID is required.' });
    }
    // หลังจากผ่าน check นี้ไปได้ TypeScript จะรู้ว่า 'id' เป็น string แน่นอน
    // ================================================================

    const gameId = parseInt(id, 10); // 3. ตอนนี้ Error จะหายไปแล้ว

    if (isNaN(gameId)) {
      return res.status(400).json({ message: 'Invalid game ID.' });
    }

    const game = await getGameByIdService(gameId);

    if (!game) {
      return res.status(404).json({ message: 'Game not found.' });
    }

    return res.status(200).json(game);

  } catch (error) {
    console.error('Get Game By ID Controller Error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const getTopSellers = async (req: Request, res: Response) => {
  try {
    const limit = Number(req.query.limit ?? 5);
    const days  = req.query.days !== undefined ? Number(req.query.days) : undefined; // ออปชัน: ช่วงวัน
    const rows = await getTopSellersFromOrderItemsService(limit, days);
    return res.status(200).json(rows);
  } catch (e) {
    console.error('[games] getTopSellers error:', e);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};