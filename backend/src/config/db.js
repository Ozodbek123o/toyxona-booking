import prisma from '../lib/prisma.js'

const RETRIES = Number(process.env.DB_CONNECT_RETRIES || 5)
const DELAY_MS = Number(process.env.DB_CONNECT_DELAY_MS || 3000)

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms))
}

export async function connectDb() {
	if (!process.env.DATABASE_URL) {
		throw new Error(
			'DATABASE_URL is required. Set it in server/.env (Render PostgreSQL External URL + ?sslmode=require). See DEPLOY.md.',
		)
	}

	let lastError
	for (let attempt = 1; attempt <= RETRIES; attempt++) {
		try {
			await prisma.$connect()
			console.log('PostgreSQL connected')
			return
		} catch (error) {
			lastError = error
			if (attempt < RETRIES) {
				console.warn(
					`DB connect attempt ${attempt}/${RETRIES} failed, retrying in ${DELAY_MS}ms...`,
				)
				await sleep(DELAY_MS)
			}
		}
	}

	throw new Error(
		`PostgreSQL ulanmadi: ${lastError?.message || lastError}. Render Dashboard → PostgreSQL → Connections → External Database URL ni tekshiring (DB suspend bo‘lgan bo‘lishi mumkin).`,
	)
}

export { prisma }
