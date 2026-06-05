export const emptyServices = () => ({
	singers: [],
	karnaySurnay: { available: false, price: 0 },
	menus: [],
	cars: [],
})

export const emptyHall = () => ({
	name: '',
	description: '',
	badge: '',
	rating: 4.5,
	amenitiesText: '',
	district: 'Chilanzar',
	address: '',
	capacity: 200,
	pricePerSeat: 100000,
	phone: '',
	services: emptyServices(),
	photos: [],
	status: 'approved',
})

export function hallToForm(hall) {
	if (!hall) return emptyHall()
	return {
		name: hall.name || '',
		description: hall.description || '',
		badge: hall.badge || '',
		rating: hall.rating ?? 4.5,
		amenitiesText: (hall.amenities || []).join(', '),
		district: hall.district || 'Chilanzar',
		address: hall.address || '',
		capacity: hall.capacity || 0,
		pricePerSeat: hall.pricePerSeat || 0,
		phone: hall.phone || '',
		services: {
			singers: (hall.services?.singers || []).map(s => ({
				name: s.name,
				price: s.price,
				photo: s.photo || '',
			})),
			karnaySurnay: {
				available: hall.services?.karnaySurnay?.available || false,
				price: hall.services?.karnaySurnay?.price || 0,
			},
			menus: (hall.services?.menus || []).map(m => ({
				name: m.name,
				photo: m.photo || '',
				price: m.price || 0,
			})),
			cars: (hall.services?.cars || []).map(c => ({
				brand: c.brand,
				price: c.price,
				photo: c.photo || '',
			})),
		},
		photos: hall.photos || [],
		owner: hall.owner?._id || hall.owner || '',
		status: hall.status || 'pending',
	}
}

export function buildHallFormData(form, photoFiles = [], options = {}) {
	const fd = new FormData()
	fd.append('name', form.name)
	fd.append('description', form.description || '')
	fd.append('badge', form.badge || '')
	fd.append('rating', String(form.rating || 4.5))
	fd.append(
		'amenities',
		JSON.stringify(
			(form.amenitiesText || '')
				.split(',')
				.map(s => s.trim())
				.filter(Boolean),
		),
	)
	fd.append('district', form.district)
	fd.append('address', form.address)
	fd.append('capacity', String(form.capacity))
	fd.append('pricePerSeat', String(form.pricePerSeat))
	fd.append('phone', form.phone)
	const services = {
		singers: form.services.singers.map(s => ({
			name: s.name,
			price: Number(s.price) || 0,
			photo: s.photo || '',
		})),
		karnaySurnay: {
			available: !!form.services.karnaySurnay.available,
			price: Number(form.services.karnaySurnay.price) || 0,
		},
		menus: form.services.menus.map(m => ({
			name: m.name,
			photo: m.photo || '',
			price: Number(m.price) || 0,
		})),
		cars: form.services.cars.map(c => ({
			brand: c.brand,
			price: Number(c.price) || 0,
			photo: c.photo || '',
		})),
	}
	fd.append('services', JSON.stringify(services))
	if (form.photos?.length)
		fd.append('existingPhotos', JSON.stringify(form.photos))
	if (options.ownerId) fd.append('owner', options.ownerId)
	if (options.status) fd.append('status', options.status)
	photoFiles.forEach(f => fd.append('photos', f))
	return fd
}
