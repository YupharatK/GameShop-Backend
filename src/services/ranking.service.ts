// src/services/ranking.service.ts
import pool from '../config/database.js';

export const updateGameRanksService = async () => {
  // เราจะใช้ Window Function (ROW_NUMBER) ของ SQL เพื่อคำนวณอันดับใหม่
  // โดยเรียงจาก sales_count มากไปน้อย
  const updateRanksSql = `
    UPDATE rankings r
    JOIN (
      SELECT 
        game_id, 
        ROW_NUMBER() OVER (ORDER BY sales_count DESC) as new_rank 
      FROM rankings
    ) as ranked_games ON r.game_id = ranked_games.game_id
    SET r.rank_position = ranked_games.new_rank;
  `;

  try {
    const [result]: any = await pool.query(updateRanksSql);
    // result.info จะบอกว่ามีกี่แถวที่ถูกอัปเดต
    return { message: `Successfully updated ranks for ${result.affectedRows} games.` };
  } catch (error) {
    console.error("Error updating game ranks:", error);
    throw error;
  }
};