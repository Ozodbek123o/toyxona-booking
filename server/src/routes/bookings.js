import { Prisma } from '@prisma/client'
import express from 'express'
import prisma from '../lib/prisma.js'
import { auth } from '../middleware/auth.js'
import { normalizeDate } from '../utils/hall.js'
import { bookingStatus, BOOKING_STATUS } from '../utils/bookingStatus.js'
import { calculateTotal, advanceAmount } from '../utils/price.js'
import { formatBooking } from '../utils/format.js'

const router = express.Router()
router.use(auth)

class HttpError extends Error {
	constructor(status, message) {
		super(message)
		this.status = status
	}
}

function selectedServicesFrom(value = {}) {
	const toStringArray = list =>
		Array.isArray(list) ? list.map(item => String(item)).slice(0, 20) : []
	return {
		singers: toStringArray(value.singers),
		cars: toStringArray(value.cars),
		menus: toStringArray(value.menus),
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
					where: { id: req.body.hallId, status: 'approved' },
				})
				if (!hall) throw new HttpError(404, 'Approved hall not found')
				if (seats > hall.capacity)
					throw new HttpError(400, 'Invalid seats count')

				const clash = await tx.booking.findFirst({
					where: { hallId: hall.id, date, cancelled: false },
				})
				if (clash) throw new HttpError(409, 'This date is already booked')

				const totalPrice = calculateTotal(hall, seats, selectedServices)
				const advancePaid = advanceAmount(totalPrice)
				return tx.booking.create({
					data: {
						hallId: hall.id,
						userId: req.user.id,
						date,
						seats,
						selectedServices,
						totalPrice,
						advancePaid,
					},
				})
			},
			{ isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
		)
		res.status(201).json({
			...formatBooking(booking),
			advancePaid: booking.advancePaid,
			totalPrice: booking.totalPrice,
		})
	} catch (error) {
		if (bookingConflict(error))
			return res.status(409).json({ message: 'This date is already booked' })
		res.status(error.status || 400).json({ message: error.message })
	}
})

router.get('/', async (req, res) => {
	const where = { cancelled: false }
	if (req.user.role === 'user') where.userId = req.user.id
	if (req.query.hall) where.hallId = req.query.hall

	if (req.user.role === 'owner') {
		const myHalls = await prisma.hall.findMany({
			where: { ownerId: req.user.id },
			select: { id: true },
		})
		const ids = myHalls.map(h => h.id)
		if (req.query.hall) {
			if (!ids.includes(req.query.hall)) return res.json([])
			where.hallId = req.query.hall
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
	const booking = await prisma.booking.findUnique({
		where: { id: req.params.id },
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
		where: { id: req.params.id },
		data: { cancelled: true },
	})
	res.json({ message: 'Booking cancelled' })
})

export { BOOKING_STATUS }
export default router
