// src/services/discount.service.ts
import pool from '../config/database.js';

export const getAllDiscountsService = async () => {
  const [rows] = await pool.query(
    `SELECT id, code, discount_percent, max_usage, used_count, created_at
     FROM discount_codes ORDER BY created_at DESC`
  );
  return rows;
};

export const getActiveDiscountsService = async () => {
  const [rows] = await pool.query(
    `SELECT id, code, discount_percent, max_usage, used_count, created_at
     FROM discount_codes
     WHERE used_count < max_usage
     ORDER BY created_at DESC`
  );
  return rows;
};

export const createDiscountService = async (data: { code: string; discount_percent: number; max_usage: number; }) => {
  const [result] = await pool.query(
    `INSERT INTO discount_codes (code, discount_percent, max_usage, used_count)
     VALUES (?, ?, ?, 0)`,
    [data.code, data.discount_percent, data.max_usage]
  );
  return result;
};

export const updateDiscountService = async (
  id: number,
  data: { code: string; discount_percent: number; max_usage: number; used_count?: number; }
) => {
  const used = data.used_count ?? 0;
  const [result] = await pool.query(
    `UPDATE discount_codes
     SET code = ?, discount_percent = ?, max_usage = ?, used_count = ?
     WHERE id = ?`,
    [data.code, data.discount_percent, data.max_usage, used, id]
  );
  return result;
};

export const deleteDiscountService = async (id: number) => {
  const [result] = await pool.query(`DELETE FROM discount_codes WHERE id = ?`, [id]);
  return result;
};

/** ใช้โค้ดส่วนลดด้วย “ตารางแยก” — ไม่มี used_by */
export async function consumeDiscountByCodeTx(
  conn: any,
  code: string,
  userId: number
): Promise<{ id: number; code: string; percent: number }> {
  // lock discount row
  const [rows]: any[] = await conn.query(
    `SELECT id, code, discount_percent, max_usage, used_count
     FROM discount_codes
     WHERE code = ? FOR UPDATE`,
    [code]
  );
  if (!rows.length) throw new Error('Invalid discount code.');

  const dc = rows[0];
  const remaining = Number(dc.max_usage) - Number(dc.used_count);
  if (remaining <= 0) throw new Error('This discount code has reached its maximum usage.');

  // mark user used (unique user_id+code_id)
  try {
    await conn.query(
      `INSERT INTO UserUsedCodes (user_id, code_id) VALUES (?, ?)`,
      [userId, dc.id]
    );
  } catch (e: any) {
    if (e?.code === 'ER_DUP_ENTRY') {
      throw new Error('This user already used this discount code.');
    }
    throw e;
  }

  // bump used_count
  const [upd]: any = await conn.query(
    `UPDATE discount_codes
     SET used_count = used_count + 1
     WHERE id = ? AND used_count < max_usage`,
    [dc.id]
  );
  if (upd.affectedRows !== 1) {
    throw new Error('This discount code has reached its maximum usage.');
  }

  return { id: dc.id, code: dc.code, percent: Number(dc.discount_percent) || 0 };
}
