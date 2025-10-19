// src/services/order.service.ts
import pool from '../config/database.js';
import { consumeDiscountByCodeTx } from './discount.service.js';

/** คำนวณตัวเลขราคาให้ปัดสองตำแหน่งและไม่ติดลบ */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * สร้างออเดอร์ (รวมส่วนลดถ้ามี), ตัดเงิน, บันทึกรายการต่าง ๆ
 * NOTE: ส่วนของ INSERT orders / order_items / library / rankings / transactions
 *       ให้ใส่ตามสคีมาของคุณในส่วนคอมเมนต์ด้านล่าง
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
  // เสริมข้อมูลตามที่คุณต้องการ return ได้ เช่น orderId, newBalance
}> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1) คำนวณยอดรวมจาก items
    const subtotal = items.reduce((s, it) => s + Number(it.price), 0);

    // 2) ใช้โค้ดส่วนลด (ถ้ามี)
    let percent = 0;
    if (discountCode) {
      const applied = await consumeDiscountByCodeTx(conn, String(discountCode), userId);
      percent = applied.percent;
    }

    const discountAmount = round2((subtotal * percent) / 100);
    const totalToCharge = Math.max(0, round2(subtotal - discountAmount));

    // ====== ตัวอย่างขั้นตอนต่อไปนี้ให้ใส่ตามสคีมาของโปรเจกต์คุณ ======
    // 3) ล็อกกระเป๋าเงินผู้ใช้ + ตรวจเงินพอ
    // const [uRows]: any[] = await conn.query(
    //   `SELECT wallet_balance FROM users WHERE id = ? FOR UPDATE`,
    //   [userId]
    // );
    // if (!uRows.length) throw new Error('User not found.');
    // const currentBalance = Number(uRows[0].wallet_balance);
    // if (currentBalance < totalToCharge) throw new Error('Insufficient funds.');
    // const newBalance = round2(currentBalance - totalToCharge);
    // await conn.query(`UPDATE users SET wallet_balance = ? WHERE id = ?`, [newBalance, userId]);

    // 4) สร้างคำสั่งซื้อ (orders)
    // const [oRes]: any = await conn.query(
    //   `INSERT INTO orders (user_id, total_price) VALUES (?, ?)`,
    //   [userId, totalToCharge]
    // );
    // const orderId = oRes.insertId;

    // 5) เพิ่มรายการสินค้าใน order_items + เพิ่มเข้า UserLibrary + อัปเดต rankings
    // for (const it of items) {
    //   const gameId = Number(it.id);
    //   const price = Number(it.price);
    //   await conn.query(
    //     `INSERT INTO order_items (order_id, game_id, price) VALUES (?, ?, ?)`,
    //     [orderId, gameId, price]
    //   );
    //   await conn.query(
    //     `INSERT INTO UserLibrary (user_id, game_id) VALUES (?, ?)`,
    //     [userId, gameId]
    //   );
    //   await conn.query(`UPDATE rankings SET sales_count = sales_count + 1 WHERE game_id = ?`, [gameId]);
    // }

    // 6) บันทึกธุรกรรมกระเป๋าเงิน (transactions)
    // await conn.query(
    //   `INSERT INTO transactions (user_id, type, amount, description)
    //    VALUES (?, 'PURCHASE', ?, ?)`,
    //   [userId, -totalToCharge, `Purchase of ${items.length} game(s)`]
    // );

    await conn.commit();

    return {
      success: true,
      subtotal,
      percent,
      discountAmount,
      totalToCharge,
      // orderId,
      // newBalance,
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
 * - ล็อกออเดอร์ (FOR UPDATE) และตรวจว่าเป็นของ user นี้
 * - consume ส่วนลดแบบตารางเดียว (จะกันเต็มสิทธิ์ + กัน user ใช้ซ้ำ)
 * - คิดส่วนลดจากยอด total เดิม แล้วอัปเดต total_price
 */
export async function applyDiscountToExistingOrderService(
  orderId: number,
  discountCode: string,
  userId: number
): Promise<{
  success: boolean;
  orderId: number;
  oldTotal: number;
  discountPercent: number;
  discountAmount: number;
  newTotal: number;
}> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1) ล็อกออเดอร์และตรวจกรรมสิทธิ์
    const [oRows]: any[] = await conn.query(
      `SELECT id, user_id, total_price
       FROM orders
       WHERE id = ? FOR UPDATE`,
      [orderId]
    );
    if (!oRows.length) throw new Error('Order not found.');
    if (Number(oRows[0].user_id) !== Number(userId)) throw new Error('Forbidden.');
    const oldTotal = Number(oRows[0].total_price);

    // 2) consume ส่วนลด (ตารางเดียว + JSON)
    const applied = await consumeDiscountByCodeTx(conn, String(discountCode), userId);
    const discountPercent = applied.percent;

    // 3) คำนวณยอดใหม่ แล้วอัปเดตออเดอร์
    const discountAmount = round2((oldTotal * discountPercent) / 100);
    const newTotal = Math.max(0, round2(oldTotal - discountAmount));

    await conn.query(`UPDATE orders SET total_price = ? WHERE id = ?`, [newTotal, orderId]);

    await conn.commit();

    return {
      success: true,
      orderId,
      oldTotal,
      discountPercent,
      discountAmount,
      newTotal,
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
