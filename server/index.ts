import cors from 'cors'
import dotenv from 'dotenv'
import type { Request, Response } from 'express'
import express from 'express'

// Routerlarni import qilish (Loyiha strukturasiga mos holda)
import authRoutes from './routes/auth.js' // src/routes/auth.ts (yoki auth.js) fayli uchun
import hallRoutes from './routes/halls.js' // src/routes/halls.ts (yoki halls.js) fayli uchun

// .env fayldagi o'zgaruvchilarni o'qish (PORT va DATABASE_URL uchun)
dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// ==========================================
// Middleware'lar
// ==========================================
app.use(cors()) // Vercel frontendidan keladigan so'rovlarga ruxsat berish
app.use(express.json()) // Kelayotgan JSON formatdagi ma'lumotlarni o'qish

// ==========================================
// API Routerlarini ulash (Frontend so'rovlariga moslangan)
// ==========================================

// 1. To'yxonalar uchun yo'nalish (GET /halls va GET /halls/stats/overview)
app.use('/halls', hallRoutes)

// 2. Foydalanuvchilar va Autentifikatsiya uchun yo'nalish (POST /auth/register va /auth/login)
app.use('/auth', authRoutes)

// ==========================================
// Test va Tekshirish uchun Asosiy Yo'nalish
// ==========================================
app.get('/', (req: Request, res: Response) => {
	res.json({
		status: 'success',
		message: "Toshkent To'yxona bron qilish API muvaffaqiyatli ishlamoqda! 🚀",
		timestamp: new Date(),
	})
})

// Serverni ishga tushirish
app.listen(PORT, () => {
	console.log(`✅ Server backend ${PORT}-portda muvaffaqiyatli ishga tushdi.`)
})
