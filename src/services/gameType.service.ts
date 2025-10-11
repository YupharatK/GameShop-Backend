// src/services/gameType.service.ts
import pool from '../config/database.js';

export const getAllGameTypesService = async () => {
  const sql = "SELECT * FROM game_types ORDER BY name ASC"; // เรียงตามชื่อ A-Z
  try {
    const [rows] = await pool.query(sql);
    return rows;
  } catch (error) {
    console.error("Error fetching game types:", error);
    throw error;
  }
};