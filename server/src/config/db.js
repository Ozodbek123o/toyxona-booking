import prisma from '../lib/prisma.js'

export async function connectDb() {
	if (!process.env.DATABASE_URL) {
		throw new Error(
			'DATABASE_URL is required. Set it in server/.env (Render PostgreSQL connection string).',
		)
	}
	await prisma.$connect()
	console.log('PostgreSQL connected (Render)')
}

export { prisma }
