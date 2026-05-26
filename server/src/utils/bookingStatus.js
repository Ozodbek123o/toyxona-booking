export const BOOKING_STATUS = {
	UPCOMING: "endi bo'ladigan",
	PAST: "bo'lib o'tgan",
}

export function bookingStatus(date) {
	return new Date(date) < new Date().setHours(0, 0, 0, 0)
		? BOOKING_STATUS.PAST
		: BOOKING_STATUS.UPCOMING
}
