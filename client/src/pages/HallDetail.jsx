import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
	CalendarDays,
	CheckCircle2,
	MapPin,
	Music,
	Phone,
	Star,
	Utensils,
	Car,
} from 'lucide-react'
import { api, API_URL } from '../api/api'
import { useAuth } from '../context/AuthContext'
import HallCalendar from '../components/HallCalendar'
import { calculateTotal, advanceAmount, paymentSuccessMessage } from '../utils/price'

export default function HallDetail() {
	const { id } = useParams()
	const { user } = useAuth()
	const nav = useNavigate()
	const [data, setData] = useState(null)
	const [date, setDate] = useState('')
	const [seats, setSeats] = useState(100)
	const [selectedServices, setSelectedServices] = useState({
		singers: [],
		cars: [],
		menus: [],
		karnaySurnay: false,
	})

	useEffect(() => {
		api
			.get(`/halls/${id}`)
			.then(res => setData(res.data))
			.catch(() => {
				toast.error('To’yxona topilmadi')
				nav('/')
			})
	}, [id])

	if (!data)
		return (
			<section className="card">
				<h2>Yuklanmoqda...</h2>
			</section>
		)

	const { hall, bookings } = data
	const isOwner =
		user?.role === 'owner' &&
		String(hall.owner?._id || hall.owner) === String(user.id)
	const canViewBooked = user?.role === 'admin' || isOwner
	const isPublicUser = !user || user.role === 'user'
	const canBook = hall.status === 'approved' && isPublicUser
	const total = calculateTotal(hall, seats, selectedServices)
	const advance = advanceAmount(total)

	const img = hall.photos?.[0]?.url?.startsWith('http')
		? hall.photos[0].url
		: hall.photos?.[0]?.url
			? API_URL + hall.photos[0].url
			: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=80'

	const toggle = (type, val) =>
		setSelectedServices(s => ({
			...s,
			[type]: s[type].includes(val)
				? s[type].filter(x => x !== val)
				: [...s[type], val],
		}))

	async function book() {
		if (!user) {
			sessionStorage.setItem(
				'pendingBooking',
				JSON.stringify({ hallId: id, date, seats, selectedServices }),
			)
			toast.error('Avval login qiling')
			nav('/login')
			return
		}
		if (!date) return toast.error('Sana tanlang')
		try {
			const { data: created } = await api.post('/bookings', {
				hallId: id,
				date,
				seats,
				selectedServices,
			})
			sessionStorage.removeItem('pendingBooking')
			const paid = created.advancePaid ?? advance
			toast.success(paymentSuccessMessage(created.totalPrice || total))
			nav('/bookings')
		} catch (err) {
			toast.error(err.response?.data?.message || 'Bron qilishda xatolik')
		}
	}

	return (
		<section className="detail-page">
			<div className="detail-hero card">
				{hall.photos?.length > 1 ? (
					<div className="gallery">
						{hall.photos.map((p, i) => (
							<img
								key={i}
								className={i === 0 ? 'cover' : 'thumb'}
								src={
									p.url?.startsWith('http') ? p.url : API_URL + p.url
								}
								alt=""
							/>
						))}
					</div>
				) : (
					<img className="cover" src={img} alt="" />
				)}
				<div className="detail-title">
					<span className="badge big">{hall.badge || 'Premium'}</span>
					<h1>{hall.name}</h1>
					<p>{hall.description}</p>
					{(hall.amenities || []).length > 0 && (
						<div className="chips">
							{hall.amenities.map(a => (
								<span key={a}>{a}</span>
							))}
						</div>
					)}
					<div className="meta">
						<span>
							<MapPin size={16} />
							{hall.district}, {hall.address}
						</span>
						<span>
							<Phone size={16} />
							{hall.phone}
						</span>
						<span>
							<Star size={16} fill="currentColor" />
							{hall.rating || 4.7}
						</span>
					</div>
				</div>
			</div>

			<div className="detail">
				<div className="card">
					<h2>
						<CalendarDays /> Bandlik kalendari
					</h2>
					<HallCalendar
						bookings={bookings}
						selectedDate={date}
						onSelectDate={setDate}
						canViewBooked={canViewBooked}
					/>
				</div>

				{canBook && (
					<div className="card booking-box">
						<h2>Bron qilish</h2>
						<label>
							Odam soni
							<input
								type="number"
								min="1"
								max={hall.capacity}
								value={seats}
								onChange={e => setSeats(Number(e.target.value))}
							/>
						</label>
						<div className="service-list">
							<h3>
								<Music /> Honandalar
							</h3>
							{hall.services.singers?.map(s => (
								<label className="service" key={s._id}>
									<input
										type="checkbox"
										onChange={() => toggle('singers', s._id)}
									/>
									<span>{s.name}</span>
									<b>{s.price?.toLocaleString()}</b>
								</label>
							))}
							<h3>
								<Utensils /> Menu
							</h3>
							{hall.services.menus?.map(m => (
								<label className="service" key={m._id}>
									<input
										type="checkbox"
										onChange={() => toggle('menus', m._id)}
									/>
									<span>{m.name}</span>
									<b>{(m.price || 0).toLocaleString()}</b>
								</label>
							))}
							<h3>
								<Car /> Mashina
							</h3>
							{hall.services.cars?.map(c => (
								<label className="service" key={c._id}>
									<input
										type="checkbox"
										onChange={() => toggle('cars', c._id)}
									/>
									<span>{c.brand}</span>
									<b>{c.price?.toLocaleString()}</b>
								</label>
							))}
							{hall.services.karnaySurnay?.available && (
								<label className="service">
									<input
										type="checkbox"
										onChange={e =>
											setSelectedServices(s => ({
												...s,
												karnaySurnay: e.target.checked,
											}))
										}
									/>
									<span>Karnay-surnay</span>
									<b>
										{hall.services.karnaySurnay?.price?.toLocaleString()}
									</b>
								</label>
							)}
						</div>
						<div className="price-card">
							<span>Jami summa</span>
							<b>{total.toLocaleString()} so’m</b>
							<small>
								Avans 20%: {advance.toLocaleString()} so’m
							</small>
						</div>
						<button type="button" className="full" onClick={book}>
							<CheckCircle2 /> To’lash va bron qilish
						</button>
					</div>
				)}

				{!canBook && (
					<div className="card">
						<p className="muted">
							{hall.status !== 'approved'
								? 'Bu to’yxona hali tasdiqlanmagan yoki mavjud emas.'
								: 'Bron qilish uchun foydalanuvchi sifatida kiring.'}
						</p>
					</div>
				)}
			</div>
		</section>
	)
}
