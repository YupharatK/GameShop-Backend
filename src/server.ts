// src/server.ts
import express from 'express';
import cors from 'cors'; 
import authRoutes from './routes/auth.routes.js';
// import userRoutes from './routes/user.routes'; // ถ้ามี

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // อนุญาตให้ Front-end เรียก API ได้
app.use(express.json()); // สำหรับอ่าน JSON body
app.use(express.urlencoded({ extended: true })); // สำหรับอ่าน form data (ที่ไม่ใช่ไฟล์)

// Static file serving for uploaded images
// ทำให้สามารถเข้าถึงไฟล์ได้ผ่าน URL เช่น http://your-api.com/public/uploads/filename.jpg
app.use('/public', express.static('public'));

app.get('/', (req, res) => {
  res.send('<h1>Welcome to the GameShop API!</h1><p>Server is running correctly.</p>');
});
// API Routes
app.use('/api/auth', authRoutes);
// app.use('/api/users', userRoutes); // ถ้ามี

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});