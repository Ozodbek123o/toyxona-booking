import prisma from '../lib/prisma.js'
import { districtToDb } from './dbEnums.js'
import { normalizeDate } from './hall.js'
import { createUser } from './users.js'
import { advanceAmount, calculateTotal } from './price.js'

const photos = [
	'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=80',
	'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=1200&q=80',
	'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1200&q=80',
]

function dateAfter(days) {
	const date = new Date()
	date.setDate(date.getDate() + days)
	return normalizeDate(date)
}

async function createHallWithServices({
	ownerId,
	name,
	district,
	address,
	capacity,
	pricePerSeat,
	phone,
	status,
	images,
	singers,
	cars,
	menus,
	karnay,
}) {
	return prisma.weddingHall.create({
		data: {
			ownerId,
			name,
			district: districtToDb(district),
			address,
			capacity,
			pricePerSeat,
			phoneNumber: phone,
			status: status === 'approved' ? 'APPROVED' : 'PENDING',
			hasKarnaySurnay: Boolean(karnay?.available),
			karnaySurnayPrice: karnay?.available ? karnay.price : null,
			images: {
				create: images.map(imageUrl => ({ imageUrl })),
			},
			singers: {
				create: singers.map(s => ({
					name: s.name,
					price: s.price,
					imageUrl: s.imageUrl || null,
				})),
			},
			cars: {
				create: cars.map(c => ({
					brand: c.brand,
					price: c.price,
					imageUrl: c.imageUrl || null,
				})),
			},
			menus: {
				create: menus.map(m => ({
					name: m.name,
					imageUrl: m.imageUrl || null,
				})),
			},
		},
		include: { singers: true, cars: true, menus: true },
	})
}

export async function seedDemoData() {
	const hallCount = await prisma.weddingHall.count()
	if (hallCount > 0) return

	const owners = await Promise.all([
		createUser({
			firstName: 'Aziz',
			lastName: 'Karimov',
			phone: '+998901001001',
			email: 'aziz@royal.uz',
			username: 'toyxona_owner',
			password: 'Owner12345!',
			role: 'owner',
			isVerified: true,
		}),
		createUser({
			firstName: 'Dilshod',
			lastName: 'Nazarov',
			phone: '+998901001002',
			email: 'dilshod@grand.uz',
			username: 'dilshod_owner',
			password: 'Owner12345!',
			role: 'owner',
			isVerified: true,
		}),
	])

	const customers = await Promise.all([
		createUser({
			firstName: 'Ali',
			lastName: 'Valiyev',
			phone: '+998901112233',
			username: 'ozod_customer',
			password: 'User12345!',
			role: 'user',
			isVerified: true,
		}),
		createUser({
			firstName: 'Malika',
			lastName: 'Tursunova',
			phone: '+998935556677',
			username: '+998935556677',
			password: 'User12345!',
			role: 'user',
			isVerified: true,
		}),
	])

	const hall1 = await createHallWithServices({
		ownerId: owners[0].id,
		name: 'Yulduz To’yxonasi',
		district: 'Yunusobod',
		address: 'Yunusobod tumani, 4-kvartal',
		capacity: 500,
		pricePerSeat: 150000,
		phone: '+998712223344',
		status: 'approved',
		images: [photos[0], photos[1]],
		karnay: { available: true, price: 800000 },
		singers: [
			{ name: 'Anvar Sanayev', price: 5000000 },
			{ name: 'Munisa Rizayeva', price: 12000000 },
		],
		cars: [
			{ brand: 'Mercedes-Benz S-Class', price: 1500000 },
			{ brand: 'Rolls-Royce Ghost', price: 4000000 },
		],
		menus: [
			{ name: 'Palov standart menu' },
			{ name: 'Yevropa premium menu' },
		],
	})

	const formattedHall = {
		pricePerSeat: 150000,
		services: {
			singers: hall1.singers.map(s => ({ _id: s.id, price: Number(s.price) })),
			cars: hall1.cars.map(c => ({ _id: c.id, price: Number(c.price) })),
			menus: [],
			karnaySurnay: { available: true, price: 800000 },
		},
	}
	const selected = {
		singers: [hall1.singers[0].id],
		cars: [],
		menus: [],
		karnaySurnay: true,
	}
	const seats = 300
	const total = calculateTotal(formattedHall, seats, selected)
	const deposit = advanceAmount(total)

	const booking = await prisma.booking.create({
		data: {
			customerId: customers[0].id,
			hallId: hall1.id,
			bookingDate: dateAfter(14),
			guestCount: seats,
			totalPrice: total,
			depositPaid: deposit,
			status: 'UPCOMING',
			services: {
				create: [
					{
						serviceType: 'SINGER',
						serviceItemId: hall1.singers[0].id,
						price: hall1.singers[0].price,
					},
					{
						serviceType: 'KARNAY_SURNAY',
						serviceItemId: null,
						price: 800000,
					},
				],
			},
		},
	})

	await createHallWithServices({
		ownerId: owners[1].id,
		name: 'Visol Maskani',
		district: 'Chilonzor',
		address: 'Chilonzor tumani, Bunyodkor ko‘chasi',
		capacity: 350,
		pricePerSeat: 120000,
		phone: '+998715556677',
		status: 'pending',
		images: [photos[2]],
		karnay: { available: false },
		singers: [{ name: 'Setora guruhi', price: 6000000 }],
		cars: [{ brand: 'Toyota Camry', price: 900000 }],
		menus: [{ name: 'Milliy to‘y menyusi' }],
	})

	console.log(
		`Demo data seeded (hall ${hall1.id}, booking ${booking.id})`,
	)
}
