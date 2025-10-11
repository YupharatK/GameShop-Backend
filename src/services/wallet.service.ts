// src/services/wallet.service.ts
import pool from '../config/database.js';

// 3.1 & 3.3: ดึง Wallet Balance และ Transaction History ของผู้ใช้
export const getUserWalletDataService = async (userId: number) => {
  const connection = await pool.getConnection();
  try {
    // ดึง Wallet Balance
    const [userRows]: any[] = await connection.query("SELECT wallet_balance FROM users WHERE id = ?", [userId]);
    if (userRows.length === 0) {
      throw new Error('User not found');
    }
    const balance = userRows[0].wallet_balance;

    // ดึง Transaction History 10 รายการล่าสุด
    const [transactionRows] = await connection.query(
      "SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 10",
      [userId]
    );

    return {
      wallet_balance: balance,
      transaction_history: transactionRows
    };
  } catch (error) {
    console.error("Error fetching user wallet data:", error);
    throw error;
  } finally {
    connection.release();
  }
};

// 3.2: เติมเงินเข้า Wallet
export const topupWalletService = async (userId: number, amount: number) => {
  if (amount <= 0) {
    throw new Error('Top-up amount must be positive.');
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. เพิ่มเงินในตาราง users
    await connection.query("UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?", [amount, userId]);

    // 2. บันทึก transaction
    const description = `Added funds to wallet`;
    await connection.query(
      "INSERT INTO transactions (user_id, type, amount, description) VALUES (?, 'TOPUP', ?, ?)",
      [userId, amount, description]
    );

    await connection.commit();

    // ดึงข้อมูล wallet ล่าสุดกลับไป
    const [rows]: any[] = await connection.query("SELECT wallet_balance FROM users WHERE id = ?", [userId]);
    return { new_balance: rows[0].wallet_balance };

  } catch (error) {
    await connection.rollback();
    console.error("Error during wallet top-up:", error);
    throw error;
  } finally {
    connection.release();
  }
};