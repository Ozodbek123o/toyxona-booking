import express from 'express'
import jwt from 'jsonwebtoken'
import prisma from '../lib/prisma.js'
import { auth } from '../middleware/auth.js'
import { formatUser } from '../utils/format.js'
import {
	comparePassword,
	createUser,
	findUserByLogin,
} from '../utils/users.js'
import { sendOtp } from '../utils/mail.js'

const router = express.Router()

function jwtSecret() {
	if (process.env.JWT_SECRET) return process.env.JWT_SECRET
	throw new Error('JWT_SECRET is required')
}

const tokenFor = user =>
	jwt.sign({ id: user.id, role: user.role }, jwtSecret(), { expiresIn: '7d' })
const safe = user => formatUser(user)

router.post('/register', async (req, res) => {
	try {
		const { firstName, lastName, phone, password } = req.body
		if (!firstName || !lastName || !phone || !password)
			return res.status(400).json({ message: 'All fields are required' })
		if (String(password).length < 8)
			return res
				.status(400)
				.json({ message: 'Password must be at least 8 characters' })
		const username = phone
		const exists = await prisma.user.findFirst({
			where: { OR: [{ phone }, { username }] },
		})
		if (exists) return res.status(409).json({ message: 'User already exists' })
		const user = await createUser({
			firstName,
			lastName,
			phone,
			username,
			password,
			role: 'user',
			isVerified: true,
		})
		res.status(201).json({ token: tokenFor(user), user: safe(user) })
	} catch (error) {
		res.status(400).json({ message: error.message })
	}
})

router.post('/login', async (req, res) => {
	try {
		const { login, username, phone, email, password } = req.body
		const key = login || username || phone || email
		if (!key || !password)
			return res
				.status(400)
				.json({ message: 'Login and password are required' })
		const user = await findUserByLogin(key)
		if (!user || !(await comparePassword(user, password)))
			return res.status(401).json({ message: 'Login or password incorrect' })
		if (user.role === 'owner' && !user.isVerified) {
			if (!user.email)
				return res
					.status(400)
					.json({ message: 'Owner email is required for OTP' })
			const otp = String(Math.floor(100000 + Math.random() * 900000))
			await prisma.user.update({
				where: { id: user.id },
				data: {
					otpCode: otp,
					otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
				},
			})
			await sendOtp(user.email, otp)
			return res.json({
				requiresOtp: true,
				userId: user.id,
				message: 'OTP sent to email',
			})
		}
		res.json({ token: tokenFor(user), user: safe(user) })
	} catch (error) {
		res.status(400).json({ message: error.message })
	}
})

router.post('/verify-otp', async (req, res) => {
	const { userId, otp } = req.body
	if (!userId || !otp)
		return res.status(400).json({ message: 'User and OTP are required' })
	const user = await prisma.user.findUnique({ where: { id: userId } })
	if (
		!user ||
		user.otpCode !== otp ||
		!user.otpExpiresAt ||
		user.otpExpiresAt < new Date()
	)
		return res.status(400).json({ message: 'Invalid OTP' })
	const updated = await prisma.user.update({
		where: { id: userId },
		data: { isVerified: true, otpCode: null, otpExpiresAt: null },
	})
	res.json({ token: tokenFor(updated), user: safe(updated) })
})

router.get('/me', auth, (req, res) => res.json({ user: req.user }))

export default router
