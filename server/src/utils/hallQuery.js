import { TASHKENT_DISTRICTS } from './hall.js'

export function buildHallWhere(query, role, user) {
	const where = { AND: [] }
	if (role === 'user') where.AND.push({ status: 'approved' })
	if (query.status) where.AND.push({ status: query.status })
	if (query.district) where.AND.push({ district: query.district })
	if (query.search) {
		where.AND.push({
			OR: [
				{ name: { contains: query.search, mode: 'insensitive' } },
				{ address: { contains: query.search, mode: 'insensitive' } },
			],
		})
	}
	if (query.minPrice)
		where.AND.push({ pricePerSeat: { gte: Number(query.minPrice) } })
	if (query.maxPrice)
		where.AND.push({ pricePerSeat: { lte: Number(query.maxPrice) } })
	if (query.minCapacity)
		where.AND.push({ capacity: { gte: Number(query.minCapacity) } })
	if (query.maxCapacity)
		where.AND.push({ capacity: { lte: Number(query.maxCapacity) } })
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
