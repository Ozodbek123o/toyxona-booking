import {
	addMonths,
	format,
	startOfMonth,
	endOfMonth,
	eachDayOfInterval,
} from 'date-fns'
import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

const WEEKDAYS = ['Du', 'Se', 'Cho', 'Pay', 'Ju', 'Sha', 'Yak']

export default function HallCalendar({
	bookings = [],
	selectedDate,
	onSelectDate,
	canViewBooked = false,
}) {
	const [month, setMonth] = useState(startOfMonth(new Date()))
	const [modal, setModal] = useState(null)

	const bookedMap = useMemo(() => {
		const map = new Map()
		bookings.forEach(b => {
			const key = format(new Date(b.date), 'yyyy-MM-dd')
			map.set(key, b)
		})
		return map
	}, [bookings])

	const days = useMemo(() => {
		const start = startOfMonth(month)
		const end = endOfMonth(month)
		const pad = (start.getDay() + 6) % 7
		const all = eachDayOfInterval({ start, end })
		return [...Array(pad).fill(null), ...all]
	}, [month])

	const today = new Date().setHours(0, 0, 0, 0)

	function handleDayClick(key, past, booking) {
		if (past || !key) return
		if (booking && canViewBooked) {
			setModal(booking)
			return
		}
		if (!booking) onSelectDate?.(key)
	}

	return (
		<>
			<div className="cal-nav">
				<button
					type="button"
					className="ghost sm"
					onClick={() => setMonth(m => addMonths(m, -1))}
				>
					<ChevronLeft size={18} />
				</button>
				<b>{format(month, 'MMMM yyyy')}</b>
				<button
					type="button"
					className="ghost sm"
					onClick={() => setMonth(m => addMonths(m, 1))}
				>
					<ChevronRight size={18} />
				</button>
			</div>
			<div className="weekdays">
				{WEEKDAYS.map(d => (
					<span key={d}>{d}</span>
				))}
			</div>
			<div className="calendar">
				{days.map((d, i) => {
					if (!d) return <span key={`pad-${i}`} className="cal-pad" />
					const key = format(d, 'yyyy-MM-dd')
					const past = d < today
					const booking = bookedMap.get(key)
					const isBooked = !!booking
					let cls = 'free'
					if (past) cls = 'past'
					else if (isBooked) cls = 'booked'
					else if (selectedDate === key) cls = 'selected'
					return (
						<button
							key={key}
							type="button"
							disabled={past || (isBooked && !canViewBooked)}
							className={cls}
							onClick={() => handleDayClick(key, past, booking)}
							title={
								isBooked
									? canViewBooked
										? 'Bron ma’lumoti'
										: 'Band kun'
									: 'Bo’sh'
							}
						>
							{format(d, 'd')}
						</button>
					)
				})}
			</div>
			<div className="legend">
				<span>
					<i className="free-dot" />
					Bo’sh
				</span>
				<span>
					<i className="booked-dot" />
					Band
				</span>
				<span>
					<i className="past-dot" />
					O’tgan
				</span>
			</div>

			{modal && (
				<div className="modal-overlay" onClick={() => setModal(null)}>
					<div className="modal card" onClick={e => e.stopPropagation()}>
						<button
							type="button"
							className="modal-close"
							onClick={() => setModal(null)}
						>
							<X size={18} />
						</button>
						<h3>Bron ma’lumoti</h3>
						{modal.user ? (
							<>
								<p>
									<b>
										{modal.user.firstName} {modal.user.lastName}
									</b>
								</p>
								<p>Telefon: {modal.user.phone || '—'}</p>
							</>
						) : (
							<p className="muted">Band kun</p>
						)}
						<p>Odam soni: {modal.seats}</p>
						<p>Sana: {format(new Date(modal.date), 'dd.MM.yyyy')}</p>
					</div>
				</div>
			)}
		</>
	)
}
