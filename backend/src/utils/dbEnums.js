/** API (frontend) ↔ PostgreSQL enum mapping */

export const TASHKENT_DISTRICTS = [
	'Bektemir',
	'Chilonzor',
	'Yashnobod',
	'Mirobod',
	'Mirzo Ulugbek',
	'Olmazor',
	'Sergeli',
	'Shayxontohur',
	'Uchtepa',
	'Yakkasaroy',
	'Yunusobod',
	'Yangihayot',
]

const DISTRICT_TO_DB = {
	Bektemir: 'Bektemir',
	Chilonzor: 'Chilanzar',
	Yashnobod: 'Yashnabad',
	Mirobod: 'Mirabad',
	'Mirzo Ulugbek': 'Mirzo_Ulugbek',
	Olmazor: 'Almazar',
	Sergeli: 'Sergeli',
	Shayxontohur: 'Shaykhantahur',
	Uchtepa: 'Uchtepa',
	Yakkasaroy: 'Yakkasaray',
	Yunusobod: 'Yunusabad',
	Yangihayot: 'Yangihayot',
}

const DISTRICT_FROM_DB = Object.fromEntries(
	Object.entries(DISTRICT_TO_DB).map(([api, db]) => [db, api]),
)

export function districtToDb(district) {
	if (!district) return null
	return DISTRICT_TO_DB[district] || district
}

export function districtFromDb(district) {
	if (!district) return district
	return DISTRICT_FROM_DB[district] || district
}

export function roleToApi(role) {
	const map = { ADMIN: 'admin', OWNER: 'owner', CUSTOMER: 'user' }
	return map[role] || String(role).toLowerCase()
}

export function roleToDb(role) {
	const key = String(role || '').toLowerCase()
	const map = {
		admin: 'ADMIN',
		owner: 'OWNER',
		user: 'CUSTOMER',
		customer: 'CUSTOMER',
	}
	return map[key] || role
}

export function hallStatusToApi(status) {
	return status === 'APPROVED' ? 'approved' : 'pending'
}

export function hallStatusToDb(status) {
	const key = String(status || '').toLowerCase()
	if (key === 'approved') return 'APPROVED'
	return 'PENDING'
}

export function bookingStatusToApi(status, bookingDate) {
	if (status === 'CANCELLED') return 'cancelled'
	if (status === 'COMPLETED') return "bo'lib o'tgan"
	const today = new Date()
	today.setHours(0, 0, 0, 0)
	const d = new Date(bookingDate)
	d.setHours(0, 0, 0, 0)
	return d < today ? "bo'lib o'tgan" : "endi bo'ladigan"
}

export function decimalToNumber(value) {
	if (value == null) return 0
	return Number(value)
}
