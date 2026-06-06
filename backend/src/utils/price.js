function findPrice(list, id) {
	if (!list || !id) return 0
	const item = list.find(x => String(x._id || x.id) === String(id))
	return item?.price || 0
}

export function calculateTotal(hall, seats, selected = {}) {
	const s = hall.services || {}
	let total = seats * (hall.pricePerSeat || 0)
	for (const id of selected.singers || []) total += findPrice(s.singers, id)
	if (selected.karnaySurnay) total += s.karnaySurnay?.price || 0
	for (const id of selected.cars || []) total += findPrice(s.cars, id)
	for (const id of selected.menus || []) total += findPrice(s.menus, id)
	return total
}

export function advanceAmount(total) {
	return Math.round(total * 0.2)
}
