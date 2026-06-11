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
	const seedDemo = process.env.SEED_DEMO === 'true'
	const username = process.env.ADMIN_USERNAME || (seedDemo ? 'admin' : null)
	const password =
		process.env.ADMIN_PASSWORD || (seedDemo ? 'Admin12345!' : null)
	const email = (
		process.env.ADMIN_EMAIL || (seedDemo ? 'admin@toyxona.uz' : null)
	)?.toLowerCase()

	if (!username || !password || !email) return
	if (isProduction && password === 'Admin12345!') {
		throw new Error('Refusing to use demo ADMIN_PASSWORD in production')
	}

	const shouldSyncPassword = process.env.SYNC_ADMIN_PASSWORD === 'true'

	let byUsername = await prisma.user.findFirst({ where: { username } })
	let byEmail = await prisma.user.findFirst({ where: { email } })
	let target = byUsername || byEmail

	if (!target) {
		try {
			await createUser({
				firstName: process.env.ADMIN_FIRST_NAME || 'Platform',
				lastName: process.env.ADMIN_LAST_NAME || 'Admin',
				email,
				username,
				password,
				role: 'admin',
				isVerified: true,
			})
			console.log('Admin user created')
			return
		} catch (error) {
			if (error?.code !== 'P2002') throw error
			byUsername = await prisma.user.findFirst({ where: { username } })
			byEmail = await prisma.user.findFirst({ where: { email } })
			target = byUsername || byEmail
			if (!target) throw error
		}
	}

	const data = {
		role: 'ADMIN',
		isVerified: true,
		...(shouldSyncPassword
			? { passwordHash: await hashPassword(password) }
			: {}),
	}

	const usernameTakenByOther = byUsername && byUsername.id !== target.id
	const emailTakenByOther = byEmail && byEmail.id !== target.id
	if (!usernameTakenByOther) data.username = username
	if (!emailTakenByOther) data.email = email

	await prisma.user.update({
		where: { id: target.id },
		data,
	})
	console.log('Admin user ready')
}

async function seedOwner() {
	const seedDemo = process.env.SEED_DEMO === 'true'
	const username =
		process.env.OWNER_USERNAME || (seedDemo ? 'aziz_owner' : null)
	const password =
		process.env.OWNER_PASSWORD || (seedDemo ? 'Owner12345!' : null)
	const email = (
		process.env.OWNER_EMAIL || (seedDemo ? 'owner@toyxona.uz' : null)
	)?.toLowerCase()
	const phone = process.env.OWNER_PHONE || '+998901001001'

	if (!username || !password || !email) return
	if (isProduction && password === 'Owner12345!') {
		throw new Error('Refusing to use demo OWNER_PASSWORD in production')
	}

	const shouldSyncPassword = process.env.SYNC_OWNER_PASSWORD === 'true'

	let byUsername = await prisma.user.findFirst({ where: { username } })
	let byEmail = await prisma.user.findFirst({ where: { email } })
	let target = byUsername || byEmail

	if (!target) {
		try {
			await createUser({
				firstName: process.env.OWNER_FIRST_NAME || 'Toyxona',
				lastName: process.env.OWNER_LAST_NAME || 'Owner',
				email,
				username,
				phone,
				password,
				role: 'owner',
				isVerified: true,
			})
			console.log('Owner user created')
			return
		} catch (error) {
			if (error?.code !== 'P2002') throw error
			byUsername = await prisma.user.findFirst({ where: { username } })
			byEmail = await prisma.user.findFirst({ where: { email } })
			target = byUsername || byEmail
			if (!target) throw error
		}
	}

	const data = {
		role: 'OWNER',
		isVerified: true,
		...(shouldSyncPassword
			? { passwordHash: await hashPassword(password) }
			: {}),
	}

	const usernameTakenByOther = byUsername && byUsername.id !== target.id
	const emailTakenByOther = byEmail && byEmail.id !== target.id
	if (!usernameTakenByOther) data.username = username
	if (!emailTakenByOther) data.email = email

	await prisma.user.update({
		where: { id: target.id },
		data,
	})
	console.log('Owner user ready')
}

async function seedUser() {
	const seedDemo = process.env.SEED_DEMO === 'true'
	const username = process.env.USER_USERNAME || (seedDemo ? 'ozod_user' : null)
	const password = process.env.USER_PASSWORD || (seedDemo ? 'User12345!' : null)
	const email = (
		process.env.USER_EMAIL || (seedDemo ? 'ozod@toyxona.uz' : null)
	)?.toLowerCase()
	const phone = process.env.USER_PHONE || '+998901112233'

	if (!username || !password || !email) return
	if (isProduction && password === 'User12345!') {
		throw new Error('Refusing to use demo USER_PASSWORD in production')
	}

	const shouldSyncPassword = process.env.SYNC_USER_PASSWORD === 'true'

	let byUsername = await prisma.user.findFirst({ where: { username } })
	let byEmail = await prisma.user.findFirst({ where: { email } })
	let target = byUsername || byEmail

	if (!target) {
		try {
			await createUser({
				firstName: process.env.USER_FIRST_NAME || 'Ozod',
				lastName: process.env.USER_LAST_NAME || 'User',
				email,
				username,
				phone,
				password,
				role: 'user',
				isVerified: true,
			})
			console.log('User created')
			return
		} catch (error) {
			if (error?.code !== 'P2002') throw error
			byUsername = await prisma.user.findFirst({ where: { username } })
			byEmail = await prisma.user.findFirst({ where: { email } })
			target = byUsername || byEmail
			if (!target) throw error
		}
	}

	const data = {
		role: 'CUSTOMER',
		isVerified: true,
		...(shouldSyncPassword
			? { passwordHash: await hashPassword(password) }
			: {}),
	}

	const usernameTakenByOther = byUsername && byUsername.id !== target.id
	const emailTakenByOther = byEmail && byEmail.id !== target.id
	if (!usernameTakenByOther) data.username = username
	if (!emailTakenByOther) data.email = email

	await prisma.user.update({
		where: { id: target.id },
		data,
	})
	console.log('User ready')
}
const port = process.env.PORT || 5000
app.listen(port, () => {
	console.log(`API running on ${port}`)
	connectDb()
		.then(async () => {
			try {
				await seedAdmin()
			} catch (e) {
				console.error('⚠️ Admin bootstrap error:', e.message)
			}
			try {
				await seedOwner()
			} catch (e) {
				console.error('⚠️ Owner bootstrap error:', e.message)
			}
			try {
				await seedUser()
			} catch (e) {
				console.error('⚠️ User bootstrap error:', e.message)
			}
			if (process.env.SEED_DEMO === 'true') await seedDemoData()
		})
		.catch(error => {
			console.error('⚠️ Database connection error:', error.message)
			console.error(
				'The server is running, but database-dependent features will fail.',
			)
		})
})
