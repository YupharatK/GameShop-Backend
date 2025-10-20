// src/services/order.service.ts
import pool from '../config/database.js';
import { consumeDiscountByCodeTx } from './discount.service.js';

/** ปัดทศนิยม 2 ตำแหน่ง */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * สร้างออเดอร์ + (ถ้ามี) ใช้ส่วนลดแบบอะตอมมิก (เพิ่ม used_count ให้กับ discount)
 * - ใช้ consumeDiscountByCodeTx ภายใน transaction เดียวกัน
 * - จากนั้นค่อยตัดเงิน/สร้าง order/เพิ่ม order_items/เพิ่ม library/อัปเดตรายการอื่น ๆ
 */
export async function createOrderService(
  userId: number,
  items: Array<{ id: number | string; price: number | string }>,
  discountCode?: string | null
): Promise<{
  success: boolean;
  subtotal: number;
  percent: number;
  discountAmount: number;
  totalToCharge: number;
  orderId: number;
}> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1) รวมราคา
    const subtotal = items.reduce((s, it) => s + Number(it.price), 0);

    // 2) ใช้ส่วนลด (จะเพิ่ม used_count ใน discount_codes แบบอะตอมมิก)
    let percent = 0;
    const code = (discountCode ?? '').toString().trim();
    if (code.length > 0) {
      const applied = await consumeDiscountByCodeTx(conn, code, userId);
      percent = Number(applied.percent) || 0; // ถ้าโค้ดไม่ valid/เต็มสิทธิ์/ผู้ใช้เดิม → ฟังก์ชันจะ throw
    }

    const discountAmount = round2((subtotal * percent) / 100);
    const totalToCharge  = Math.max(0, round2(subtotal - discountAmount));

    // ====== ส่วนต่อไปนี้ปรับให้ตรง schema ของคุณ ======

    // 3) (ออปชัน) ล็อกและตรวจเงินพอ
    // const [uRows]: any[] = await conn.query(
    //   `SELECT wallet_balance FROM users WHERE id = ? FOR UPDATE`,
    //   [userId]
    // );
    // if (!uRows.length) throw new Error('User not found.');
    // const currentBalance = Number(uRows[0].wallet_balance);
    // if (currentBalance < totalToCharge) throw new Error('Insufficient funds.');
    // const newBalance = round2(currentBalance - totalToCharge);
    // await conn.query(`UPDATE users SET wallet_balance = ? WHERE id = ?`, [newBalance, userId]);

    // 4) สร้างออเดอร์
    const [oRes]: any = await conn.query(
      `INSERT INTO orders (user_id, total_price) VALUES (?, ?)`,
      [userId, totalToCharge]
    );
    const orderId = oRes.insertId;

    // 5) เพิ่มรายการสินค้า + library + rankings
    for (const it of items) {
      const gameId = Number(it.id);
      const price  = Number(it.price);

      await conn.query(
        `INSERT INTO order_items (order_id, game_id, price) VALUES (?, ?, ?)`,
        [orderId, gameId, price]
      );

      await conn.query(
        `INSERT INTO UserLibrary (user_id, game_id) VALUES (?, ?)`,
        [userId, gameId]
      );

      await conn.query(
        `UPDATE rankings SET sales_count = sales_count + 1 WHERE game_id = ?`,
        [gameId]
      );
    }

    // 6) บันทึกธุรกรรม (ยอดลบ)
    await conn.query(
      `INSERT INTO transactions (user_id, type, amount, description)
       VALUES (?, 'PURCHASE', ?, ?)`,
      [userId, -totalToCharge, `Purchase of ${items.length} game(s)`]
    );

    await conn.commit();

    return {
      success: true,
      subtotal,
      percent,
      discountAmount,
      totalToCharge,
      orderId,
    };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

/**
 * ใช้โค้ดส่วนลดกับ "ออเดอร์ที่มีอยู่แล้ว"
 * - ล็อก order (FOR UPDATE) + ตรวจว่าเป็นของ user นี้
 * - ใช้ consumeDiscountByCodeTx เพื่อตัดสิทธิ์ + กันซ้ำ/กันเกินสิทธิ์
 * - คำนวณส่วนลดจาก "ผลรวมราคาใน order_items" แล้วอัปเดต orders.total_price
 */
export async function applyDiscountToExistingOrderService(
  orderId: number,
  discountCode: string,
  userId: number
): Promise<{
  orderId: number;
  subtotal: number;
  discountCode: string;
  discountPercent: number;
  discountAmount: number;
  totalPrice: number;
}> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1) ล็อกออเดอร์ + ตรวจสิทธิ์
    const [ordRows]: any[] = await conn.query(
      `SELECT id, user_id FROM orders WHERE id = ? FOR UPDATE`,
      [orderId]
    );
    if (!ordRows.length) throw new Error('Order not found.');
    if (Number(ordRows[0].user_id) !== Number(userId)) {
      throw new Error('Forbidden.');
    }

    // 2) รวมราคา (จาก items ในออเดอร์นั้น)
    const [sumRows]: any[] = await conn.query(
      `SELECT COALESCE(SUM(price), 0) AS subtotal FROM order_items WHERE order_id = ?`,
      [orderId]
    );
    const subtotal = Number(sumRows[0]?.subtotal ?? 0);

    // 3) ใช้โค้ดส่วนลด (จะเพิ่ม used_count ให้อัตโนมัติที่ discount_codes)
    const code = (discountCode ?? '').toString().trim();
    if (!code) throw new Error('discountCode is required');

    const applied = await consumeDiscountByCodeTx(conn, code, userId);
    const discountPercent = Number(applied.percent) || 0;

    const discountAmount = Math.max(0, round2((subtotal * discountPercent) / 100));
    const totalPrice     = Math.max(0, round2(subtotal - discountAmount));

    // 4) อัปเดตยอดรวมใน orders
    const [updOrder]: any = await conn.query(
      `UPDATE orders SET total_price = ? WHERE id = ?`,
      [totalPrice, orderId]
    );
    if (updOrder.affectedRows !== 1) {
      throw new Error('Order update failed.');
    }

    await conn.commit();

    return {
      orderId,
      subtotal: round2(subtotal),
      discountCode: applied.code,
      discountPercent,
      discountAmount,
      totalPrice,
    };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}
