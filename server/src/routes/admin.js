import express from 'express'
import prisma from '../lib/prisma.js'
import { auth, permit } from '../middleware/auth.js'
import { formatHall, formatUser } from '../utils/format.js'
import { hallInclude } from '../services/hallService.js'
import { createUser, hashPassword } from '../utils/users.js'

const router = express.Router()
router.use(auth, permit('admin'))

router.post('/owners', async (req, res) => {
	try {
		const user = await createUser({
			...req.body,
			phone: req.body.phone || req.body.phoneNumber,
			role: 'owner',
			isVerified: false,
		})
		res.status(201).json(formatUser(user))
	} catch (error) {
		res.status(400).json({ message: error.message })
	}
})

router.get('/owners', async (req, res) => {
	const owners = await prisma.user.findMany({
		where: { role: 'OWNER' },
		select: {
			id: true,
			firstName: true,
			lastName: true,
			email: true,
			username: true,
			phoneNumber: true,
			role: true,
			isVerified: true,
			createdAt: true,
		},
		orderBy: { createdAt: 'desc' },
	})
	res.json(owners.map(formatUser))
})

router.patch('/owners/:id', async (req, res) => {
	try {
		const { firstName, lastName, email, username, password, isVerified } =
			req.body
		const data = {}
		if (firstName) data.firstName = firstName
		if (lastName) data.lastName = lastName
		if (email) data.email = email.toLowerCase()
		if (username) data.username = username
		if (password) data.passwordHash = await hashPassword(password)
		if (typeof isVerified === 'boolean') data.isVerified = isVerified

		const existing = await prisma.user.findFirst({
			where: { id: Number(req.params.id), role: 'OWNER' },
		})
		if (!existing) return res.status(404).json({ message: 'Owner not found' })
		const user = await prisma.user.update({
			where: { id: existing.id },
			data,
		})
		res.json(formatUser(user))
	} catch (error) {
		if (error.code === 'P2025')
			return res.status(404).json({ message: 'Owner not found' })
		res.status(400).json({ message: error.message })
	}
})

router.delete('/owners/:id', async (req, res) => {
	const ownerId = Number(req.params.id)
	const halls = await prisma.weddingHall.count({ where: { ownerId } })
	if (halls > 0)
		return res.status(400).json({
			message: 'Owner has halls — reassign or delete halls first',
		})
	try {
		await prisma.user.delete({
			where: { id: ownerId },
		})
		res.json({ message: 'Owner deleted' })
	} catch {
		res.status(404).json({ message: 'Owner not found' })
	}
})

router.patch('/halls/:id/owner', async (req, res) => {
	const hall = await prisma.weddingHall.update({
		where: { id: Number(req.params.id) },
		data: { ownerId: Number(req.body.ownerId) },
		include: hallInclude,
	})
	res.json(formatHall(hall))
})

router.patch('/halls/:id/approve', async (req, res) => {
	const hall = await prisma.weddingHall.update({
		where: { id: Number(req.params.id) },
		data: { status: 'APPROVED' },
		include: hallInclude,
	})
	res.json(formatHall(hall))
})

router.patch('/halls/:id/reject', async (req, res) => {
	const hall = await prisma.weddingHall.update({
		where: { id: Number(req.params.id) },
		data: { status: 'PENDING' },
		include: hallInclude,
	})
	res.json(formatHall(hall))
})

export default router
