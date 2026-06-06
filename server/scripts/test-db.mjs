import dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'

dotenv.config()

const url = process.env.DATABASE_URL
if (!url) {
	console.error('FAIL: DATABASE_URL topilmadi (server/.env)')
	process.exit(1)
}

if (url.includes('render.com') && !url.includes('sslmode=')) {
	process.env.DATABASE_URL = `${url}${url.includes('?') ? '&' : '?'}sslmode=require`
}

const prisma = new PrismaClient()
try {
	await prisma.$connect()
	const halls = await prisma.weddingHall.count()
	const users = await prisma.user.count()
	console.log(`OK: PostgreSQL ulandi — ${halls} ta to'yxona, ${users} ta foydalanuvchi`)
} catch (error) {
	console.error('FAIL:', error.message)
	console.error(
		"\nRender Dashboard → PostgreSQL → Connections → External Database URL ni yangilang.\nFree rejimda DB uzoq vaqt ishlatilmasa suspend bo'ladi — 'Resume' tugmasini bosing.",
	)
	process.exit(1)
} finally {
	await prisma.$disconnect()
}
