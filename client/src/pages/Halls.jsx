import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'
import {
	CalendarCheck,
	MapPin,
	Search,
	ShieldCheck,
	Sparkles,
	Star,
	Users,
} from 'lucide-react'
import { api, API_URL } from '../api/api'
import HallFilters from '../components/HallFilters'

export default function Halls() {
	const [halls, setHalls] = useState([])
	const [stats, setStats] = useState(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState('')
	const [filters, setFilters] = useState({
		search: '',
		district: '',
		sortPrice: '',
		sortCapacity: '',
		minPrice: '',
		maxPrice: '',
		minCapacity: '',
		maxCapacity: '',
	})

	useEffect(() => {
		load()
		api
			.get('/halls/stats/overview')
			.then(res => setStats(res.data))
			.catch(() => {})
	}, [])

	useEffect(() => {
		load(filters)
	}, [filters])

	async function load(next = filters) {
		setLoading(true)
		setError('')
		try {
			const params = new URLSearchParams({ public: 'true' })
			Object.entries(next).forEach(([key, value]) => value && params.set(key, value))
			const { data } = await api.get(`/halls?${params}`)
			setHalls(Array.isArray(data) ? data : [])
		} catch (err) {
			setHalls([])
			const message =
				err.response?.data?.message || 'To’yxonalarni yuklab bo‘lmadi'
			setError(message)
			toast.error(message)
		} finally {
			setLoading(false)
		}
	}

	const cheapest = useMemo(
		() =>
			halls.reduce(
				(min, h) => Math.min(min, h.pricePerSeat || min),
				halls[0]?.pricePerSeat || 0,
			),
		[halls],
	)

	return (
		<section>
			<div className="hero hero-grid">
				<div>
					<span className="eyebrow">
						<Sparkles size={16} /> Toshkentdagi eng qulay bron platformasi
					</span>
					<h1>To’yingiz uchun ideal to’yxonani 3 daqiqada toping</h1>
					<p>
						Narx, sig’im, rayon, xizmatlar va band kunlarni bitta joyda
						ko’ring. Avans to’lov (20%) simulyatsiyasi bilan tez bron qiling.
					</p>
					<div className="hero-actions">
						<a href="#halls" className="primary-link">
							To’yxonalarni ko’rish
						</a>
						<Link to="/login" className="secondary-link">
							Kirish / Bronlarim
						</Link>
					</div>
				</div>
				<div className="hero-panel">
					<div className="glass-card">
						<CalendarCheck />
						<b>Kalendar</b>
						<span>Band kunlar qizil, bo’sh kunlar yashil</span>
					</div>
					<div className="glass-card">
						<ShieldCheck />
						<b>Admin tasdiqlagan</b>
						<span>Faqat ishonchli to’yxonalar</span>
					</div>
					<div className="glass-card">
						<Users />
						<b>{stats?.bookings || 0}+ bron</b>
						<span>Band kunlar va bronlar nazoratda</span>
					</div>
				</div>
			</div>

			<div className="stats-grid">
				<div className="stat card">
					<b>{stats?.approved || halls.length}</b>
					<span>Tasdiqlangan to’yxona</span>
				</div>
				<div className="stat card">
					<b>{stats?.districts || 12}</b>
					<span>Toshkent rayoni</span>
				</div>
				<div className="stat card">
					<b>{(stats?.maxCapacity || 700).toLocaleString()}</b>
					<span>Maksimal sig’im</span>
				</div>
				<div className="stat card">
					<b>
						{(cheapest || stats?.minPrice || 120000).toLocaleString()}
					</b>
					<span>Eng arzon o’rindiq</span>
				</div>
			</div>

			<div id="halls">
				<HallFilters
					filters={filters}
					onChange={setFilters}
					showRanges
				/>
			</div>

			<div className="section-head">
				<h2>Tavsiya etilgan to’yxonalar</h2>
				<p>
					{loading
						? 'Yuklanmoqda...'
						: error
							? 'Xatolik yuz berdi'
							: `${halls.length} ta variant topildi`}
				</p>
			</div>
			{error && !loading && (
				<div className="card muted" style={{ marginBottom: '1rem' }}>
					{error}. API manzili: {API_URL}/api/halls
				</div>
			)}
			<div className="cards">
				{halls.map(h => (
					<Link className="hall card" to={`/halls/${h._id}`} key={h._id}>
						<div className="image-wrap">
							<img
								src={
									h.photos?.[0]?.url?.startsWith('http')
										? h.photos[0].url
										: h.photos?.[0]?.url
											? API_URL + h.photos[0].url
											: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=900&q=80'
								}
								alt=""
							/>
							<span className="badge">{h.badge || 'Tasdiqlangan'}</span>
							<span className="rating">
								<Star size={14} fill="currentColor" /> {h.rating || 4.7}
							</span>
						</div>
						<h3>{h.name}</h3>
						<p className="muted">
							<MapPin size={15} /> {h.district}, {h.address}
						</p>
						<p>
							{h.description ||
								'Chiroyli zal, qulay joylashuv va qo’shimcha xizmatlar.'}
						</p>
						<div className="chips">
							{(h.amenities || []).slice(0, 3).map(a => (
								<span key={a}>{a}</span>
							))}
						</div>
						<div className="hall-foot">
							<b>{h.pricePerSeat?.toLocaleString()} so’m</b>
							<span>{h.capacity} o’rin</span>
						</div>
					</Link>
				))}
			</div>
		</section>
	)
}
