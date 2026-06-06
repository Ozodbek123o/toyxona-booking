import prisma from '../src/lib/prisma.js'

const users = await prisma.user.findMany({
	select: { id: true, username: true, role: true, email: true },
})
console.log(users)
await prisma.$disconnect()
