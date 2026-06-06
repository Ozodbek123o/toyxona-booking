import prisma from '../lib/prisma.js'
import {
	TASHKENT_DISTRICTS,
	districtFromDb,
	districtToDb,
	decimalToNumber,
	hallStatusToDb,
} from '../utils/dbEnums.js'
import { formatHall } from '../utils/format.js'

const hallInclude = {
	owner: {
		select: {
			id: true,
			firstName: true,
			lastName: true,
			username: true,
			email: true,
			phoneNumber: true,
		},
	},
	images: true,
	singers: true,
	cars: true,
	menus: true,
}

export async function findHallById(id) {
	const hallId = Number(id)
	if (!Number.isInteger(hallId)) return null
	return prisma.weddingHall.findUnique({
		where: { id: hallId },
		include: hallInclude,
	})
}

export async function findHallFormatted(id) {
	const hall = await findHallById(id)
	return hall ? formatHall(hall) : null
}

function imageUrlFromInput(item) {
	if (!item) return null
	if (typeof item === 'string') return item
	return item.url || item.imageUrl || null
}

function parseServicesPayload(services = {}) {
	return {
		singers: Array.isArray(services.singers) ? services.singers : [],
		cars: Array.isArray(services.cars) ? services.cars : [],
		menus: Array.isArray(services.menus) ? services.menus : [],
		karnaySurnay: services.karnaySurnay || { available: false, price: 0 },
	}
}

async function replaceHallChildren(tx, hallId, body, uploadedPhotos = []) {
	await tx.hallImage.deleteMany({ where: { hallId } })
	await tx.singer.deleteMany({ where: { hallId } })
	await tx.car.deleteMany({ where: { hallId } })
	await tx.menu.deleteMany({ where: { hallId } })

	const services = parseServicesPayload(body.services)
	const photoUrls = [
		...uploadedPhotos,
		...(body.existingPhotos || []).map(imageUrlFromInput).filter(Boolean),
	]

	if (photoUrls.length) {
		await tx.hallImage.createMany({
			data: photoUrls.map(imageUrl => ({ hallId, imageUrl })),
		})
	}

	if (services.singers.length) {
		await tx.singer.createMany({
			data: services.singers.map(s => ({
				hallId,
				name: s.name,
				price: Number(s.price) || 0,
				imageUrl: s.photo || s.imageUrl || null,
			})),
		})
	}

	if (services.cars.length) {
		await tx.car.createMany({
			data: services.cars.map(c => ({
				hallId,
				brand: c.brand,
				price: Number(c.price) || 0,
				imageUrl: c.photo || c.imageUrl || null,
			})),
		})
	}

	if (services.menus.length) {
		await tx.menu.createMany({
			data: services.menus.map(m => ({
				hallId,
				name: m.name,
				imageUrl: m.photo || m.imageUrl || null,
			})),
		})
	}
}

export function buildHallCoreData(body, ownerId, status) {
	const services = parseServicesPayload(body.services)
	const districtDb = districtToDb(body.district)
	if (!districtDb) throw new Error('Invalid district')

	const hasKarnay = Boolean(services.karnaySurnay?.available)
	const karnayPrice = hasKarnay
		? Number(services.karnaySurnay.price) || 0
		: null

	return {
		ownerId: Number(ownerId),
		name: body.name,
		district: districtDb,
		address: body.address,
		capacity: Number(body.capacity),
		pricePerSeat: Number(body.pricePerSeat),
		phoneNumber: body.phone,
		status: hallStatusToDb(status),
		hasKarnaySurnay: hasKarnay,
		karnaySurnayPrice: hasKarnay ? karnayPrice : null,
	}
}

export async function createHall({ body, ownerId, status, uploadedPhotos }) {
	const core = buildHallCoreData(body, ownerId, status)
	return prisma.$transaction(async tx => {
		const hall = await tx.weddingHall.create({ data: core })
		await replaceHallChildren(
			tx,
			hall.id,
			{
				services: body.services,
				existingPhotos: body.photos?.map(p => imageUrlFromInput(p)) || [],
			},
			uploadedPhotos,
		)
		return tx.weddingHall.findUnique({
			where: { id: hall.id },
			include: hallInclude,
		})
	})
}

export async function updateHall({ hallId, body, status, uploadedPhotos }) {
	const id = Number(hallId)
	const existing = await prisma.weddingHall.findUnique({ where: { id } })
	if (!existing) return null

	const core = buildHallCoreData(
		body,
		existing.ownerId,
		status ?? (existing.status === 'APPROVED' ? 'approved' : 'pending'),
	)

	return prisma.$transaction(async tx => {
		await tx.weddingHall.update({ where: { id }, data: core })
		const existingPhotos =
			body.existingPhotos ||
			(body.photos || []).map(imageUrlFromInput).filter(Boolean)
		await replaceHallChildren(
			tx,
			id,
			{ services: body.services, existingPhotos },
			uploadedPhotos,
		)
		return tx.weddingHall.findUnique({
			where: { id },
			include: hallInclude,
		})
	})
}

export function buildHallWhere(query, role, user) {
	const AND = []
	if (role === 'user') AND.push({ status: 'APPROVED' })
	if (['approved', 'pending'].includes(query.status))
		AND.push({ status: hallStatusToDb(query.status) })
	if (TASHKENT_DISTRICTS.includes(query.district))
		AND.push({ district: districtToDb(query.district) })
	if (query.search) {
		AND.push({
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
		AND.push({ pricePerSeat: { gte: minPrice } })
	if (Number.isFinite(maxPrice))
		AND.push({ pricePerSeat: { lte: maxPrice } })
	if (Number.isFinite(minCapacity))
		AND.push({ capacity: { gte: minCapacity } })
	if (Number.isFinite(maxCapacity))
		AND.push({ capacity: { lte: maxCapacity } })
	if (user?.role === 'owner') AND.push({ ownerId: Number(user.id) })
	return AND.length ? { AND } : {}
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

export { TASHKENT_DISTRICTS, districtFromDb, decimalToNumber, hallInclude }
