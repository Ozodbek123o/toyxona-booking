export const ADVANCE_RATE = 0.2

export function calculateTotal(hall, seats, selected = {}) {
	if (!hall) return 0
	let total = seats * (hall.pricePerSeat || 0)
	for (const sid of selected.singers || []) {
		const s = hall.services?.singers?.find(x => String(x._id) === String(sid))
		total += s?.price || 0
	}
	if (selected.karnaySurnay) total += hall.services?.karnaySurnay?.price || 0
	for (const cid of selected.cars || []) {
		const c = hall.services?.cars?.find(x => String(x._id) === String(cid))
		total += c?.price || 0
	}
	for (const mid of selected.menus || []) {
		const m = hall.services?.menus?.find(x => String(x._id) === String(mid))
		total += m?.price || 0
	}
	return total
}

export function advanceAmount(total) {
	return Math.round(total * ADVANCE_RATE)
}

export function paymentSuccessMessage(total) {
	const advance = advanceAmount(total)
	return `Muvaffaqiyatli to'landi! Avans (20%): ${advance.toLocaleString()} so'm to'landi. Bron qilindi!`
}
