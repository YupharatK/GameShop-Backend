// src/services/game.service.ts
import pool from '../config/database.js';

// src/services/game.service.ts

// ... imports ...

export const createGameService = async (gameData: any) => {
  // เอา rank_position ออกจาก destructuring
  const { name, price, type_id, image_url, description } = gameData;
  
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const gameSql = `
      INSERT INTO games (name, price, type_id, image_url, description, release_date) 
      VALUES (?, ?, ?, ?, ?, CURDATE())
    `;
    const [gameResult]: any = await connection.query(gameSql, [
      name, price, type_id, image_url, description
    ]);
    const newGameId = gameResult.insertId;

    // แก้ไข SQL นี้ ให้ rank_position เป็น NULL
    const rankingSql = `
      INSERT INTO rankings (game_id, rank_date, sales_count, rank_position) 
      VALUES (?, CURDATE(), 0, NULL)
    `;
    // เอา rank_position ออกจาก parameters
    await connection.query(rankingSql, [newGameId]);

    await connection.commit();

    const [rows]: any[] = await connection.query("SELECT * FROM games WHERE id = ?", [newGameId]);
    return rows[0];

  } catch (error) {
    await connection.rollback();
    console.error("Error in createGameService:", error);
    throw error;
  } finally {
    connection.release();
  }
};