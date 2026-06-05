import 'dotenv/config'
import prisma from '../src/lib/prisma.js'
import { hashPassword } from '../src/utils/users.js'

const accounts = [
	{ username: 'platform_admin', password: 'Admin12345!' },
	{ username: 'ozod_customer', password: 'User12345!' },
	{ username: 'toyxona_owner', password: 'Owner12345!' },
	{ username: '+998901112233', password: 'User12345!' },
	{ username: 'aziz_owner', password: 'Owner12345!' },
]

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
