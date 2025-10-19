// src/services/order.service.ts
import pool from '../config/database.js';

export interface CheckoutItem {
  id: number | string;
  price: number | string; // อาจมาจาก FE เป็น string
  quantity?: number;      // ถ้ามีระบบจำนวน (ค่า default = 1)
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

export const createOrderService = async (
  userId: number,
  items: CheckoutItem[],
  discountCode?: string | null
): Promise<CreateOrderResult> => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Cart is empty.');
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // ---------- 1) คำนวณ Subtotal ----------
    const subtotal = items.reduce((sum, item) => {
      const qty = item.quantity != null ? Number(item.quantity) : 1;
      const price = Number(item.price);
      if (!Number.isFinite(price) || price < 0) {
        throw new Error('Invalid item price.');
      }
      return sum + price * qty;
    }, 0);

    // ---------- 2) เตรียมส่วนลด (ถ้ามี) ----------
    let appliedCode: string | null = null;
    let discountPercent = 0; // เป็นเปอร์เซ็นต์ เช่น 10 = 10%
    let discountAmount = 0;

    if (discountCode) {
      // ล็อกแถวโค้ดเพื่อตรวจสิทธิ์คงเหลือ ป้องกัน race condition
      const [rows]: any[] = await connection.query(
        `SELECT id, code, discount_percent, max_usage, used_count
         FROM discount_codes
         WHERE code = ? FOR UPDATE`,
        [discountCode]
      );

      if (rows.length === 0) {
        throw new Error('Invalid discount code.');
      }

      const dc = rows[0];
      const remaining = (dc.max_usage ?? 0) - (dc.used_count ?? 0);
      if (remaining <= 0) {
        throw new Error('This discount code has reached its maximum usage.');
      }

      appliedCode = dc.code;
      discountPercent = Number(dc.discount_percent) || 0;
      // คำนวณส่วนลดจาก subtotal
      discountAmount = Math.max(0, Math.round((subtotal * discountPercent / 100) * 100) / 100);
    }

    // ---------- 3) Total ที่จะตัดเงินจริง ----------
    const totalToCharge = Math.max(0, Math.round((subtotal - discountAmount) * 100) / 100);

    // ---------- 4) ล็อกยอดเงินผู้ใช้ (FOR UPDATE) ----------
    const [userRows]: any[] = await connection.query(
      'SELECT wallet_balance FROM users WHERE id = ? FOR UPDATE',
      [userId]
    );
    if (userRows.length === 0) throw new Error('User not found.');

    const currentBalance = Number(userRows[0].wallet_balance);
    if (!Number.isFinite(currentBalance)) {
      throw new Error('Invalid wallet balance.');
    }

    if (currentBalance < totalToCharge) {
      throw new Error('Insufficient funds.');
    }

    // ---------- 5) ตัดเงินจาก Wallet ----------
    const newBalance = Math.round((currentBalance - totalToCharge) * 100) / 100;
    await connection.query(
      'UPDATE users SET wallet_balance = ? WHERE id = ?',
      [newBalance, userId]
    );

    // ---------- 6) สร้าง Order ----------
    const [orderResult]: any = await connection.query(
      `INSERT INTO orders
        (user_id, total_price, discount_code, discount_percent, discount_amount)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, totalToCharge, appliedCode, discountPercent, discountAmount]
    );
    const newOrderId = orderResult.insertId;

    // ---------- 7) เพิ่มรายการเกมลง order_items และ UserLibrary + rankings ----------
    for (const item of items) {
      const gameId = item.id;
      const qty = item.quantity != null ? Number(item.quantity) : 1;
      const unitPrice = Number(item.price);
      const lineAmount = Math.round(unitPrice * qty * 100) / 100;

      // order_items (ถ้าตารางมี quantity ให้ใส่ด้วย)
      await connection.query(
        'INSERT INTO order_items (order_id, game_id, price) VALUES (?, ?, ?)',
        [newOrderId, gameId, lineAmount]
      );

      // UserLibrary (ป้องกันซ้ำด้วย UNIQUE(user_id, game_id) ที่ DB ถ้าเป็นไปได้)
      await connection.query(
        'INSERT INTO UserLibrary (user_id, game_id) VALUES (?, ?)',
        [userId, gameId]
      );

      // rankings: เพิ่มยอดขาย
      await connection.query(
        'UPDATE rankings SET sales_count = sales_count + 1 WHERE game_id = ?',
        [gameId]
      );
    }

    // ---------- 8) ถ้ามีส่วนลด: อัปเดต used_count ----------
    if (appliedCode) {
      await connection.query(
        'UPDATE discount_codes SET used_count = used_count + 1 WHERE code = ?',
        [appliedCode]
      );
    }

    // ---------- 9) บันทึก TRANSACTION การซื้อ ----------
    const description = `Purchase of ${items.length} game(s)${
      appliedCode ? ` with discount ${appliedCode} (-${discountPercent}%)` : ''
    }`;
    await connection.query(
      "INSERT INTO transactions (user_id, type, amount, description) VALUES (?, 'PURCHASE', ?, ?)",
      [userId, -totalToCharge, description] // amount ติดลบเพื่อบันทึกการตัดเงิน
    );

    await connection.commit();

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
  } catch (error) {
    await connection.rollback();
    console.error('[createOrderService] error:', error);
    throw error;
  } finally {
    connection.release();
  }
};
