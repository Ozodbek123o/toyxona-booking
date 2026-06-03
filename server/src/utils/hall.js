export const TASHKENT_DISTRICTS = [
	'Chilanzar',
	'Yunusabad',
	'Mirabad',
	'Yakkasaray',
	'Shaykhantahur',
	'Almazar',
	'Mirzo_Ulugbek',
	'Uchtepa',
	'Sergeli',
	'Bektemir',
	'Yashnabad',
	'Yangihayot',
]

export function normalizeDate(value) {
	const date = new Date(value)
	date.setHours(0, 0, 0, 0)
	return date
}

export function parseJsonField(value, fallback) {
	if (!value) return fallback
	if (typeof value !== 'string') return value
	try {
		return JSON.parse(value)
	} catch {
		return fallback
	}
}

export function toId(value) {
	const id = Number(value)
	return Number.isInteger(id) && id > 0 ? id : null
}
