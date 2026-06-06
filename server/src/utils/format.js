import {
	bookingStatusToApi,
	decimalToNumber,
	districtFromDb,
	hallStatusToApi,
	roleToApi,
} from './dbEnums.js'

export function formatUser(user) {
	if (!user) return null
	const {
		passwordHash,
		otpCode,
		otpExpiresAt,
		phoneNumber,
		firstName,
		lastName,
		isVerified,
		createdAt,
		...rest
	} = user
	return {
		...rest,
		id: user.id,
		_id: user.id,
		firstName,
		lastName,
		phone: phoneNumber,
		role: roleToApi(user.role),
		isVerified,
		createdAt,
	}
}

function mapImageUrl(url) {
	if (!url) return null
	return { url, name: url.split('/').pop() || 'image' }
}

export function formatHall(hall) {
	if (!hall) return null

	const photos = (hall.images || []).map(img => mapImageUrl(img.imageUrl))
	const karnayPrice = decimalToNumber(hall.karnaySurnayPrice)

	return {
		id: hall.id,
		_id: hall.id,
		name: hall.name,
		description: hall.description || '',
		badge: hall.badge || 'Premium',
		rating: hall.rating ?? 4.7,
		amenities: hall.amenities || [],
		district: districtFromDb(hall.district),
		address: hall.address,
		capacity: hall.capacity,
		pricePerSeat: decimalToNumber(hall.pricePerSeat),
		phone: hall.phoneNumber,
		status: hallStatusToApi(hall.status),
		ownerId: hall.ownerId,
		owner: hall.owner ? formatUser(hall.owner) : undefined,
		photos,
		services: {
			singers: (hall.singers || []).map(s => ({
				id: s.id,
				_id: s.id,
				name: s.name,
				price: decimalToNumber(s.price),
				photo: s.imageUrl,
			})),
			cars: (hall.cars || []).map(c => ({
				id: c.id,
				_id: c.id,
				brand: c.brand,
				price: decimalToNumber(c.price),
				photo: c.imageUrl,
			})),
			menus: (hall.menus || []).map(m => ({
				id: m.id,
				_id: m.id,
				name: m.name,
				price: 0,
				photo: m.imageUrl,
			})),
			karnaySurnay: {
				available: Boolean(hall.hasKarnaySurnay),
				price: hall.hasKarnaySurnay ? karnayPrice : 0,
			},
		},
		createdAt: hall.createdAt,
	}
}

export function formatBooking(booking, extra = {}) {
	if (!booking) return null
	const date = booking.bookingDate || booking.date
	return {
		id: booking.id,
		_id: booking.id,
		hallId: booking.hallId,
		userId: booking.customerId,
		customerId: booking.customerId,
		date,
		bookingDate: date,
		seats: booking.guestCount,
		guestCount: booking.guestCount,
		totalPrice: decimalToNumber(booking.totalPrice),
		advancePaid: decimalToNumber(booking.depositPaid),
		depositPaid: decimalToNumber(booking.depositPaid),
		status: booking.status,
		dbStatus: booking.status,
		computedStatus:
			extra.computedStatus ||
			bookingStatusToApi(booking.status, date),
		selectedServices: extra.selectedServices || booking.selectedServices,
		hall: booking.hall ? formatHall(booking.hall) : booking.hall,
		user: booking.customer
			? formatUser(booking.customer)
			: booking.user
				? formatUser(booking.user)
				: booking.user,
		createdAt: booking.createdAt,
		...extra,
	}
}

export function selectedServicesFromBody(value = {}) {
	const toIds = list =>
		Array.isArray(list) ? list.map(item => Number(item)).filter(Boolean) : []
	return {
		singers: toIds(value.singers),
		cars: toIds(value.cars),
		menus: toIds(value.menus),
		karnaySurnay: Boolean(value.karnaySurnay),
	}
}

export function selectedServicesFromBookingRows(services = []) {
	const selected = {
		singers: [],
		cars: [],
		menus: [],
		karnaySurnay: false,
	}
	for (const row of services) {
		if (row.serviceType === 'SINGER' && row.serviceItemId)
			selected.singers.push(row.serviceItemId)
		if (row.serviceType === 'CAR' && row.serviceItemId)
			selected.cars.push(row.serviceItemId)
		if (row.serviceType === 'KARNAY_SURNAY') selected.karnaySurnay = true
	}
	return selected
}
