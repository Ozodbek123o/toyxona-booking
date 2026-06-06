import bcrypt from 'bcryptjs'
import prisma from '../lib/prisma.js'
import { roleToApi, roleToDb } from './dbEnums.js'
import { formatUser } from './format.js'

export async function hashPassword(password) {
	return bcrypt.hash(password, 12)
}

export async function comparePassword(user, password) {
	return bcrypt.compare(password, user.passwordHash)
}

export function phoneToEmail(phone) {
	const digits = String(phone).replace(/\D/g, '')
	return `user_${digits || 'local'}@toyxona.local`
}

export function phoneFromLoginKey(key) {
	const digits = String(key || '').replace(/\D/g, '')
	if (digits.length >= 9) return `+998${digits.slice(-9)}`
	return null
}

export async function createUser(data) {
	const passwordHash = await hashPassword(data.password)
	const username = data.username || data.phone || data.phoneNumber
	const phoneNumber =
		data.phone ||
		data.phoneNumber ||
		phoneFromLoginKey(username) ||
		phoneFromLoginKey(data.email) ||
		`+99890${String(Date.now()).slice(-7)}`
	const email = (data.email || phoneToEmail(phoneNumber)).toLowerCase()

	const user = await prisma.user.create({
		data: {
			firstName: data.firstName,
			lastName: data.lastName,
			phoneNumber,
			email,
			username,
			passwordHash,
			role: roleToDb(data.role || 'user'),
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
			OR: [{ username: k }, { phoneNumber: k }, { email: lower }],
		},
	})
}

export async function getUserById(id) {
	const userId = Number(id)
	if (!Number.isInteger(userId)) return null
	const user = await prisma.user.findUnique({ where: { id: userId } })
	return user ? formatUser(user) : null
}

export async function getAuthUser(id) {
	const user = await prisma.user.findUnique({
		where: { id: Number(id) },
		select: {
			id: true,
			firstName: true,
			lastName: true,
			phoneNumber: true,
			email: true,
			username: true,
			role: true,
			isVerified: true,
		},
	})
	if (!user) return null
	return {
		id: user.id,
		_id: user.id,
		firstName: user.firstName,
		lastName: user.lastName,
		phone: user.phoneNumber,
		email: user.email,
		username: user.username,
		role: roleToApi(user.role),
		isVerified: user.isVerified,
	}
}
