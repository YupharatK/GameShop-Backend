// src/config/database.ts
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// สั่งให้ dotenv โหลดค่าจากไฟล์ .env เข้ามาใน process.env
dotenv.config();

// สร้าง Connection Pool เพื่อให้สามารถใช้ connection ซ้ำได้
// ซึ่งมีประสิทธิภาพดีกว่าการสร้าง connection ใหม่ทุกครั้งที่ query
const pool = mysql.createPool({
  host: process.env.DB_HOST || '',
  user: process.env.DB_USER || '',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || '',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// ส่วนนี้เป็นโค้ดสำหรับทดสอบว่าสามารถเชื่อมต่อกับฐานข้อมูลได้สำเร็จหรือไม่
// เมื่อเซิร์ฟเวอร์เริ่มทำงาน
pool.getConnection()
  .then(connection => {
    console.log('Database connected successfully!');
    connection.release(); // คืน connection กลับเข้า pool
  })
  .catch(error => {
    console.error('Failed to connect to the database:', error);
  });

// Export pool เพื่อให้ไฟล์อื่น ๆ ในโปรเจกต์สามารถนำไปใช้ query ข้อมูลได้
export default pool;