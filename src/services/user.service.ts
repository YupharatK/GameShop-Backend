// src/services/user.service.ts
import bcrypt from 'bcrypt';
// 1. Import pool ที่เรารองรับ promise อยู่แล้ว จากไฟล์ config
import pool from '../config/database.js';

export const createUserService = async (userData: any) => {
  const { username, email, password, profileImage } = userData;

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // --- ส่วนบันทึกข้อมูลลง Database (MySQL) ---
  // 1. SQL INSERT ไม่ต้องมีคอลัมน์ id
  const sql = "INSERT INTO users (username, email, password, profile_image, role, wallet_balance) VALUES (?, ?, ?, ?, ?, ?)";
  
  try {
    // 2. ส่งข้อมูลไป 6 ค่า (ไม่ต้องส่ง id)
    const [result]: any = await pool.query(sql, [
      username,
      email,
      hashedPassword,
      profileImage,
      'USER',   // กำหนดค่า role โดยตรง
      0.00      // กำหนดค่า wallet โดยตรง
    ]);
    
    // 3. ดึง ID ที่ Database สร้างขึ้นมาใหม่ จากผลลัพธ์ของการ query
    const newUserId = result.insertId;

    // 4. สร้าง Object ที่จะส่งกลับ โดยใช้ ID จริงจาก Database
    const userToReturn = {
        id: newUserId,
        username: username,
        email: email,
        profile_image: profileImage,
        role: 'USER',
        wallet_balance: 0.00
    };

    return userToReturn; // 5. ส่ง object ที่สมบูรณ์กลับไป

  } catch (dbError) {
    console.error("Database error in createUserService:", dbError);
    throw dbError;
  }
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
    user.wallet_balance = parseFloat(user.wallet_balance);
    // 4. ถ้ารหัสผ่านถูกต้อง ให้ลบ property password ออกก่อนส่งข้อมูลกลับ
    const { password, ...userToReturn } = user;
    return userToReturn;

    

  } catch (dbError) {
    // ส่งต่อ error ที่เกิดขึ้น
    throw dbError;
  }
};