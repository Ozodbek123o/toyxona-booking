import cors from 'cors'
import dotenv from 'dotenv'
import express, { Request, Response } from 'express'

// .env fayldagi o'zgaruvchilarni o'qish
dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// Middleware'lar
app.use(cors()) // Boshqa domenlardan keladigan so'rovlarga ruxsat berish
app.use(express.json()) // Kelayotgan JSON ma'lumotlarni o'qish

// Test uchun oddiy API
app.get('/', (req: Request, res: Response) => {
	res.json({
		message: "To'yxona bron qilish API muvaffaqiyatli ishlamoqda! 🚀",
	})
})

// Serverni ishga tushirish
app.listen(PORT, () => {
	console.log(`✅ Server ${PORT}-portda ishga tushdi.`)
})
