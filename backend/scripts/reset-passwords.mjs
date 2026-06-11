import 'dotenv/config'
import prisma from '../src/lib/prisma.js'
import { hashPassword } from '../src/utils/users.js'

if (process.env.NODE_ENV === 'production') {
	throw new Error('Refusing to reset passwords in production')
}

const accounts = [
	{ username: 'platform_admin', password: 'Admin12345!' },
	{ username: 'ozod_customer', password: 'User12345!' },
	{ username: 'toyxona_owner', password: 'Owner12345!' },
	{ username: '+998901112233', password: 'User12345!' },
	{ username: 'aziz_owner', password: 'Owner12345!' },
]

if (process.env.RESET_ALL_USERS === 'true') {
	const users = await prisma.user.findMany({
		select: { id: true, username: true, role: true },
	})
	for (const user of users) {
		const password =
			user.role === 'ADMIN'
				? 'Admin12345!'
				: user.role === 'OWNER'
					? 'Owner12345!'
					: 'User12345!'
		const passwordHash = await hashPassword(password)
		await prisma.user.update({
			where: { id: user.id },
			data: { passwordHash, isVerified: true },
		})
		console.log('updated', user.username, user.role)
	}
	await prisma.$disconnect()
	process.exit(0)
}

for (const { username, password } of accounts) {
	const user = await prisma.user.findFirst({ where: { username } })
	if (!user) {
		console.log('skip', username)
		continue
	}
	const passwordHash = await hashPassword(password)
	await prisma.user.update({
		where: { id: user.id },
		data: { passwordHash, isVerified: true },
	})
	console.log('updated', username, user.role)
}

await prisma.$disconnect()
