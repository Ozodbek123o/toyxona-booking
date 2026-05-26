import express from 'express'
import { auth, optionalAuth, permit } from '../middleware/auth.js'
import { upload } from '../middleware/upload.js'
import prisma from '../lib/prisma.js'
import { parseJsonField } from '../utils/hall.js'
import { buildHallWhere, buildHallOrder, TASHKENT_DISTRICTS } from '../utils/hallQuery.js'
import { ensureServiceIds, formatHall } from '../utils/format.js'

const router = express.Router()
const imageUrl = file => `/uploads/${file.filename}`

function buildHallBody(body, files = []) {
	const services = parseJsonField(body.services, body.services || {})
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
		photos: files.map(file => ({
			url: imageUrl(file),
			name: file.originalname,
		})),
		services: ensureServiceIds({
			singers: parseJsonField(services.singers, []),
			karnaySurnay: services.karnaySurnay || { available: false, price: 0 },
			menus: parseJsonField(services.menus, []),
			cars: parseJsonField(services.cars, []),
		}),
	}
}

router.get('/districts/list', (req, res) => res.json(TASHKENT_DISTRICTS))

router.get('/stats/overview', async (req, res) => {
	const [approved, pending, bookings, minHall, maxHall] = await Promise.all([
		prisma.hall.count({ where: { status: 'approved' } }),
		prisma.hall.count({ where: { status: 'pending' } }),
		prisma.booking.count({ where: { cancelled: false } }),
		prisma.hall.findFirst({
			where: { status: 'approved' },
			orderBy: { pricePerSeat: 'asc' },
			select: { pricePerSeat: true },
		}),
		prisma.hall.findFirst({
			where: { status: 'approved' },
			orderBy: { capacity: 'desc' },
			select: { capacity: true },
		}),
	])
	res.json({
		approved,
		pending,
		bookings,
		minPrice: minHall?.pricePerSeat || 0,
		maxCapacity: maxHall?.capacity || 0,
		districts: TASHKENT_DISTRICTS.length,
	})
})

router.get('/', optionalAuth, async (req, res) => {
	const isPublic = req.query.public === 'true'
	if (!isPublic && !req.user)
		return res.status(401).json({ message: 'Login required' })

	const role = isPublic ? 'user' : 'admin'
	const where = buildHallWhere(req.query, role, req.user)
	const orderBy = buildHallOrder(req.query)

	const halls = await prisma.hall.findMany({
		where,
		orderBy,
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
			if (!TASHKENT_DISTRICTS.includes(body.district))
				return res.status(400).json({ message: 'Invalid district' })
			const hall = await prisma.hall.create({
				data: {
					...body,
					ownerId:
						req.user.role === 'owner'
							? req.user.id
							: req.body.owner || null,
					status:
						req.user.role === 'admin'
							? req.body.status || 'approved'
							: 'pending',
				},
				include: { owner: true },
			})
			res.status(201).json(formatHall(hall))
		} catch (error) {
			res.status(400).json({ message: error.message })
		}
	},
)

router.get('/:id', optionalAuth, async (req, res) => {
	const hall = await prisma.hall.findUnique({
		where: { id: req.params.id },
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
	if (!hall) return res.status(404).json({ message: 'Hall not found' })

	const isAdmin = req.user?.role === 'admin'
	const isOwner =
		req.user?.role === 'owner' && String(hall.ownerId) === String(req.user.id)

	if (hall.status !== 'approved' && !isAdmin && !isOwner)
		return res.status(404).json({ message: 'Hall not found' })

	const bookingWhere = { hallId: hall.id, cancelled: false }
	let bookings
	if (isAdmin || isOwner) {
		bookings = await prisma.booking.findMany({
			where: bookingWhere,
			include: {
				user: {
					select: {
						id: true,
						firstName: true,
						lastName: true,
						phone: true,
					},
				},
			},
		})
	} else {
		bookings = await prisma.booking.findMany({
			where: bookingWhere,
			select: { id: true, date: true, seats: true },
		})
	}

	res.json({
		hall: formatHall(hall),
		bookings: bookings.map(b => ({
			...b,
			_id: b.id,
			user: b.user
				? { ...b.user, _id: b.user.id }
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
		const hall = await prisma.hall.findUnique({ where: { id: req.params.id } })
		if (!hall) return res.status(404).json({ message: 'Hall not found' })
		if (req.user.role === 'owner' && hall.ownerId !== req.user.id)
			return res.status(403).json({ message: 'Forbidden' })

		const body = buildHallBody(req.body, req.files)
		const existingPhotos = parseJsonField(req.body.existingPhotos, [])
		const photos =
			body.photos.length > 0
				? [...existingPhotos, ...body.photos]
				: existingPhotos.length
					? existingPhotos
					: hall.photos

		let status = hall.status
		if (req.user.role === 'admin' && req.body.status) status = req.body.status
		else if (req.user.role === 'owner') status = 'pending'

		const updated = await prisma.hall.update({
			where: { id: req.params.id },
			data: {
				name: body.name,
				description: body.description,
				badge: body.badge,
				rating: body.rating,
				amenities: body.amenities,
				district: body.district,
				address: body.address,
				capacity: body.capacity,
				pricePerSeat: body.pricePerSeat,
				phone: body.phone,
				photos,
				services: body.services,
				status,
			},
			include: { owner: true },
		})
		res.json(formatHall(updated))
	},
)

router.delete('/:id', auth, permit('admin', 'owner'), async (req, res) => {
	const hall = await prisma.hall.findUnique({ where: { id: req.params.id } })
	if (!hall) return res.status(404).json({ message: 'Hall not found' })
	if (req.user.role === 'owner' && hall.ownerId !== req.user.id)
		return res.status(403).json({ message: 'Forbidden' })
	await prisma.booking.updateMany({
		where: { hallId: hall.id },
		data: { cancelled: true },
	})
	await prisma.hall.delete({ where: { id: req.params.id } })
	res.json({ message: 'Deleted' })
})

export default router
