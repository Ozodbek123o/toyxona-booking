import { TASHKENT_DISTRICTS } from './hall.js'

export function buildHallWhere(query, role, user) {
	const where = { AND: [] }
	if (role === 'user') where.AND.push({ status: 'approved' })
	if (['approved', 'pending'].includes(query.status))
		where.AND.push({ status: query.status })
	if (TASHKENT_DISTRICTS.includes(query.district))
		where.AND.push({ district: query.district })
	if (query.search) {
		where.AND.push({
			OR: [
				{ name: { contains: query.search, mode: 'insensitive' } },
				{ address: { contains: query.search, mode: 'insensitive' } },
			],
		})
	}
	const minPrice = Number(query.minPrice)
	const maxPrice = Number(query.maxPrice)
	const minCapacity = Number(query.minCapacity)
	const maxCapacity = Number(query.maxCapacity)
	if (Number.isFinite(minPrice))
		where.AND.push({ pricePerSeat: { gte: minPrice } })
	if (Number.isFinite(maxPrice))
		where.AND.push({ pricePerSeat: { lte: maxPrice } })
	if (Number.isFinite(minCapacity))
		where.AND.push({ capacity: { gte: minCapacity } })
	if (Number.isFinite(maxCapacity))
		where.AND.push({ capacity: { lte: maxCapacity } })
	if (user?.role === 'owner') where.AND.push({ ownerId: user.id })
	if (where.AND.length === 0) return {}
	return where
}

export function buildHallOrder(query) {
	const orderBy = []
	if (query.sortPrice)
		orderBy.push({
			pricePerSeat: query.sortPrice === 'desc' ? 'desc' : 'asc',
		})
	if (query.sortCapacity)
		orderBy.push({
			capacity: query.sortCapacity === 'desc' ? 'desc' : 'asc',
		})
	return orderBy.length ? orderBy : [{ createdAt: 'desc' }]
}

export { TASHKENT_DISTRICTS }
