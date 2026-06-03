import { randomUUID } from 'crypto'
import prisma from '../lib/prisma.js'
import { ensureServiceIds } from './format.js'
import { normalizeDate } from './hall.js'
import { createUser } from './users.js'

const photos = [
	'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=80',
	'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=1200&q=80',
	'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1200&q=80',
	'https://images.unsplash.com/photo-1507504031003-b417219a0fde?auto=format&fit=crop&w=1200&q=80',
	'https://images.unsplash.com/photo-1524777313293-86d2ab467344?auto=format&fit=crop&w=1200&q=80',
	'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?auto=format&fit=crop&w=1200&q=80',
]

const menuPhotos = [
	'https://images.unsplash.com/photo-1543352634-a1c51d9f1fa7?auto=format&fit=crop&w=800&q=80',
	'https://images.unsplash.com/photo-1600891964599-f61ba0e24092?auto=format&fit=crop&w=800&q=80',
	'https://images.unsplash.com/photo-1574484284002-952d92456975?auto=format&fit=crop&w=800&q=80',
]

function dateAfter(days) {
	const date = new Date()
	date.setDate(date.getDate() + days)
	return normalizeDate(date)
}

function item(name, price, photo, brand) {
	const base = { _id: randomUUID(), price }
	if (brand) return { ...base, brand, photo }
	return { ...base, name, photo }
}

function services(index) {
	return ensureServiceIds({
		singers: [
			item(
				index % 2 ? 'Munisa Rizayeva' : 'Jasur Umirov',
				7000000 + index * 300000,
				'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?auto=format&fit=crop&w=600&q=80',
			),
			item(
				index % 2 ? 'Botir Qodirov' : 'Setora guruhi',
				5000000 + index * 250000,
				'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=600&q=80',
			),
		],
		karnaySurnay: { available: true, price: 1500000 + index * 100000 },
		menus: [
			item('Milliy premium menu', 12000000 + index * 500000, menuPhotos[0]),
			item('Yevropa assorti', 15000000 + index * 500000, menuPhotos[1]),
			item('Desert va mevalar seti', 5000000 + index * 200000, menuPhotos[2]),
		],
		cars: [
			item(
				null,
				2500000 + index * 100000,
				'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=800&q=80',
				'Mercedes-Benz S-Class',
			),
			item(
				null,
				1300000 + index * 80000,
				'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&w=800&q=80',
				'Toyota Camry',
			),
		],
	})
}

export async function seedDemoData() {
	const hallCount = await prisma.hall.count()
	if (hallCount > 0) return

	const owners = await Promise.all([
		createUser({
			firstName: 'Aziz',
			lastName: 'Karimov',
			email: 'aziz@royal.uz',
			username: 'aziz_owner',
			password: 'Owner12345!',
			role: 'owner',
			isVerified: true,
		}),
		createUser({
			firstName: 'Dilshod',
			lastName: 'Nazarov',
			email: 'dilshod@grand.uz',
			username: 'dilshod_owner',
			password: 'Owner12345!',
			role: 'owner',
			isVerified: true,
		}),
		createUser({
			firstName: 'Madina',
			lastName: 'Saidova',
			email: 'madina@crystal.uz',
			username: 'madina_owner',
			password: 'Owner12345!',
			role: 'owner',
			isVerified: true,
		}),
	])

	const users = await Promise.all([
		createUser({
			firstName: 'Ali',
			lastName: 'Valiyev',
			phone: '+998901112233',
			username: '+998901112233',
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

	const hallData = [
		{
			name: 'Royal Garden Palace',
			description:
				'Bog‘ manzarali, katta sahnali va premium servisli hashamatli zal.',
			badge: 'Premium',
			rating: 4.9,
			amenities: ['VIP xona', 'LED ekran', 'Valet parking', 'Bolalar zonasi'],
			photos: [
				{ url: photos[0], name: 'royal' },
				{ url: photos[1], name: 'royal-2' },
			],
			district: 'Yunusabad',
			address: 'Amir Temur shoh ko‘chasi, 108',
			capacity: 650,
			pricePerSeat: 185000,
			phone: '+998901001010',
			ownerId: owners[0].id,
			status: 'approved',
			services: services(1),
		},
		{
			name: 'Crystal Hall Tashkent',
			description:
				'Kristall lyustralar, professional dekor va zamonaviy ovoz tizimi.',
			badge: 'Top tanlov',
			rating: 4.8,
			amenities: ['Dekor', 'Fotostudiya', 'Katta sahna', 'Klimat nazorat'],
			photos: [
				{ url: photos[1], name: 'crystal' },
				{ url: photos[2], name: 'crystal-2' },
			],
			district: 'Chilanzar',
			address: 'Bunyodkor prospekti, 45',
			capacity: 520,
			pricePerSeat: 155000,
			phone: '+998909991122',
			ownerId: owners[1].id,
			status: 'approved',
			services: services(2),
		},
		{
			name: 'Emerald Plaza',
			description:
				'Ixcham oilaviy to‘ylar uchun nafis interyer va qulay lokatsiya.',
			badge: 'Oilaviy',
			rating: 4.7,
			amenities: ['Avtoturargoh', 'Live band', 'Dekor paketi'],
			photos: [
				{ url: photos[2], name: 'emerald' },
				{ url: photos[3], name: 'emerald-2' },
			],
			district: 'Yakkasaray',
			address: 'Shota Rustaveli ko‘chasi, 22',
			capacity: 380,
			pricePerSeat: 130000,
			phone: '+998977771212',
			ownerId: owners[2].id,
			status: 'approved',
			services: services(3),
		},
		{
			name: 'Samarqand Darvoza Banquet',
			description: 'Milliy uslub, keng zal va osh markazi bilan to‘liq xizmat.',
			badge: 'Milliy uslub',
			rating: 4.6,
			amenities: ['Osh markazi', 'Karnay-surnay', 'Milliy dekor', 'Generator'],
			photos: [
				{ url: photos[3], name: 'darvoza' },
				{ url: photos[4], name: 'darvoza-2' },
			],
			district: 'Shaykhantahur',
			address: 'Beruniy ko‘chasi, 31',
			capacity: 700,
			pricePerSeat: 145000,
			phone: '+998946661010',
			ownerId: owners[0].id,
			status: 'approved',
			services: services(4),
		},
		{
			name: 'Skyline Wedding Loft',
			description:
				'Panorama ko‘rinishli loft formatidagi zamonaviy to‘y maydoni.',
			badge: 'Yangi format',
			rating: 4.9,
			amenities: ['Panorama', 'Rooftop', 'DJ booth', 'Photo zone'],
			photos: [
				{ url: photos[4], name: 'skyline' },
				{ url: photos[5], name: 'skyline-2' },
			],
			district: 'Mirabad',
			address: 'Afrosiyob ko‘chasi, 12',
			capacity: 300,
			pricePerSeat: 210000,
			phone: '+998998889900',
			ownerId: owners[1].id,
			status: 'approved',
			services: services(5),
		},
		{
			name: 'Navro‘z Grand Hall',
			description: 'Yangi qo‘shilgan to‘yxona, admin tasdiqlashini kutmoqda.',
			badge: 'Tekshiruvda',
			rating: 4.4,
			amenities: ['Katta zal', 'Dekor', 'Parking'],
			photos: [
				{ url: photos[5], name: 'navroz' },
				{ url: photos[0], name: 'navroz-2' },
			],
			district: 'Sergeli',
			address: 'Yangi Sergeli yo‘li, 7',
			capacity: 480,
			pricePerSeat: 120000,
			phone: '+998933331010',
			ownerId: owners[2].id,
			status: 'pending',
			services: services(6),
		},
	]

	const halls = []
	for (const h of hallData) {
		halls.push(
			await prisma.hall.create({
				data: {
					ownerId: h.ownerId,
					name: h.name,
					district: h.district,
					address: h.address,
					capacity: h.capacity,
					pricePerSeat: h.pricePerSeat,
					phone: h.phone,
					status: h.status,
					hasKarnaySurnay: Boolean(h.services.karnaySurnay.available),
					karnaySurnayPrice: h.services.karnaySurnay.available
						? h.services.karnaySurnay.price
						: null,
					images: {
						create: h.photos.map(photo => ({ imageUrl: photo.url })),
					},
					singers: {
						create: h.services.singers.map(singer => ({
							name: singer.name,
							price: singer.price,
							imageUrl: singer.photo,
						})),
					},
					menus: {
						create: h.services.menus.map(menu => ({
							name: menu.name,
							imageUrl: menu.photo,
						})),
					},
					cars: {
						create: h.services.cars.map(car => ({
							brand: car.brand,
							price: car.price,
							imageUrl: car.photo,
						})),
					},
				},
				include: { singers: true, cars: true, menus: true },
			}),
		)
	}

	const s0 = hallData[0].services
	const b0Total =
		420 * Number(halls[0].pricePerSeat) +
		s0.singers[0].price +
		s0.karnaySurnay.price +
		s0.cars[0].price
	const s1 = hallData[1].services
	const b1Total =
		300 * Number(halls[1].pricePerSeat) + s1.singers[1].price
	const s3 = hallData[3].services
	const b2Total =
		550 * Number(halls[3].pricePerSeat) +
		s3.karnaySurnay.price +
		s3.cars[1].price

	const demoBookings = [
			{
				hallId: halls[0].id,
				userId: users[0].id,
				date: dateAfter(3),
				seats: 420,
				totalPrice: b0Total,
				advancePaid: Math.round(b0Total * 0.2),
				services: {
					create: [
						{
							serviceType: 'singer',
							serviceItemId: halls[0].singers[0].id,
							price: s0.singers[0].price,
						},
						{
							serviceType: 'car',
							serviceItemId: halls[0].cars[0].id,
							price: s0.cars[0].price,
						},
						{
							serviceType: 'karnay_surnay',
							serviceItemId: null,
							price: s0.karnaySurnay.price,
						},
					],
				},
			},
			{
				hallId: halls[1].id,
				userId: users[1].id,
				date: dateAfter(7),
				seats: 300,
				totalPrice: b1Total,
				advancePaid: Math.round(b1Total * 0.2),
				services: {
					create: [
						{
							serviceType: 'singer',
							serviceItemId: halls[1].singers[1].id,
							price: s1.singers[1].price,
						},
					],
				},
			},
			{
				hallId: halls[3].id,
				userId: users[0].id,
				date: dateAfter(12),
				seats: 550,
				totalPrice: b2Total,
				advancePaid: Math.round(b2Total * 0.2),
				services: {
					create: [
						{
							serviceType: 'car',
							serviceItemId: halls[3].cars[1].id,
							price: s3.cars[1].price,
						},
						{
							serviceType: 'karnay_surnay',
							serviceItemId: null,
							price: s3.karnaySurnay.price,
						},
					],
				},
			},
		]
	for (const booking of demoBookings) await prisma.booking.create({ data: booking })

	console.log('Demo data seeded to PostgreSQL')
}
