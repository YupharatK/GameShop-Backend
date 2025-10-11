// src/services/order.service.ts
import pool from '../config/database.js';

export const createOrderService = async (userId: number, items: any[]) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. คำนวณราคารวมจาก items ที่ส่งมา
    const totalPrice = items.reduce((sum, item) => sum + parseFloat(item.price), 0);

    // 2. ดึงยอดเงินปัจจุบันของ User และทำการ Lock แถวข้อมูล (FOR UPDATE)
    // เพื่อป้องกัน Race Condition (ข้อ 3.6)
    const [userRows]: any[] = await connection.query("SELECT wallet_balance FROM users WHERE id = ? FOR UPDATE", [userId]);
    if (userRows.length === 0) throw new Error("User not found.");
    
    const currentBalance = parseFloat(userRows[0].wallet_balance);

    // 3. ตรวจสอบว่ามีเงินพอหรือไม่ (ข้อ 3.5)
    if (currentBalance < totalPrice) {
      throw new Error("Insufficient funds.");
    }

    // 4. ตัดเงินจาก Wallet
    const newBalance = currentBalance - totalPrice;
    await connection.query("UPDATE users SET wallet_balance = ? WHERE id = ?", [newBalance, userId]);

    // 5. สร้าง Order ใหม่ในตาราง 'orders'
    const [orderResult]: any = await connection.query(
      "INSERT INTO orders (user_id, total_price) VALUES (?, ?)",
      [userId, totalPrice]
    );
    const newOrderId = orderResult.insertId;

    // 6. เพิ่มรายการเกมลงใน 'order_items' และ 'UserLibrary'
    for (const item of items) {
      const gameId = item.id;
      const price = parseFloat(item.price);
      // เพิ่มใน order_items
      await connection.query(
        "INSERT INTO order_items (order_id, game_id, price) VALUES (?, ?, ?)",
        [newOrderId, gameId, price]
      );
      // เพิ่มใน UserLibrary
      await connection.query(
        "INSERT INTO UserLibrary (user_id, game_id) VALUES (?, ?)",
        [userId, gameId]
      );
      // (Optional) อัปเดตยอดขายในตาราง rankings
      await connection.query("UPDATE rankings SET sales_count = sales_count + 1 WHERE game_id = ?", [gameId]);
    }

    // 7. บันทึก Transaction การซื้อ (ข้อ 3.3)
    const description = `Purchase of ${items.length} game(s)`;
    await connection.query(
      "INSERT INTO transactions (user_id, type, amount, description) VALUES (?, 'PURCHASE', ?, ?)",
      [userId, -totalPrice, description] // ยอดเงินเป็นลบ
    );

    await connection.commit();
    return { success: true, orderId: newOrderId, newBalance: newBalance };

  } catch (error) {
    await connection.rollback(); // ถ้ามีข้อผิดพลาด ให้ยกเลิกทั้งหมด
    console.error("Error creating order:", error);
    throw error;
  } finally {
    connection.release();
  }
};