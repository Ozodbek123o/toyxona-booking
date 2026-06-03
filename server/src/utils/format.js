import { randomUUID } from 'crypto'

/** Frontend MongoDB-style _id qo‘llab-quvvatlash */
export const hallInclude = {
	owner: {
		select: {
			id: true,
			firstName: true,
			lastName: true,
			username: true,
			email: true,
			phone: true,
			role: true,
			isVerified: true,
			createdAt: true,
		},
	},
	images: true,
	singers: true,
	cars: true,
	menus: true,
}

const toMoney = value => (value == null ? value : Number(value))
const stringId = value => (value == null ? value : String(value))

export function formatUser(user) {
	if (!user) return null
	const { password, otpCode, ...safe } = user
	return {
		...safe,
		_id: stringId(user.id),
		id: user.id,
	}
}

export function formatHall(hall, owner) {
	if (!hall) return null
	const services = normalizedServices(hall)
	const photos = Array.isArray(hall.images)
		? hall.images.map(image => ({
				_id: stringId(image.id),
				id: image.id,
				url: image.imageUrl,
				name: `hall-${image.id}`,
			}))
		: hall.photos || []
	const out = {
		id: hall.id,
		_id: stringId(hall.id),
		name: hall.name,
		description:
			hall.description ||
			`${hall.district} tumanidagi ${hall.capacity} o‘rinli to‘yxona.`,
		badge: hall.badge || (hall.status === 'approved' ? 'Tasdiqlangan' : 'Kutilmoqda'),
		rating: hall.rating || 4.7,
		amenities: hall.amenities || ['Keng zal', 'Parking', 'Professional xizmat'],
		photos,
		district: hall.district,
		address: hall.address,
		capacity: hall.capacity,
		pricePerSeat: toMoney(hall.pricePerSeat),
		phone: hall.phone,
		ownerId: hall.ownerId,
		owner: undefined,
		status: hall.status,
		hasKarnaySurnay: hall.hasKarnaySurnay,
		karnaySurnayPrice: toMoney(hall.karnaySurnayPrice),
		createdAt: hall.createdAt,
		id: hall.id,
		services,
	}
	if (owner) out.owner = formatUser(owner)
	else if (hall.owner) out.owner = formatUser(hall.owner)
	return out
}

export function formatBooking(booking, extra = {}) {
	if (!booking) return null
	return {
		id: booking.id,
		_id: stringId(booking.id),
		hallId: booking.hallId,
		userId: booking.userId,
		date: booking.date,
		seats: booking.seats,
		selectedServices: selectedServicesFromRows(booking.services),
		totalPrice: toMoney(booking.totalPrice),
		advancePaid: toMoney(booking.advancePaid),
		status: booking.status,
		createdAt: booking.createdAt,
		id: booking.id,
		hall: booking.hall ? formatHall(booking.hall) : booking.hall,
		user: booking.user ? formatUser(booking.user) : booking.user,
		...extra,
	}
}

function withServiceIds(services) {
	if (!services || typeof services !== 'object') return services
	const s = { ...services }
	for (const key of ['singers', 'menus', 'cars']) {
		if (Array.isArray(s[key])) {
			s[key] = s[key].map(item => ({
				...item,
				_id: item._id || item.id || randomUUID(),
			}))
		}
	}
	return s
}

export function ensureServiceIds(services) {
	const s = services || {}
	const addIds = arr =>
		(arr || []).map(item => ({
			...item,
			_id: item._id || item.id || randomUUID(),
		}))
	return {
		singers: addIds(s.singers),
		karnaySurnay: s.karnaySurnay || { available: false, price: 0 },
		menus: addIds(s.menus),
		cars: addIds(s.cars),
	}
}

function normalizedServices(hall) {
	if (hall.services) return withServiceIds(hall.services)
	return {
		singers: (hall.singers || []).map(singer => ({
			_id: stringId(singer.id),
			id: singer.id,
			name: singer.name,
			price: toMoney(singer.price),
			photo: singer.imageUrl,
			imageUrl: singer.imageUrl,
		})),
		karnaySurnay: {
			available: Boolean(hall.hasKarnaySurnay),
			price: toMoney(hall.karnaySurnayPrice) || 0,
		},
		menus: (hall.menus || []).map(menu => ({
			_id: stringId(menu.id),
			id: menu.id,
			name: menu.name,
			photo: menu.imageUrl,
			imageUrl: menu.imageUrl,
			price: 0,
		})),
		cars: (hall.cars || []).map(car => ({
			_id: stringId(car.id),
			id: car.id,
			brand: car.brand,
			price: toMoney(car.price),
			photo: car.imageUrl,
			imageUrl: car.imageUrl,
		})),
	}
}

function selectedServicesFromRows(rows = []) {
	return {
		singers: rows
			.filter(row => row.serviceType === 'singer')
			.map(row => stringId(row.serviceItemId)),
		cars: rows
			.filter(row => row.serviceType === 'car')
			.map(row => stringId(row.serviceItemId)),
		menus: [],
		karnaySurnay: rows.some(row => row.serviceType === 'karnay_surnay'),
	}
}
