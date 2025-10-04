// src/services/user.service.ts
import bcrypt from 'bcrypt';
// 1. Import pool ที่เรารองรับ promise อยู่แล้ว จากไฟล์ config
import pool from '../config/database.js';

export const createUserService = async (userData: any) => {
  const { username, email, password, profileImage } = userData;

  // ... (ส่วนของการ hash รหัสผ่านเหมือนเดิม)
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const newUser = {
    username,
    email,
    password: hashedPassword,
    profile_image: profileImage,
    role: 'USER',
    wallet_balance: 0.00
  };

  // --- ส่วนบันทึกข้อมูลลง Database (MySQL) ---
  const sql = "INSERT INTO users (username, email, password, profile_image, role, wallet_balance) VALUES (?, ?, ?, ?, ?, ?)";
  try {
    // 2. เรียกใช้ .query() ได้โดยตรง ไม่ต้องมี .promise() อีกต่อไป
    const [result] = await pool.query(sql, [
      newUser.username,
      newUser.email,
      newUser.password,
      newUser.profile_image,
      newUser.role,
      newUser.wallet_balance
    ]);
    // คุณสามารถใช้ result.insertId ได้ถ้าต้องการ
  } catch (dbError) {
    // ส่ง error กลับไปให้ controller จัดการ
    throw dbError;
  }

  console.log('User data to be inserted:', newUser);

  const { password: _, ...userToReturn } = newUser;
  return userToReturn;
};