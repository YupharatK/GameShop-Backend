// src/services/discount.service.ts
import pool from '../config/database.js';

export async function consumeDiscountByCodeTx(
  conn: any,
  code: string,
  userId: number
): Promise<{ id: number; code: string; percent: number }> {
  // 1) ล็อกโค้ด
  const [rows]: any[] = await conn.query(
    `SELECT id, code, discount_percent, max_usage, used_count
     FROM discount_codes
     WHERE code = ? FOR UPDATE`,
    [code]
  );
  if (!rows.length) throw new Error('Invalid discount code.');

  const dc = rows[0];
  const remaining = Number(dc.max_usage) - Number(dc.used_count);
  if (remaining <= 0) {
    throw new Error('This discount code has reached its maximum usage.');
  }

  // 2) จดว่า user ใช้โค้ดนี้ (กันซ้ำด้วย UNIQUE (user_id, code_id))
  try {
    await conn.query(
      `INSERT INTO UserUsedCodes (user_id, code_id) VALUES (?, ?)`,
      [userId, dc.id]
    );
  } catch (e: any) {
    // ซ้ำ -> ผู้ใช้เคยใช้แล้ว
    if (e?.code === 'ER_DUP_ENTRY') {
      throw new Error('This user already used this discount code.');
    }
    throw e;
  }

  // 3) อัปเดตยอดใช้ของโค้ด (ยังเหลือสิทธิ์)
  const [upd]: any = await conn.query(
    `UPDATE discount_codes
     SET used_count = used_count + 1
     WHERE id = ? AND used_count < max_usage`,
    [dc.id]
  );
  if (upd.affectedRows !== 1) {
    // เผื่ออีกทรานแซคชันชิงสิทธิ์สุดท้ายไปพอดี
    throw new Error('This discount code has reached its maximum usage.');
  }

  return {
    id: dc.id,
    code: dc.code,
    percent: Number(dc.discount_percent) || 0
  };
}
