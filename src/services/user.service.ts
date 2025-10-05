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

export const authenticateUser = async (email: string, password_plain: string) => {
  // 1. ค้นหาผู้ใช้ด้วย email
  const sql = "SELECT * FROM users WHERE email = ?";
  
  // ใช้ try...catch เพื่อความปลอดภัย
  try {
    const [rows]: any[] = await pool.query(sql, [email]);

    // 2. ตรวจสอบว่ามีผู้ใช้นี้ในระบบหรือไม่
    if (rows.length === 0) {
      // ไม่พบผู้ใช้ -> โยน Error
      throw new Error('Invalid credentials');
    }

    const user = rows[0];

    // 3. เปรียบเทียบรหัสผ่านที่ผู้ใช้ส่งมา กับ hash ในฐานข้อมูล
    const isMatch = await bcrypt.compare(password_plain, user.password);

    if (!isMatch) {
      // ถ้ารหัสผ่านไม่ตรงกัน -> โยน Error
      throw new Error('Invalid credentials');
    }

    // 4. ถ้ารหัสผ่านถูกต้อง ให้ลบ property password ออกก่อนส่งข้อมูลกลับ
    const { password, ...userToReturn } = user;
    return userToReturn;

  } catch (dbError) {
    // ส่งต่อ error ที่เกิดขึ้น
    throw dbError;
  }
};