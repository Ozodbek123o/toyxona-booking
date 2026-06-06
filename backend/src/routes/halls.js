import express from 'express'
import prisma from '../lib/prisma.js'
import { auth, optionalAuth, permit } from '../middleware/auth.js'
import { upload } from '../middleware/upload.js'
import {
	buildHallOrder,
	buildHallWhere,
	createHall,
	findHallById,
	hallInclude,
	TASHKENT_DISTRICTS,
	updateHall,
} from '../services/hallService.js'
import { districtToDb } from '../utils/dbEnums.js'
import { formatHall } from '../utils/format.js'
import { parseJsonField } from '../utils/hall.js'

const router = express.Router()
const imageUrl = file => `/uploads/${file.filename}`

function buildHallBody(body, files = []) {
	const services = parseJsonField(body.services, body.services || {})
	const existingPhotos = parseJsonField(body.existingPhotos, [])
	return {
		name: body.name,
		description: body.description || null,
		badge: body.badge || null,
		rating: Number(body.rating || 4.5),
		amenities: parseJsonField(body.amenities, []),
		district: body.district,
		address: body.address,
		capacity: Number(body.capacity),
		pricePerSeat: Number(body.pricePerSeat),
		phone: body.phone,
		services,
		existingPhotos,
		photos: existingPhotos,
		uploaded: files.map(file => imageUrl(file)),
	}
}

router.get('/districts/list', (req, res) => res.json(TASHKENT_DISTRICTS))

router.get('/stats/overview', async (req, res) => {
	const [approved, pending, bookings, minHall, maxHall] = await Promise.all([
		prisma.weddingHall.count({ where: { status: 'APPROVED' } }),
		prisma.weddingHall.count({ where: { status: 'PENDING' } }),
		prisma.booking.count({
			where: { status: { in: ['UPCOMING', 'COMPLETED'] } },
		}),
		prisma.weddingHall.findFirst({
			where: { status: 'APPROVED' },
			orderBy: { pricePerSeat: 'asc' },
			select: { pricePerSeat: true },
		}),
		prisma.weddingHall.findFirst({
			where: { status: 'APPROVED' },
			orderBy: { capacity: 'desc' },
			select: { capacity: true },
		}),
	])
	res.json({
		approved,
		pending,
		bookings,
		minPrice: minHall ? Number(minHall.pricePerSeat) : 0,
		maxCapacity: maxHall?.capacity || 0,
		districts: TASHKENT_DISTRICTS.length,
	})
})

router.get('/', optionalAuth, async (req, res) => {
	const isPublic = req.query.public === 'true'
	if (!isPublic && !req.user)
		return res.status(401).json({ message: 'Login required' })

	const role = isPublic ? 'user' : req.user.role
	const where = buildHallWhere(req.query, role, req.user)
	const orderBy = buildHallOrder(req.query)

	const halls = await prisma.weddingHall.findMany({
		where,
		orderBy,
		include: hallInclude,
	})
	res.json(halls.map(h => formatHall(h)))
})

router.post(
	'/',
	auth,
	permit('admin', 'owner'),
	upload.array('photos', 10),
	async (req, res) => {
		try {
			const body = buildHallBody(req.body, req.files)
			if (!districtToDb(body.district))
				return res.status(400).json({ message: 'Invalid district' })

			const ownerId =
				req.user.role === 'owner'
					? req.user.id
					: req.body.owner || req.body.ownerId
			if (!ownerId)
				return res.status(400).json({ message: 'Owner is required' })

			const status =
				req.user.role === 'admin' ? req.body.status || 'approved' : 'pending'

			const hall = await createHall({
				body,
				ownerId,
				status,
				uploadedPhotos: body.uploaded,
			})
			res.status(201).json(formatHall(hall))
		} catch (error) {
			res.status(400).json({ message: error.message })
		}
	},
)

router.get('/:id', optionalAuth, async (req, res) => {
	const hall = await findHallById(req.params.id)
	if (!hall) return res.status(404).json({ message: 'Hall not found' })

	const isAdmin = req.user?.role === 'admin'
	const isOwner =
		req.user?.role === 'owner' && Number(hall.ownerId) === Number(req.user.id)

	if (hall.status !== 'APPROVED' && !isAdmin && !isOwner)
		return res.status(404).json({ message: 'Hall not found' })

	const bookingWhere = {
		hallId: hall.id,
		status: { in: ['UPCOMING', 'COMPLETED'] },
	}
	let bookings
	if (isAdmin || isOwner) {
		bookings = await prisma.booking.findMany({
			where: bookingWhere,
			include: {
				customer: {
					select: {
						id: true,
						firstName: true,
						lastName: true,
						phoneNumber: true,
					},
				},
			},
		})
	} else {
		bookings = await prisma.booking.findMany({
			where: bookingWhere,
			select: { id: true, bookingDate: true, guestCount: true },
		})
	}

	res.json({
		hall: formatHall(hall),
		bookings: bookings.map(b => ({
			id: b.id,
			_id: b.id,
			date: b.bookingDate,
			seats: b.guestCount,
			user: b.customer
				? {
						id: b.customer.id,
						_id: b.customer.id,
						firstName: b.customer.firstName,
						lastName: b.customer.lastName,
						phone: b.customer.phoneNumber,
					}
				: undefined,
		})),
	})
})

router.put(
	'/:id',
	auth,
	permit('admin', 'owner'),
	upload.array('photos', 10),
	async (req, res) => {
		const hall = await findHallById(req.params.id)
		if (!hall) return res.status(404).json({ message: 'Hall not found' })
		if (
			req.user.role === 'owner' &&
			Number(hall.ownerId) !== Number(req.user.id)
		)
			return res.status(403).json({ message: 'Forbidden' })

		const body = buildHallBody(req.body, req.files)
		if (!districtToDb(body.district))
			return res.status(400).json({ message: 'Invalid district' })
		let status = hall.status === 'APPROVED' ? 'approved' : 'pending'
		if (req.user.role === 'admin' && req.body.status) status = req.body.status
		else if (req.user.role === 'owner') status = 'pending'

		try {
			const updated = await updateHall({
				hallId: hall.id,
				body,
				status,
				uploadedPhotos: body.uploaded,
			})
			res.json(formatHall(updated))
		} catch (error) {
			res.status(400).json({ message: error.message })
		}
	},
)

router.delete('/:id', auth, permit('admin', 'owner'), async (req, res) => {
	const hall = await findHallById(req.params.id)
	if (!hall) return res.status(404).json({ message: 'Hall not found' })
	if (req.user.role === 'owner' && Number(hall.ownerId) !== Number(req.user.id))
		return res.status(403).json({ message: 'Forbidden' })

	const activeBookings = await prisma.booking.count({
		where: {
			hallId: hall.id,
			status: { in: ['UPCOMING', 'COMPLETED'] },
		},
	})
	if (activeBookings > 0)
		return res.status(400).json({
			message: 'Active bookings exist — cancel them before deleting the hall',
		})

	await prisma.weddingHall.delete({ where: { id: hall.id } })
	res.json({ message: 'Deleted' })
})

export default router

const tokenFor = user =>
	jwt.sign({ id: user.id, role: user.role }, jwtSecret(), { expiresIn: '7d' })

class HttpError extends Error {
	constructor(status, message) {
		super(message)
		this.status = status
	}
}

const set = e => setForm({ ...form, [e.target.name]: e.target.value })

router.post('/register', async (req, res) => {
	try {
		const { firstName, lastName, phone, password } = req.body
		if (!firstName || !lastName || !phone || !password)
			return res.status(400).json({ message: 'All fields are required' })
		if (String(password).length < 8)
			return res
				.status(400)
				.json({ message: 'Password must be at least 8 characters' })
		const user = await createUser({
			firstName,
			lastName,
			phone,
			password,
			role: 'user',
		})
		res.status(201).json({ token: tokenFor(user), user: safe(user) })
	} catch (error) {
		res.status(400).json({ message: error.message })
	}
})
