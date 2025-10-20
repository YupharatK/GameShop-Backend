// src/services/game.service.ts
import pool from '../config/database.js';

// ฟังก์ชันสำหรับสร้างเกมใหม่
export const createGameService = async (gameData: any) => {
  
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

// ฟังก์ชันสำหรับดึงเกมทั้งหมด
export const getAllGamesService = async () => {
  // JOIN กับตาราง game_types เพื่อเอาชื่อ genre มาด้วย
  const sql = `
    SELECT g.*, gt.name as genre_name 
    FROM games g
    JOIN game_types gt ON g.type_id = gt.id
    ORDER BY g.created_at DESC
  `;
  const [rows] = await pool.query(sql);
  return rows;
};

// ฟังก์ชันสำหรับอัปเดตเกม
export const updateGameService = async (gameId: number, dataToUpdate: any) => {
  // ฟังก์ชันนี้จะคล้ายกับ updateUserService
  const fieldsToUpdate = [];
  const values = [];
  for (const key in dataToUpdate) {
    if (dataToUpdate[key] !== undefined && dataToUpdate[key] !== null) {
      // แปลง key ให้ตรงกับชื่อคอลัมน์ใน DB
      const dbKey = key === 'genre' ? 'type_id' : key;
      fieldsToUpdate.push(`${dbKey} = ?`);
      values.push(dataToUpdate[key]);
    }
  }
  if (fieldsToUpdate.length === 0) throw new Error("No data to update");
  
  values.push(gameId);
  const sql = `UPDATE games SET ${fieldsToUpdate.join(', ')} WHERE id = ?`;
  await pool.query(sql, values);
  
  const [rows]: any[] = await pool.query("SELECT * FROM games WHERE id = ?", [gameId]);
  return rows[0];
};

// ฟังก์ชันสำหรับลบเกม
export const deleteGameService = async (gameId: number) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    // ต้องลบจากตารางที่อ้างอิงก่อน (FK)
    await connection.query("DELETE FROM rankings WHERE game_id = ?", [gameId]);
    // จากนั้นค่อยลบเกม
    await connection.query("DELETE FROM games WHERE id = ?", [gameId]);
    await connection.commit();
    return { id: gameId };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const getGamesByUserService = async (userId: number) => {
  const sql = `
    SELECT
      g.id,
      g.name,
      g.price,
      g.image_url,
      g.description,
      g.release_date,
      g.created_at,
      gt.name        AS game_type,
      ul.purchase_date
    FROM UserLibrary ul
    JOIN games g        ON g.id = ul.game_id
    JOIN game_types gt  ON gt.id = g.type_id
    WHERE ul.user_id = ?
    ORDER BY ul.purchase_date DESC, g.created_at DESC
  `;
  const [rows] = await pool.query(sql, [userId]);
  return rows; // [{ id, name, ..., game_type, purchase_date }, ...]
};

// ฟังก์ชันสำหรับค้นหาเกมตามชื่อ
export const searchGamesService = async (searchTerm: string) => {
  // ใช้ LIKE '%...%' เพื่อค้นหาชื่อเกมที่มีคำนั้นๆ อยู่
  const sql = "SELECT g.*, gt.name as genre_name FROM games g JOIN game_types gt ON g.type_id = gt.id WHERE g.name LIKE ?";
  const queryParam = `%${searchTerm}%`;

  try {
    const [rows] = await pool.query(sql, [queryParam]);
    return rows;
  } catch (error) {
    console.error("Error searching games:", error);
    throw error;
  }
};

// ฟังก์ชันสำหรับดึงเกมตาม ID
export const getGameByIdService = async (gameId: number) => {
  const sql = `
    SELECT 
      g.*, 
      gt.name as genre_name,
      r.rank_position
    FROM games g
    LEFT JOIN game_types gt ON g.type_id = gt.id
    LEFT JOIN rankings r ON g.id = r.game_id
    WHERE g.id = ?
  `;
  try {
    const [rows]: any[] = await pool.query(sql, [gameId]);
    if (rows.length === 0) {
      return null; // ไม่พบเกม
    }
    return rows[0]; // คืนค่าเกมที่พบ
  } catch (error) {
    console.error("Error fetching game by ID:", error);
    throw error;
  }
};

export const getTopSellersFromOrderItemsService = async (limit = 5, days?: number) => {
  const useWindow = Number.isFinite(days) && Number(days) > 0;

  const sqlAllTime = `
    SELECT
      g.id,
      g.name,
      g.image_url,
      g.price,
      gt.name AS genre_name,
      COUNT(oi.id)              AS qty_sold,
      COALESCE(SUM(oi.price),0) AS revenue
    FROM order_items oi
    JOIN games g       ON g.id = oi.game_id
    JOIN game_types gt ON gt.id = g.type_id
    GROUP BY g.id
    ORDER BY qty_sold DESC, g.created_at DESC
    LIMIT ?
  `;

  const sqlWindow = `
    SELECT
      g.id,
      g.name,
      g.image_url,
      g.price,
      gt.name AS genre_name,
      COUNT(oi.id)              AS qty_sold,
      COALESCE(SUM(oi.price),0) AS revenue
    FROM order_items oi
    JOIN orders o     ON o.id = oi.order_id
    JOIN games g      ON g.id = oi.game_id
    JOIN game_types gt ON gt.id = g.type_id
    WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    GROUP BY g.id
    ORDER BY qty_sold DESC, g.created_at DESC
    LIMIT ?
  `;

  const [rows] = useWindow
    ? await pool.query(sqlWindow, [Number(days), Number(limit)])
    : await pool.query(sqlAllTime, [Number(limit)]);

  return rows;
};