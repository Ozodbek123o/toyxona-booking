import express from 'express'
import { auth, optionalAuth, permit } from '../middleware/auth.js'
import { upload } from '../middleware/upload.js'
import prisma from '../lib/prisma.js'
import { parseJsonField, toId } from '../utils/hall.js'
import { buildHallWhere, buildHallOrder, TASHKENT_DISTRICTS } from '../utils/hallQuery.js'
import { ensureServiceIds, formatHall, hallInclude } from '../utils/format.js'

const router = express.Router()
const imageUrl = file => `/uploads/${file.filename}`

function buildHallBody(body, files = []) {
	const services = parseJsonField(body.services, body.services || {})
	const normalizedServices = ensureServiceIds({
		singers: parseJsonField(services.singers, []),
		karnaySurnay: services.karnaySurnay || { available: false, price: 0 },
		menus: parseJsonField(services.menus, []),
		cars: parseJsonField(services.cars, []),
	})
	return {
		name: body.name,
		district: body.district,
		address: body.address,
		capacity: Number(body.capacity),
		pricePerSeat: Number(body.pricePerSeat),
		phone: body.phone,
		photos: files.map(file => ({
			url: imageUrl(file),
			name: file.originalname,
		})),
		services: normalizedServices,
		hasKarnaySurnay: Boolean(normalizedServices.karnaySurnay?.available),
		karnaySurnayPrice: normalizedServices.karnaySurnay?.available
			? Number(normalizedServices.karnaySurnay.price || 0)
			: null,
	}
}

function hallNestedCreate(body) {
	return {
		images: {
			create: body.photos.map(photo => ({ imageUrl: photo.url })),
		},
		singers: {
			create: body.services.singers.map(singer => ({
				name: singer.name,
				price: Number(singer.price || 0),
				imageUrl: singer.photo || singer.imageUrl || null,
			})),
		},
		menus: {
			create: body.services.menus.map(menu => ({
				name: menu.name,
				imageUrl: menu.photo || menu.imageUrl || null,
			})),
		},
		cars: {
			create: body.services.cars.map(car => ({
				brand: car.brand,
				price: Number(car.price || 0),
				imageUrl: car.photo || car.imageUrl || null,
			})),
		},
	}
}

function hallBaseData(body) {
	return {
		name: body.name,
		district: body.district,
		address: body.address,
		capacity: body.capacity,
		pricePerSeat: body.pricePerSeat,
		phone: body.phone,
		hasKarnaySurnay: body.hasKarnaySurnay,
		karnaySurnayPrice: body.karnaySurnayPrice,
	}
}

router.get('/districts/list', (req, res) => res.json(TASHKENT_DISTRICTS))

router.get('/stats/overview', async (req, res) => {
	const [approved, pending, bookings, minHall, maxHall] = await Promise.all([
		prisma.hall.count({ where: { status: 'approved' } }),
		prisma.hall.count({ where: { status: 'pending' } }),
		prisma.booking.count({ where: { status: { not: 'cancelled' } } }),
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
		minPrice: Number(minHall?.pricePerSeat || 0),
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
			if (!TASHKENT_DISTRICTS.includes(body.district))
				return res.status(400).json({ message: 'Invalid district' })
			const ownerId =
				req.user.role === 'owner' ? req.user.id : toId(req.body.owner)
			if (!ownerId)
				return res.status(400).json({ message: 'To’yxona egasini tanlang' })
			const hall = await prisma.hall.create({
				data: {
					...hallBaseData(body),
					ownerId,
					status:
						req.user.role === 'admin'
							? req.body.status || 'approved'
							: 'pending',
					...hallNestedCreate(body),
				},
				include: hallInclude,
			})
			res.status(201).json(formatHall(hall))
		} catch (error) {
			res.status(400).json({ message: error.message })
		}
	},
)

router.get('/:id', optionalAuth, async (req, res) => {
	const id = toId(req.params.id)
	if (!id) return res.status(404).json({ message: 'Hall not found' })
	const hall = await prisma.hall.findUnique({
		where: { id },
		include: hallInclude,
	})
	if (!hall) return res.status(404).json({ message: 'Hall not found' })

	const isAdmin = req.user?.role === 'admin'
	const isOwner =
		req.user?.role === 'owner' && String(hall.ownerId) === String(req.user.id)

	if (hall.status !== 'approved' && !isAdmin && !isOwner)
		return res.status(404).json({ message: 'Hall not found' })

	const bookingWhere = { hallId: hall.id, status: { not: 'cancelled' } }
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
			select: { id: true, date: true, seats: true, status: true },
		})
	}

	res.json({
		hall: formatHall(hall),
		bookings: bookings.map(b => ({
			...b,
			_id: String(b.id),
			user: b.user
				? { ...b.user, _id: String(b.user.id) }
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
		const id = toId(req.params.id)
		if (!id) return res.status(404).json({ message: 'Hall not found' })
		const hall = await prisma.hall.findUnique({
			where: { id },
			include: { images: true },
		})
		if (!hall) return res.status(404).json({ message: 'Hall not found' })
		if (req.user.role === 'owner' && hall.ownerId !== req.user.id)
			return res.status(403).json({ message: 'Forbidden' })

		const body = buildHallBody(req.body, req.files)
		if (!TASHKENT_DISTRICTS.includes(body.district))
			return res.status(400).json({ message: 'Invalid district' })
		const existingPhotos = parseJsonField(req.body.existingPhotos, [])
		const photos =
			body.photos.length > 0
				? [...existingPhotos, ...body.photos]
				: existingPhotos.length
					? existingPhotos
					: hall.images.map(image => ({
							_id: String(image.id),
							id: image.id,
							url: image.imageUrl,
							name: `hall-${image.id}`,
						}))

		let status = hall.status
		if (req.user.role === 'admin' && req.body.status) status = req.body.status
		else if (req.user.role === 'owner') status = 'pending'

		const updated = await prisma.hall.update({
			where: { id: hall.id },
			data: {
				...hallBaseData(body),
				status,
				images: {
					deleteMany: {},
					create: photos.map(photo => ({ imageUrl: photo.url })),
				},
				singers: {
					deleteMany: {},
					create: body.services.singers.map(singer => ({
						name: singer.name,
						price: Number(singer.price || 0),
						imageUrl: singer.photo || singer.imageUrl || null,
					})),
				},
				menus: {
					deleteMany: {},
					create: body.services.menus.map(menu => ({
						name: menu.name,
						imageUrl: menu.photo || menu.imageUrl || null,
					})),
				},
				cars: {
					deleteMany: {},
					create: body.services.cars.map(car => ({
						brand: car.brand,
						price: Number(car.price || 0),
						imageUrl: car.photo || car.imageUrl || null,
					})),
				},
			},
			include: hallInclude,
		})
		res.json(formatHall(updated))
	},
)

router.delete('/:id', auth, permit('admin', 'owner'), async (req, res) => {
	const id = toId(req.params.id)
	if (!id) return res.status(404).json({ message: 'Hall not found' })
	const hall = await prisma.hall.findUnique({ where: { id } })
	if (!hall) return res.status(404).json({ message: 'Hall not found' })
	if (req.user.role === 'owner' && hall.ownerId !== req.user.id)
		return res.status(403).json({ message: 'Forbidden' })
	await prisma.booking.updateMany({
		where: { hallId: hall.id },
		data: { status: 'cancelled' },
	})
	await prisma.hall.delete({ where: { id: hall.id } })
	res.json({ message: 'Deleted' })
})

export default router
