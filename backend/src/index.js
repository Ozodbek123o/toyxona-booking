import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import rateLimit from 'express-rate-limit'
import fs from 'fs'
import helmet from 'helmet'
import path from 'path'
import { fileURLToPath } from 'url'
import { connectDb } from './config/db.js'
import prisma from './lib/prisma.js'
import adminRoutes from './routes/admin.js'
import authRoutes from './routes/auth.js'
import bookingRoutes from './routes/bookings.js'
import hallRoutes from './routes/halls.js'
import { seedDemoData } from './utils/seed.js'
import { createUser } from './utils/users.js'

dotenv.config()
const app = express()
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const uploadsDir = path.join(__dirname, '..', 'uploads')
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })

const isProduction = process.env.NODE_ENV === 'production'
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
	.split(',')
	.map(origin => origin.trim())
	.filter(Boolean)

if (!process.env.JWT_SECRET) {
	if (isProduction) {
		throw new Error('JWT_SECRET is required in production')
	} else {
		console.warn(
			'⚠️ WARNING: JWT_SECRET is not set. Using default secret for development.',
		)
		process.env.JWT_SECRET = 'dev-secret-key-12345'
	}
}
if (isProduction && process.env.SEED_DEMO === 'true') {
	throw new Error('SEED_DEMO must be false in production')
}

app.set('trust proxy', 1)
app.use(
	helmet({
		crossOriginResourcePolicy: { policy: 'cross-origin' },
	}),
)
app.use(
	cors({
		origin: '*',
		methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
		allowedHeaders: ['Content-Type', 'Authorization'],
		credentials: true,
	}),
)
app.use(express.json({ limit: process.env.JSON_LIMIT || '1mb' }))
app.use(
	'/uploads',
	express.static(uploadsDir, { maxAge: isProduction ? '7d' : 0 }),
)

const apiLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	limit: Number(process.env.RATE_LIMIT_MAX || 300),
	standardHeaders: 'draft-8',
	legacyHeaders: false,
})
const authLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	limit: Number(process.env.AUTH_RATE_LIMIT_MAX || 30),
	standardHeaders: 'draft-8',
	legacyHeaders: false,
})

app.use('/api', apiLimiter)
app.use('/api/auth', authLimiter, authRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/halls', hallRoutes)
app.use('/api/bookings', bookingRoutes)
app.get('/api/health', async (req, res) => {
	try {
		await prisma.$queryRaw`SELECT 1`
		res.json({ ok: true, database: 'postgresql' })
	} catch (e) {
		res.status(500).json({ ok: false, message: e.message })
	}
})

const clientDist = path.join(__dirname, '..', '..', 'client', 'dist')
if (isProduction && fs.existsSync(clientDist)) {
	app.use(express.static(clientDist))
	app.get('*', (req, res, next) => {
		if (req.path.startsWith('/api')) return next()
		res.sendFile(path.join(clientDist, 'index.html'))
	})
}

app.use((err, req, res, next) => {
	if (err?.message === 'Not allowed by CORS') {
		return res.status(403).json({ message: 'Origin is not allowed' })
	}
	if (err?.code === 'LIMIT_FILE_SIZE') {
		return res.status(413).json({ message: 'Uploaded image is too large' })
	}
	if (err?.code === 'LIMIT_FILE_COUNT') {
		return res.status(413).json({ message: 'Too many uploaded images' })
	}
	const message = isProduction ? 'Server error' : err.message
	return res.status(err.status || 500).json({ message })
})

async function seedAdmin() {
	const username = 'boshliq'
	const password = 'ToyxonaPassword2026!'
	const email = 'admin@toyxona.uz'

	try {
		// 1. Bazada oldindan mavjud bo'lgan eski adminlarni tozalaymiz
		await prisma.user.deleteMany({
			where: {
				OR: [{ username }, { email }],
			},
		})

		// 2. Yangi va ishlaydigan admin akkauntini yaratamiz
		await createUser({
			firstName: 'Platform',
			lastName: 'Admin',
			email: email,
			username: username,
			password: password,
			role: 'admin',
			isVerified: true,
		})

		console.log('🔥 ADMIN FOYDALANUVCHISI MUVAFFAQIYATLI YARATILDI!')
		console.log(`Login: ${username} | Parol: ${password}`)
	} catch (error) {
		console.error('⚠️ Admin yaratishda xatolik:', error.message)
	}
}
const port = process.env.PORT || 5000
app.listen(port, () => {
	console.log(`API running on ${port}`)
	connectDb()
		.then(seedAdmin)
		.then(() => {
			if (process.env.SEED_DEMO === 'true') return seedDemoData()
			return null
		})
		.catch(error => {
			console.error('⚠️ Database connection error:', error.message)
			console.error(
				'The server is running, but database-dependent features will fail.',
			)
		})
})
