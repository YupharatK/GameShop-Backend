//สมัครสมาชิก
// src/services/user.service.ts
import db from '../config/database.js';
import type { UserRegistrationData } from '../types/user.types.js'; // เราจะสร้าง type นี้ในขั้นตอนต่อไป
import type { ResultSetHeader } from 'mysql2';

export const UserService = {
  // ค้นหาผู้ใช้ด้วยอีเมล เพื่อป้องกันการสมัครซ้ำ
  findByEmail: async (email: string) => {
    const query = 'SELECT * FROM users WHERE email = ?';
    const [users] = await db.query(query, [email]);
    // @ts-ignore
    return users[0] || null;
  },

  register: async (userData: UserRegistrationData): Promise<number> => {
    const { username, email, password_hash, profile_image_url } = userData;

    const query = `
      INSERT INTO users (username, email, password_hash, profile_image_url, role) 
      VALUES (?, ?, ?, ?, 'USER')
    `;

    const [result] = await db.query<ResultSetHeader>(query, [username, email, password_hash, profile_image_url]);

    return result.insertId;
  }
};