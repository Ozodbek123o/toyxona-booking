import express from 'express'
import prisma from '../lib/prisma.js'
import { auth, permit } from '../middleware/auth.js'
import { formatHall, formatUser } from '../utils/format.js'
import { createUser, hashPassword } from '../utils/users.js'

const router = express.Router()
router.use(auth, permit('admin'))

router.post('/owners', async (req, res) => {
	try {
		const user = await createUser({
			...req.body,
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
		where: { role: 'owner' },
		select: {
			id: true,
			firstName: true,
			lastName: true,
			email: true,
			username: true,
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
		if (password) data.password = await hashPassword(password)
		if (typeof isVerified === 'boolean') data.isVerified = isVerified

		const existing = await prisma.user.findFirst({
			where: { id: req.params.id, role: 'owner' },
		})
		if (!existing) return res.status(404).json({ message: 'Owner not found' })
		const user = await prisma.user.update({
			where: { id: req.params.id },
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
	const halls = await prisma.hall.count({ where: { ownerId: req.params.id } })
	if (halls > 0)
		return res.status(400).json({
			message: 'Owner has halls — reassign or delete halls first',
		})
	try {
		await prisma.user.delete({
			where: { id: req.params.id, role: 'owner' },
		})
		res.json({ message: 'Owner deleted' })
	} catch {
		res.status(404).json({ message: 'Owner not found' })
	}
})

router.patch('/halls/:id/owner', async (req, res) => {
	const hall = await prisma.hall.update({
		where: { id: req.params.id },
		data: { ownerId: req.body.ownerId || null },
		include: {
			owner: {
				select: {
					id: true,
					firstName: true,
					lastName: true,
					username: true,
					email: true,
				},
			},
		},
	})
	res.json(formatHall(hall))
})

router.patch('/halls/:id/approve', async (req, res) => {
	const hall = await prisma.hall.update({
		where: { id: req.params.id },
		data: { status: 'approved' },
	})
	res.json(formatHall(hall))
})

router.patch('/halls/:id/reject', async (req, res) => {
	const hall = await prisma.hall.update({
		where: { id: req.params.id },
		data: { status: 'pending' },
	})
	res.json(formatHall(hall))
})

export default router
