import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { CalendarX, Filter } from 'lucide-react'
import { api } from '../api/api'
import { useAuth } from '../context/AuthContext'
import { BOOKING_STATUS, DISTRICTS } from '../constants'

export default function Bookings() {
	const { user } = useAuth()
	const [items, setItems] = useState([])
	const [halls, setHalls] = useState([])
	const [filters, setFilters] = useState({
		status: '',
		district: '',
		hall: '',
		sortDate: 'asc',
		sortHall: '',
		date: '',
		dateFrom: '',
		dateTo: '',
	})

	const load = async (f = filters) => {
		try {
			const params = new URLSearchParams()
			Object.entries(f).forEach(([k, v]) => v && params.set(k, v))
			const { data } = await api.get(`/bookings?${params}`)
			setItems(Array.isArray(data) ? data : [])
		} catch (err) {
			setItems([])
			toast.error(err.response?.data?.message || 'Bronlarni yuklab bo‘lmadi')
		}
	}

	useEffect(() => {
		load()
		if (user?.role === 'admin' || user?.role === 'owner') {
			api.get('/halls').then(r => {
				const list =
					user.role === 'owner'
						? r.data.filter(
								h =>
									String(h.owner?._id || h.owner) === String(user.id),
							)
						: r.data
				setHalls(list)
			})
		}
	}, [user])

	function change(e) {
		const next = { ...filters, [e.target.name]: e.target.value }
		setFilters(next)
		load(next)
	}

	async function cancel(id) {
		if (!confirm('Bronni bekor qilasizmi?')) return
		try {
			await api.delete(`/bookings/${id}`)
			toast.success('Bron bekor qilindi')
			load()
		} catch (err) {
			toast.error(err.response?.data?.message || 'Xatolik')
		}
	}

	const title =
		user?.role === 'admin'
			? 'Barcha bronlar'
			: user?.role === 'owner'
				? 'Mening to’yxonalarimdagi bronlar'
				: 'Mening bronlarim'

	return (
		<section className="card bookings-page">
			<div className="section-head">
				<div>
					<h1>{title}</h1>
					<p>Filter va tartiblash orqali qidiring.</p>
				</div>
			</div>

			<div className="filters mini">
				<div className="mini-filter">
					<Filter size={16} />
					<select name="status" value={filters.status} onChange={change}>
						<option value="">Barcha statuslar</option>
						<option value={BOOKING_STATUS.UPCOMING}>
							Endi bo’ladigan
						</option>
						<option value={BOOKING_STATUS.PAST}>Bo’lib o’tgan</option>
					</select>
				</div>
				<select name="sortDate" value={filters.sortDate} onChange={change}>
					<option value="asc">Sana ↑</option>
					<option value="desc">Sana ↓</option>
				</select>
				<input
					type="date"
					name="date"
					value={filters.date}
					onChange={change}
					title="Aniq sana"
				/>
				<input
					type="date"
					name="dateFrom"
					value={filters.dateFrom}
					onChange={change}
					title="Dan"
				/>
				<input
					type="date"
					name="dateTo"
					value={filters.dateTo}
					onChange={change}
					title="Gacha"
				/>
				{(user?.role === 'admin' || user?.role === 'owner') && (
					<>
						<select name="hall" value={filters.hall} onChange={change}>
							<option value="">Barcha to’yxonalar</option>
							{halls.map(h => (
								<option key={h._id} value={h._id}>
									{h.name}
								</option>
							))}
						</select>
						<select name="district" value={filters.district} onChange={change}>
							<option value="">Barcha rayonlar</option>
							{DISTRICTS.map(d => (
								<option key={d} value={d}>
									{d}
								</option>
							))}
						</select>
						<select name="sortHall" value={filters.sortHall} onChange={change}>
							<option value="">To’yxona nomi</option>
							<option value="asc">A → Z</option>
							<option value="desc">Z → A</option>
						</select>
					</>
				)}
			</div>

			<div className="table">
				<table>
					<thead>
						<tr>
							<th>ID</th>
							<th>To’yxona</th>
							<th>Rayon</th>
							<th>Sana</th>
							<th>Odam</th>
							<th>Kim</th>
							<th>Jami</th>
							<th>Avans 20%</th>
							<th>Status</th>
							<th></th>
						</tr>
					</thead>
					<tbody>
						{items.length === 0 && (
							<tr>
								<td colSpan={10} className="muted">
									Bronlar topilmadi
								</td>
							</tr>
						)}
						{items.map(b => {
							const isPast = b.computedStatus === BOOKING_STATUS.PAST
							const canCancel =
								user?.role === 'admin' ||
								user?.role === 'owner' ||
								!isPast
							return (
								<tr key={b._id}>
									<td>#{String(b._id ?? b.id).padStart(6, '0')}</td>
									<td>
										<b>{b.hall?.name}</b>
									</td>
									<td>{b.hall?.district}</td>
									<td>
										{new Date(b.date).toLocaleDateString('uz-UZ')}
									</td>
									<td>{b.seats}</td>
									<td>
										{b.user?.firstName} {b.user?.lastName}
										<br />
										<small>{b.user?.phone}</small>
									</td>
									<td>{b.totalPrice?.toLocaleString()} so’m</td>
									<td>{b.advancePaid?.toLocaleString()} so’m</td>
									<td>
										<span className="status-pill">
											{b.computedStatus}
										</span>
									</td>
									<td>
										{canCancel && (
											<button
												type="button"
												className="danger sm"
												onClick={() => cancel(b._id)}
											>
												<CalendarX size={16} /> Bekor
											</button>
										)}
									</td>
								</tr>
							)
						})}
					</tbody>
				</table>
			</div>
		</section>
	)
}
