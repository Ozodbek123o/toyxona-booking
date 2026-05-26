import bcrypt from 'bcryptjs'
import prisma from '../lib/prisma.js'
import { formatUser } from './format.js'

export async function hashPassword(password) {
	return bcrypt.hash(password, 12)
}

export async function comparePassword(user, password) {
	return bcrypt.compare(password, user.password)
}

export async function createUser(data) {
	const password = await hashPassword(data.password)
	const user = await prisma.user.create({
		data: {
			firstName: data.firstName,
			lastName: data.lastName,
			phone: data.phone || null,
			email: data.email?.toLowerCase() || null,
			username: data.username || null,
			password,
			role: data.role || 'user',
			isVerified: data.isVerified ?? false,
		},
	})
	return user
}

export async function findUserByLogin(key) {
	if (!key) return null
	const k = String(key).trim()
	const lower = k.toLowerCase()
	return prisma.user.findFirst({
		where: {
			OR: [{ username: k }, { phone: k }, { email: lower }],
		},
	})
}

export async function getUserById(id) {
	const user = await prisma.user.findUnique({ where: { id } })
	return user ? formatUser(user) : null
}

export async function getAuthUser(id) {
	const user = await prisma.user.findUnique({
		where: { id },
		select: {
			id: true,
			firstName: true,
			lastName: true,
			phone: true,
			email: true,
			username: true,
			role: true,
			isVerified: true,
		},
	})
	if (!user) return null
	return { ...user, _id: user.id }
}
