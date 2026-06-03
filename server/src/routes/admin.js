import express from 'express'
import prisma from '../lib/prisma.js'
import { auth, permit } from '../middleware/auth.js'
import { formatHall, formatUser } from '../utils/format.js'
import { toId } from '../utils/hall.js'
import { createUser, hashPassword } from '../utils/users.js'

const router = express.Router()
router.use(auth, permit('admin'))

const isMissingRecord = error => error?.code === 'P2025'

router.post('/owners', async (req, res) => {
	try {
		const { firstName, lastName, email, phone, username, password } = req.body
		if (!firstName || !lastName || !email || !phone || !username || !password)
			return res.status(400).json({ message: 'All fields are required' })
		if (String(password).length < 8)
			return res
				.status(400)
				.json({ message: 'Password must be at least 8 characters' })
		const user = await createUser({
			firstName,
			lastName,
			email,
			phone,
			username,
			password,
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
			phone: true,
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
		const id = toId(req.params.id)
		if (!id) return res.status(404).json({ message: 'Owner not found' })
		const { firstName, lastName, email, username, phone, password, isVerified } =
			req.body
		const data = {}
		if (firstName) data.firstName = firstName
		if (lastName) data.lastName = lastName
		if (email) data.email = email.toLowerCase()
		if (username) data.username = username
		if (phone) data.phone = phone
		if (password) {
			if (String(password).length < 8)
				return res
					.status(400)
					.json({ message: 'Password must be at least 8 characters' })
			data.password = await hashPassword(password)
		}
		if (typeof isVerified === 'boolean') data.isVerified = isVerified

		const existing = await prisma.user.findFirst({
			where: { id, role: 'owner' },
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
	const id = toId(req.params.id)
	if (!id) return res.status(404).json({ message: 'Owner not found' })
	const owner = await prisma.user.findFirst({
		where: { id, role: 'owner' },
	})
	if (!owner) return res.status(404).json({ message: 'Owner not found' })
	const halls = await prisma.hall.count({ where: { ownerId: owner.id } })
	if (halls > 0)
		return res.status(400).json({
			message: 'Owner has halls — reassign or delete halls first',
		})
	try {
		await prisma.user.delete({
			where: { id: owner.id },
		})
		res.json({ message: 'Owner deleted' })
	} catch {
		res.status(404).json({ message: 'Owner not found' })
	}
})

router.patch('/halls/:id/owner', async (req, res) => {
	try {
		const id = toId(req.params.id)
		if (!id) return res.status(404).json({ message: 'Hall not found' })
		const owner = await prisma.user.findFirst({
			where: { id: toId(req.body.ownerId), role: 'owner' },
		})
		if (!owner) return res.status(404).json({ message: 'Owner not found' })
		const hall = await prisma.hall.update({
			where: { id },
			data: { ownerId: owner.id },
			include: {
				owner: true,
				images: true,
				singers: true,
				cars: true,
				menus: true,
			},
		})
		res.json(formatHall(hall))
	} catch (error) {
		if (isMissingRecord(error))
			return res.status(404).json({ message: 'Hall not found' })
		res.status(400).json({ message: error.message })
	}
})

router.patch('/halls/:id/approve', async (req, res) => {
	try {
		const id = toId(req.params.id)
		if (!id) return res.status(404).json({ message: 'Hall not found' })
		const hall = await prisma.hall.update({
			where: { id },
			data: { status: 'approved' },
			include: {
				owner: true,
				images: true,
				singers: true,
				cars: true,
				menus: true,
			},
		})
		res.json(formatHall(hall))
	} catch (error) {
		if (isMissingRecord(error))
			return res.status(404).json({ message: 'Hall not found' })
		res.status(400).json({ message: error.message })
	}
})

router.patch('/halls/:id/reject', async (req, res) => {
	try {
		const id = toId(req.params.id)
		if (!id) return res.status(404).json({ message: 'Hall not found' })
		const hall = await prisma.hall.update({
			where: { id },
			data: { status: 'pending' },
			include: {
				owner: true,
				images: true,
				singers: true,
				cars: true,
				menus: true,
			},
		})
		res.json(formatHall(hall))
	} catch (error) {
		if (isMissingRecord(error))
			return res.status(404).json({ message: 'Hall not found' })
		res.status(400).json({ message: error.message })
	}
})

export default router
