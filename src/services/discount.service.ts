import pool from '../config/database.js';

export const getAllDiscountsService = async () => {
  const [rows] = await pool.query('SELECT * FROM discount_codes ORDER BY created_at DESC');
  return rows;
};

export const createDiscountService = async (data: any) => {
  const sql = `
    INSERT INTO discount_codes (code, discount_percent, max_usage, used_count)
    VALUES (?, ?, ?, 0)
  `;
  const [result] = await pool.query(sql, [
    data.code,
    data.discount_percent,
    data.max_usage
  ]);
  return result;
};

export const updateDiscountService = async (id: number, data: any) => {
  const sql = `
    UPDATE discount_codes
    SET code = ?, discount_percent = ?, max_usage = ?, used_count = ?
    WHERE id = ?
  `;
  const [result] = await pool.query(sql, [
    data.code,
    data.discount_percent,
    data.max_usage,
    data.used_count,
    id
  ]);
  return result;
};

export const deleteDiscountService = async (id: number) => {
  const sql = 'DELETE FROM discount_codes WHERE id = ?';
  const [result] = await pool.query(sql, [id]);
  return result;
};
