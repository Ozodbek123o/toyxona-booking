import { Prisma } from '@prisma/client'
import express from 'express'
import prisma from '../lib/prisma.js'
import { auth } from '../middleware/auth.js'
import { hallInclude } from '../services/hallService.js'
import { bookingStatusToApi, districtFromDb } from '../utils/dbEnums.js'
import { normalizeDate } from '../utils/hall.js'
import { calculateTotal, advanceAmount } from '../utils/price.js'
import {
	formatBooking,
	selectedServicesFromBody,
	selectedServicesFromBookingRows,
} from '../utils/format.js'

const router = express.Router()
router.use(auth)

class HttpError extends Error {
	constructor(status, message) {
		super(message)
		this.status = status
	}
}

function bookingConflict(error) {
	return (
		error?.code === 'P2002' ||
		error?.code === 'P2034' ||
		error?.status === 409
	)
}

async function buildBookingServiceRows(hall, selected) {
	const rows = []
	for (const singerId of selected.singers) {
		const singer = hall.singers.find(s => s.id === singerId)
		if (!singer) throw new HttpError(400, 'Invalid singer selected')
		rows.push({
			serviceType: 'SINGER',
			serviceItemId: singer.id,
			price: singer.price,
		})
	}
	for (const carId of selected.cars) {
		const car = hall.cars.find(c => c.id === carId)
		if (!car) throw new HttpError(400, 'Invalid car selected')
		rows.push({
			serviceType: 'CAR',
			serviceItemId: car.id,
			price: car.price,
		})
	}
	if (selected.karnaySurnay) {
		if (!hall.hasKarnaySurnay)
			throw new HttpError(400, 'Karnay-surnay is not available for this hall')
		rows.push({
			serviceType: 'KARNAY_SURNAY',
			serviceItemId: null,
			price: hall.karnaySurnayPrice,
		})
	}
	return rows
}

router.post('/', async (req, res) => {
	try {
		const seats = Number(req.body.seats)
		const hallId = Number(req.body.hallId)
		const date = normalizeDate(req.body.date)
		if (!Number.isInteger(seats) || seats < 1)
			return res.status(400).json({ message: 'Invalid seats count' })
		if (!Number.isInteger(hallId))
			return res.status(400).json({ message: 'Invalid hall' })
		if (Number.isNaN(date.getTime()))
			return res.status(400).json({ message: 'Invalid booking date' })
		if (date < new Date().setHours(0, 0, 0, 0))
			return res.status(400).json({ message: 'Past date cannot be booked' })

		const selected = selectedServicesFromBody(req.body.selectedServices)

		const booking = await prisma.$transaction(
			async tx => {
				const hall = await tx.weddingHall.findFirst({
					where: { id: hallId, status: 'APPROVED' },
					include: hallInclude,
				})
				if (!hall) throw new HttpError(404, 'Approved hall not found')
				if (seats > hall.capacity)
					throw new HttpError(400, 'Invalid seats count')

				const clash = await tx.booking.findFirst({
					where: {
						hallId: hall.id,
						bookingDate: date,
						status: { in: ['UPCOMING', 'COMPLETED'] },
					},
				})
				if (clash) throw new HttpError(409, 'This date is already booked')

				const formattedHall = {
					pricePerSeat: Number(hall.pricePerSeat),
					services: {
						singers: hall.singers.map(s => ({
							_id: s.id,
							id: s.id,
							price: Number(s.price),
						})),
						cars: hall.cars.map(c => ({
							_id: c.id,
							id: c.id,
							price: Number(c.price),
						})),
						menus: hall.menus.map(m => ({
							_id: m.id,
							id: m.id,
							price: 0,
						})),
						karnaySurnay: {
							available: hall.hasKarnaySurnay,
							price: Number(hall.karnaySurnayPrice || 0),
						},
					},
				}

				const totalPrice = calculateTotal(formattedHall, seats, selected)
				const depositPaid = advanceAmount(totalPrice)
				const serviceRows = await buildBookingServiceRows(hall, selected)

				const created = await tx.booking.create({
					data: {
						customerId: Number(req.user.id),
						hallId: hall.id,
						bookingDate: date,
						guestCount: seats,
						totalPrice,
						depositPaid,
						status: 'UPCOMING',
						services: { create: serviceRows },
					},
					include: { services: true },
				})
				return created
			},
			{ isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
		)

		res.status(201).json({
			...formatBooking(booking, {
				selectedServices: selectedServicesFromBookingRows(booking.services),
			}),
			advancePaid: Number(booking.depositPaid),
			totalPrice: Number(booking.totalPrice),
		})
	} catch (error) {
		if (bookingConflict(error))
			return res.status(409).json({ message: 'This date is already booked' })
		res.status(error.status || 400).json({ message: error.message })
	}
})

router.get('/', async (req, res) => {
	const where = { status: { in: ['UPCOMING', 'COMPLETED'] } }
	if (req.user.role === 'user') where.customerId = Number(req.user.id)
	if (req.query.hall) where.hallId = Number(req.query.hall)

	if (req.user.role === 'owner') {
		const myHalls = await prisma.weddingHall.findMany({
			where: { ownerId: Number(req.user.id) },
			select: { id: true },
		})
		const ids = myHalls.map(h => h.id)
		if (req.query.hall) {
			const hallId = Number(req.query.hall)
			if (!ids.includes(hallId)) return res.json([])
			where.hallId = hallId
		} else {
			where.hallId = { in: ids }
		}
	}

	if (req.query.date) {
		const date = normalizeDate(req.query.date)
		if (Number.isNaN(date.getTime()))
			return res.status(400).json({ message: 'Invalid date filter' })
		where.bookingDate = date
	} else {
		const dateFilter = {}
		if (req.query.dateFrom) {
			const dateFrom = normalizeDate(req.query.dateFrom)
			if (Number.isNaN(dateFrom.getTime()))
				return res.status(400).json({ message: 'Invalid date filter' })
			dateFilter.gte = dateFrom
		}
		if (req.query.dateTo) {
			const dateTo = normalizeDate(req.query.dateTo)
			if (Number.isNaN(dateTo.getTime()))
				return res.status(400).json({ message: 'Invalid date filter' })
			dateFilter.lte = dateTo
		}
		if (Object.keys(dateFilter).length) where.bookingDate = dateFilter
	}

	let bookings = await prisma.booking.findMany({
		where,
		include: {
			hall: { include: hallInclude },
			customer: {
				select: {
					id: true,
					firstName: true,
					lastName: true,
					phoneNumber: true,
				},
			},
			services: true,
		},
		orderBy: { bookingDate: req.query.sortDate === 'desc' ? 'desc' : 'asc' },
	})

	if (req.query.district) {
		const district = req.query.district
		bookings = bookings.filter(
			b => districtFromDb(b.hall?.district) === district,
		)
	}
	if (req.query.status) {
		bookings = bookings.filter(
			b =>
				bookingStatusToApi(b.status, b.bookingDate) === req.query.status,
		)
	}
	if (req.query.sortHall === 'asc' || req.query.sortHall === 'desc') {
		const dir = req.query.sortHall === 'asc' ? 1 : -1
		bookings.sort(
			(a, b) =>
				(a.hall?.name || '').localeCompare(b.hall?.name || '', 'uz') * dir,
		)
	}

	res.json(
		bookings.map(b =>
			formatBooking(
				{ ...b, user: b.customer },
				{
					computedStatus: bookingStatusToApi(b.status, b.bookingDate),
					selectedServices: selectedServicesFromBookingRows(b.services),
				},
			),
		),
	)
})

router.delete('/:id', async (req, res) => {
	const booking = await prisma.booking.findUnique({
		where: { id: Number(req.params.id) },
		include: { hall: { select: { ownerId: true } } },
	})
	if (!booking) return res.status(404).json({ message: 'Booking not found' })

	const allowed =
		req.user.role === 'admin' ||
		booking.customerId === Number(req.user.id) ||
		booking.hall.ownerId === Number(req.user.id)
	if (!allowed) return res.status(403).json({ message: 'Forbidden' })

	const today = new Date()
	today.setHours(0, 0, 0, 0)
	const bookingDay = new Date(booking.bookingDate)
	bookingDay.setHours(0, 0, 0, 0)
	if (req.user.role === 'user' && bookingDay < today)
		return res
			.status(400)
			.json({ message: 'O’tgan bronni bekor qilib bo’lmaydi' })

	await prisma.booking.update({
		where: { id: booking.id },
		data: { status: 'CANCELLED' },
	})
	res.json({ message: 'Booking cancelled' })
})

export default router
