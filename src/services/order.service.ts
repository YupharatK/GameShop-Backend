// src/services/order.service.ts
import pool from '../config/database.js';

export interface CheckoutItem {
  id: number | string;
  price: number | string;
  quantity?: number; // หากไม่มี ให้ถือว่า = 1
}

export interface CreateOrderResult {
  success: boolean;
  orderId: number;
  newBalance: number;
  subtotal: number;
  discountApplied: string | null;
  discountPercent: number;
  discountAmount: number;
  totalCharged: number;
}

/**
 * สร้างออเดอร์ + คิดส่วนลด (ไม่บันทึกรายละเอียดส่วนลดลง orders เพราะไม่มีคอลัมน์)
 * - ล็อก wallet ผู้ใช้
 * - ตรวจ funds พอไหม
 * - ตัดเงิน
 * - INSERT orders(user_id, total_price)
 * - INSERT order_items, UserLibrary
 * - UPDATE rankings
 * - INSERT transactions
 * - (เลือกได้) อัปเดต used_count โค้ดส่วนลด ณ ตอนชำระเงินจริง
 */
export const createOrderService = async (
  userId: number,
  items: CheckoutItem[],
  discountCode?: string | null
): Promise<CreateOrderResult> => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Cart is empty.');
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1) คำนวณ subtotal
    const subtotal = items.reduce((sum, it) => {
      const qty = it.quantity != null ? Number(it.quantity) : 1;
      const price = Number(it.price);
      if (!Number.isFinite(price) || price < 0) {
        throw new Error('Invalid item price.');
      }
      return sum + price * qty;
    }, 0);

    // 2) ตรวจส่วนลด (ไม่เก็บลง orders เพราะ schema ไม่มีคอลัมน์)
    let appliedCode: string | null = null;
    let discountPercent = 0;
    let discountAmount = 0;

    if (discountCode) {
      const [dcRows]: any[] = await conn.query(
        `SELECT id, code, discount_percent, max_usage, used_count
         FROM discount_codes
         WHERE code = ? FOR UPDATE`,
        [discountCode]
      );

      if (dcRows.length === 0) {
        throw new Error('Invalid discount code.');
      }

      const dc = dcRows[0];
      const remaining = (dc.max_usage ?? 0) - (dc.used_count ?? 0);
      if (remaining <= 0) {
        throw new Error('This discount code has reached its maximum usage.');
      }

      appliedCode = dc.code;
      discountPercent = Number(dc.discount_percent) || 0;
      discountAmount = Math.max(0, Math.round((subtotal * discountPercent / 100) * 100) / 100);
    }

    // 3) total ที่ต้องตัดเงินจริง
    const totalToCharge = Math.max(0, Math.round((subtotal - discountAmount) * 100) / 100);

    // 4) ล็อก wallet ผู้ใช้
    const [userRows]: any[] = await conn.query(
      'SELECT wallet_balance FROM users WHERE id = ? FOR UPDATE',
      [userId]
    );
    if (userRows.length === 0) throw new Error('User not found.');
    const currentBalance = Number(userRows[0].wallet_balance);
    if (!Number.isFinite(currentBalance)) throw new Error('Invalid wallet balance.');
    if (currentBalance < totalToCharge) throw new Error('Insufficient funds.');

    // 5) ตัดเงิน
    const newBalance = Math.round((currentBalance - totalToCharge) * 100) / 100;
    await conn.query('UPDATE users SET wallet_balance = ? WHERE id = ?', [newBalance, userId]);

    // 6) สร้างออเดอร์ (❗️INSERT เฉพาะคอลัมน์ที่มี)
    const [orderResult]: any = await conn.query(
      `INSERT INTO orders (user_id, total_price) VALUES (?, ?)`,
      [userId, totalToCharge]
    );
    const newOrderId: number = orderResult.insertId;

    // 7) รายการย่อย + library + rankings
    for (const it of items) {
      const gameId = it.id;
      const qty = it.quantity != null ? Number(it.quantity) : 1;
      const unitPrice = Number(it.price);
      const lineAmount = Math.round(unitPrice * qty * 100) / 100;

      await conn.query(
        'INSERT INTO order_items (order_id, game_id, price) VALUES (?, ?, ?)',
        [newOrderId, gameId, lineAmount]
      );

      await conn.query(
        'INSERT INTO UserLibrary (user_id, game_id) VALUES (?, ?)',
        [userId, gameId]
      );

      await conn.query(
        'UPDATE rankings SET sales_count = sales_count + 1 WHERE game_id = ?',
        [gameId]
      );
    }

    // 8) (ตัวเลือก) อัปเดต used_count ของโค้ด ณ ตอนชำระเงินจริง
    if (appliedCode) {
      await conn.query(
        'UPDATE discount_codes SET used_count = used_count + 1 WHERE code = ?',
        [appliedCode]
      );
    }

    // 9) บันทึกธุรกรรมเงิน
    const desc = `Purchase of ${items.length} game(s)${
      appliedCode ? ` with discount ${appliedCode} (-${discountPercent}%)` : ''
    }`;
    await conn.query(
      "INSERT INTO transactions (user_id, type, amount, description) VALUES (?, 'PURCHASE', ?, ?)",
      [userId, -totalToCharge, desc]
    );

    await conn.commit();

    return {
      success: true,
      orderId: newOrderId,
      newBalance,
      subtotal: Math.round(subtotal * 100) / 100,
      discountApplied: appliedCode,
      discountPercent,
      discountAmount,
      totalCharged: totalToCharge,
    };
  } catch (e) {
    await conn.rollback();
    console.error('[createOrderService] error:', e);
    throw e;
  } finally {
    conn.release();
  }
};

export interface ApplyDiscountResult {
  orderId: number;
  subtotal: number;
  discountCode: string;
  discountPercent: number;
  discountAmount: number;
  totalPrice: number;
}

/**
 * กรณีมี "ออเดอร์ถูกสร้างไว้แล้ว" และกด Apply ส่วนลดภายหลัง:
 * - รวม subtotal จาก order_items
 * - ตรวจโค้ด (FOR UPDATE)
 * - อัปเดตเฉพาะ orders.total_price (❗️เพราะไม่มีคอลัมน์ discount_*)
 * - (ตัวเลือก) เพิ่ม used_count ของส่วนลด
 */
export const applyDiscountToExistingOrderService = async (
  orderId: number,
  discountCode: string,
  userId: number
): Promise<ApplyDiscountResult> => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1) ล็อกออเดอร์ + เช็คว่าเป็นของ userId
    const [ordRows]: any[] = await conn.query(
      'SELECT id, user_id FROM orders WHERE id = ? AND user_id = ? FOR UPDATE',
      [orderId, userId]
    );
    if (ordRows.length === 0) throw new Error('Order not found.');

    // 2) subtotal จาก order_items
    const [sumRows]: any[] = await conn.query(
      'SELECT COALESCE(SUM(price), 0) AS subtotal FROM order_items WHERE order_id = ?',
      [orderId]
    );
    const subtotal = Number(sumRows[0]?.subtotal ?? 0);

    // 3) ตรวจโค้ดส่วนลด
    const [dcRows]: any[] = await conn.query(
      `SELECT id, code, discount_percent, max_usage, used_count
       FROM discount_codes
       WHERE code = ? FOR UPDATE`,
      [discountCode]
    );
    if (dcRows.length === 0) throw new Error('Invalid discount code.');

    const dc = dcRows[0];
    const remaining = (dc.max_usage ?? 0) - (dc.used_count ?? 0);
    if (remaining <= 0) throw new Error('This discount code has reached its maximum usage.');

    const discountPercent = Number(dc.discount_percent) || 0;
    const discountAmount = Math.max(0, Math.round((subtotal * discountPercent / 100) * 100) / 100);
    const totalPrice = Math.max(0, Math.round((subtotal - discountAmount) * 100) / 100);

    // 4) อัปเดต orders.total_price (❗️ไม่มีคอลัมน์ discount_*)
    await conn.query(
      `UPDATE orders SET total_price = ? WHERE id = ? AND user_id = ?`,
      [totalPrice, orderId, userId]
    );

    // 5) (ตัวเลือก) ตัดโควต้าโค้ดทันที
    await conn.query(
      'UPDATE discount_codes SET used_count = used_count + 1 WHERE id = ?',
      [dc.id]
    );

    await conn.commit();

    return {
      orderId,
      subtotal: Math.round(subtotal * 100) / 100,
      discountCode: dc.code,
      discountPercent,
      discountAmount,
      totalPrice,
    };
  } catch (e) {
    await conn.rollback();
    console.error('[applyDiscountToExistingOrderService] error:', e);
    throw e;
  } finally {
    conn.release();
  }
};
