export { TASHKENT_DISTRICTS } from './dbEnums.js'

export function normalizeDate(value) {
	if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
		const [year, month, day] = value.split('-').map(Number)
		return new Date(year, month - 1, day)
	}
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
