import { Prisma } from '@prisma/client'
import express from 'express'
import prisma from '../lib/prisma.js'
import { auth } from '../middleware/auth.js'
import { normalizeDate, toId } from '../utils/hall.js'
import { bookingStatus, BOOKING_STATUS } from '../utils/bookingStatus.js'
import { calculateTotal, advanceAmount } from '../utils/price.js'
import { formatBooking, formatHall, hallInclude } from '../utils/format.js'

const router = express.Router()
router.use(auth)

class HttpError extends Error {
	constructor(status, message) {
		super(message)
		this.status = status
	}
}

function selectedServicesFrom(value = {}) {
	const toNumberArray = list =>
		Array.isArray(list)
			? list.map(item => toId(item)).filter(Boolean).slice(0, 20)
			: []
	return {
		singers: toNumberArray(value.singers),
		cars: toNumberArray(value.cars),
		menus: toNumberArray(value.menus),
		karnaySurnay: Boolean(value.karnaySurnay),
	}
}

function bookingConflict(error) {
	return (
		error?.code === 'P2002' ||
		error?.code === 'P2034' ||
		error?.status === 409
	)
}

function selectedServiceRows(hall, selectedServices) {
	const rows = []
	for (const id of selectedServices.singers) {
		const item = hall.services.singers.find(singer => singer.id === id)
		if (item) rows.push({ serviceType: 'singer', serviceItemId: id, price: item.price })
	}
	for (const id of selectedServices.cars) {
		const item = hall.services.cars.find(car => car.id === id)
		if (item) rows.push({ serviceType: 'car', serviceItemId: id, price: item.price })
	}
	if (selectedServices.karnaySurnay && hall.services.karnaySurnay.available) {
		rows.push({
			serviceType: 'karnay_surnay',
			serviceItemId: null,
			price: hall.services.karnaySurnay.price,
		})
	}
	return rows
}

router.post('/', async (req, res) => {
	try {
		const seats = Number(req.body.seats)
		const date = normalizeDate(req.body.date)
		if (!Number.isInteger(seats) || seats < 1)
			return res.status(400).json({ message: 'Invalid seats count' })
		if (Number.isNaN(date.getTime()))
			return res.status(400).json({ message: 'Invalid booking date' })
		if (date < new Date().setHours(0, 0, 0, 0))
			return res.status(400).json({ message: 'Past date cannot be booked' })
		const selectedServices = selectedServicesFrom(req.body.selectedServices)

		const booking = await prisma.$transaction(
			async tx => {
				const hall = await tx.hall.findFirst({
					where: { id: toId(req.body.hallId), status: 'approved' },
					include: hallInclude,
				})
				if (!hall) throw new HttpError(404, 'Approved hall not found')
				if (seats > hall.capacity)
					throw new HttpError(400, 'Invalid seats count')

				const clash = await tx.booking.findFirst({
					where: {
						hallId: hall.id,
						date,
						status: { in: ['upcoming', 'completed'] },
					},
				})
				if (clash) throw new HttpError(409, 'This date is already booked')

				const apiHall = formatHall(hall)
				const totalPrice = calculateTotal(apiHall, seats, selectedServices)
				const advancePaid = advanceAmount(totalPrice)
				return tx.booking.create({
					data: {
						hallId: hall.id,
						userId: req.user.id,
						date,
						seats,
						totalPrice,
						advancePaid,
						services: {
							create: selectedServiceRows(apiHall, selectedServices),
						},
					},
					include: { services: true },
				})
			},
			{ isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
		)
		res.status(201).json({
			...formatBooking(booking),
			advancePaid: Number(booking.advancePaid),
			totalPrice: Number(booking.totalPrice),
		})
	} catch (error) {
		if (bookingConflict(error))
			return res.status(409).json({ message: 'This date is already booked' })
		res.status(error.status || 400).json({ message: error.message })
	}
})

router.get('/', async (req, res) => {
	const where = { status: { not: 'cancelled' } }
	if (req.user.role === 'user') where.userId = req.user.id
	if (req.query.hall) where.hallId = toId(req.query.hall)

	if (req.user.role === 'owner') {
		const myHalls = await prisma.hall.findMany({
			where: { ownerId: req.user.id },
			select: { id: true },
		})
		const ids = myHalls.map(h => h.id)
		if (req.query.hall) {
			const hallId = toId(req.query.hall)
			if (!ids.includes(hallId)) return res.json([])
			where.hallId = hallId
		} else {
			where.hallId = { in: ids }
		}
	}

	if (req.query.date) {
		where.date = normalizeDate(req.query.date)
	} else {
		const dateFilter = {}
		if (req.query.dateFrom)
			dateFilter.gte = normalizeDate(req.query.dateFrom)
		if (req.query.dateTo) dateFilter.lte = normalizeDate(req.query.dateTo)
		if (Object.keys(dateFilter).length) where.date = dateFilter
	}

	let bookings = await prisma.booking.findMany({
		where,
		include: {
			hall: {
				select: {
					id: true,
					name: true,
					district: true,
					ownerId: true,
					pricePerSeat: true,
					capacity: true,
					status: true,
					hasKarnaySurnay: true,
					karnaySurnayPrice: true,
				},
			},
			user: {
				select: {
					id: true,
					firstName: true,
					lastName: true,
					phone: true,
				},
			},
			services: true,
		},
		orderBy: { date: req.query.sortDate === 'desc' ? 'desc' : 'asc' },
	})

	if (req.query.district)
		bookings = bookings.filter(b => b.hall?.district === req.query.district)
	if (req.query.status)
		bookings = bookings.filter(
			b => bookingStatus(b.date) === req.query.status,
		)
	if (req.query.sortHall === 'asc' || req.query.sortHall === 'desc') {
		const dir = req.query.sortHall === 'asc' ? 1 : -1
		bookings.sort(
			(a, b) =>
				(a.hall?.name || '').localeCompare(b.hall?.name || '', 'uz') * dir,
		)
	}

	res.json(
		bookings.map(b =>
			formatBooking(b, { computedStatus: bookingStatus(b.date) }),
		),
	)
})

router.delete('/:id', async (req, res) => {
	const id = toId(req.params.id)
	if (!id) return res.status(404).json({ message: 'Booking not found' })
	const booking = await prisma.booking.findUnique({
		where: { id },
		include: { hall: { select: { ownerId: true } } },
	})
	if (!booking) return res.status(404).json({ message: 'Booking not found' })
	const allowed =
		req.user.role === 'admin' ||
		booking.userId === req.user.id ||
		booking.hall.ownerId === req.user.id
	if (!allowed) return res.status(403).json({ message: 'Forbidden' })
	if (
		req.user.role === 'user' &&
		bookingStatus(booking.date) === BOOKING_STATUS.PAST
	)
		return res
			.status(400)
			.json({ message: 'O’tgan bronni bekor qilib bo’lmaydi' })
	await prisma.booking.update({
		where: { id: booking.id },
		data: { status: 'cancelled' },
	})
	res.json({ message: 'Booking cancelled' })
})

export { BOOKING_STATUS }
export default router
