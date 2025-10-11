// src/services/admin.service.ts
import pool from '../config/database.js';

// ดึงรายชื่อผู้ใช้ทั้งหมด (เฉพาะข้อมูลที่จำเป็น)
export const getAllUsersService = async () => {
  const sql = "SELECT id, username, email FROM users ORDER BY username ASC";
  try {
    const [rows] = await pool.query(sql);
    return rows;
  } catch (error) {
    console.error("Error fetching all users:", error);
    throw error;
  }
};

// ดึงประวัติ Transaction ของผู้ใช้คนเดียว
export const getUserTransactionsService = async (userId: number) => {
  const sql = "SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC";
  try {
    const [rows] = await pool.query(sql, [userId]);
    return rows;
  } catch (error) {
    console.error(`Error fetching transactions for user ID ${userId}:`, error);
    throw error;
  }
};

export const getAllTransactionsService = async () => {
  // ใช้ SQL JOIN เพื่อดึงข้อมูลจากตาราง transactions และ users พร้อมกัน
  const sql = `
    SELECT
      t.id,
      t.type,
      t.amount,
      t.created_at as date,
      u.username,
      u.email
    FROM transactions t
    JOIN users u ON t.user_id = u.id
    ORDER BY t.created_at DESC
  `;
  try {
    const [rows] = await pool.query(sql);
    return rows;
  } catch (error) {
    console.error("Error fetching all transactions:", error);
    throw error;
  }
};