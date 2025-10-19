import pool from '../config/database.js';

export const getAllDiscountsService = async () => {
  const [rows] = await pool.query(
    'SELECT id, code, discount_percent, max_usage, used_count, created_at FROM discount_codes ORDER BY created_at DESC'
  );
  return rows;
};

export const getActiveDiscountsService = async () => {
  const [rows] = await pool.query(
    `SELECT id, code, discount_percent, max_usage, used_count, created_at
     FROM discount_codes
     WHERE (max_usage - used_count) > 0
     ORDER BY created_at DESC`
  );
  return rows;
};

/** เพิ่ม (admin) */
export const createDiscountService = async (data: { code: string; discount_percent: number; max_usage: number; }) => {
  const sql = `
    INSERT INTO discount_codes (code, discount_percent, max_usage, used_count)
    VALUES (?, ?, ?, 0)
  `;
  const [result] = await pool.query(sql, [data.code, data.discount_percent, data.max_usage]);
  return result;
};

/** แก้ไข (admin) */
export const updateDiscountService = async (id: number, data: { code: string; discount_percent: number; max_usage: number; used_count?: number; }) => {
  const sql = `
    UPDATE discount_codes
    SET code = ?, discount_percent = ?, max_usage = ?, used_count = ?
    WHERE id = ?
  `;
  const used = data.used_count ?? 0;
  const [result] = await pool.query(sql, [data.code, data.discount_percent, data.max_usage, used, id]);
  return result;
};

/** ลบ (admin) */
export const deleteDiscountService = async (id: number) => {
  const [result] = await pool.query('DELETE FROM discount_codes WHERE id = ?', [id]);
  return result;
};

/** ใช้ในตอนคิดเงินจริง: ตรวจโค้ด + lock แถว + ตรวจสิทธิ์ + เพิ่ม used_count */
export const consumeDiscountByCodeTx = async (connection: any, code: string) => {
  const [rows]: any[] = await connection.query(
    `SELECT id, code, discount_percent, max_usage, used_count
     FROM discount_codes
     WHERE code = ? FOR UPDATE`,
    [code]
  );
  if (rows.length === 0) throw new Error('Invalid discount code.');

  const dc = rows[0];
  const remaining = (dc.max_usage ?? 0) - (dc.used_count ?? 0);
  if (remaining <= 0) throw new Error('This discount code has reached its maximum usage.');

  // เพิ่ม used_count 1 ครั้ง
  await connection.query('UPDATE discount_codes SET used_count = used_count + 1 WHERE id = ?', [dc.id]);

  return {
    id: dc.id,
    code: dc.code,
    percent: Number(dc.discount_percent) || 0
  };
};
