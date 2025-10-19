import pool from '../config/database.js';

/** ทั้งหมด (แอดมินดู) */
export const getAllDiscountsService = async () => {
  const [rows] = await pool.query(
    'SELECT id, code, discount_percent, max_usage, used_count, created_at FROM discount_codes ORDER BY created_at DESC'
  );
  return rows;
};

/** เหลือสิทธิ์ (ให้ฝั่งลูกค้าใช้) */
export const getActiveDiscountsService = async () => {
  const [rows] = await pool.query(
    `SELECT id, code, discount_percent, max_usage, used_count, created_at
     FROM discount_codes
     WHERE used_count < max_usage
     ORDER BY created_at DESC`
  );
  return rows;
};

/** เพิ่ม (admin) */
export const createDiscountService = async (data: { code: string; discount_percent: number; max_usage: number; }) => {
  // ถ้าคอลัมน์ used_by ของคุณมี DEFAULT JSON_ARRAY() แล้ว insert แบบนี้ได้เลย
  const sql = `
    INSERT INTO discount_codes (code, discount_percent, max_usage, used_count)
    VALUES (?, ?, ?, 0)
  `;
  const [result] = await pool.query(sql, [data.code, data.discount_percent, data.max_usage]);
  return result;
};

/** แก้ไข (admin) */
export const updateDiscountService = async (
  id: number,
  data: { code: string; discount_percent: number; max_usage: number; used_count?: number; }
) => {
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

/**
 * ใช้โค้ดส่วนลด (ตารางเดียว + JSON):
 * - เช็คว่ามีโค้ดไหม
 * - ห้ามใช้ถ้าเต็มสิทธิ์ (used_count >= max_usage)
 * - ห้าม user ใช้ซ้ำ (NOT JSON_CONTAINS(used_by, userId))
 * - ถ้าผ่าน: used_count+1 และ append userId ลง JSON used_by
 *
 * ต้องถูกเรียก "ใน" transaction จาก connection เดียวกับ checkout เพื่อความสอดคล้อง
 */
export const consumeDiscountByCodeTx = async (
  connection: any,
  code: string,
  userId: number
): Promise<{ id: number; code: string; percent: number }> => {
  // 1) อ่านเมตา
  const [metaRows]: any[] = await connection.query(
    `SELECT id, code, discount_percent, max_usage, used_count,
            JSON_CONTAINS(used_by, CAST(? AS JSON)) AS already_used
     FROM discount_codes
     WHERE code = ?`,
    [String(userId), code]
  );
  if (metaRows.length === 0) {
    throw new Error('Invalid discount code.');
  }
  const meta = metaRows[0];

  // ✅ เช็คตรง ๆ ตามที่ต้องการ: ถ้าเต็มสิทธิ์แล้ว ห้ามใช้
  if (Number(meta.used_count) >= Number(meta.max_usage)) {
    throw new Error('This discount code has reached its maximum usage.');
  }

  // (ถ้าต้องการกัน user ใช้ซ้ำต่อ) เช็คซ้ำด้วยก็ได้:
  if (Number(meta.already_used) === 1) {
    throw new Error('This user already used this discount code.');
  }

  // 2) อัปเดตแบบอะตอมมิก (ยังคงเงื่อนไขกันแข่ง และกันเกินสิทธิ์)
  const [upd]: any = await connection.query(
    `UPDATE discount_codes
     SET
       used_count = used_count + 1,
       used_by    = JSON_ARRAY_APPEND(used_by, '$', CAST(? AS JSON))
     WHERE code = ?
       AND used_count < max_usage
       AND NOT JSON_CONTAINS(used_by, CAST(? AS JSON))`,
    [String(userId), code, String(userId)]
  );

  if (upd.affectedRows !== 1) {
    // เผื่อเคสแข่งกันในช่วงเสี้ยววินาที
    throw new Error('Cannot apply discount at this time.');
  }

  return {
    id: meta.id,
    code: meta.code,
    percent: Number(meta.discount_percent) || 0
  };
};
