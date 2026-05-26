import { randomUUID } from 'crypto'

/** Frontend MongoDB-style _id qo‘llab-quvvatlash */
export function formatUser(user) {
	if (!user) return null
	const { password, otpCode, otpExpiresAt, ...safe } = user
	return {
		...safe,
		_id: user.id,
		id: user.id,
	}
}

export function formatHall(hall, owner) {
	if (!hall) return null
	const services = withServiceIds(hall.services)
	const out = {
		...hall,
		_id: hall.id,
		id: hall.id,
		amenities: hall.amenities || [],
		photos: hall.photos || [],
		services,
	}
	if (owner) out.owner = formatUser(owner)
	else if (hall.owner) out.owner = formatUser(hall.owner)
	return out
}

export function formatBooking(booking, extra = {}) {
	if (!booking) return null
	return {
		...booking,
		_id: booking.id,
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
