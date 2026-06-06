import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Check, Edit, ExternalLink, Trash2, UserPlus } from 'lucide-react'
import { api } from '../api/api'
import { useAuth } from '../context/AuthContext'
import HallForm from '../components/HallForm'
import HallFilters from '../components/HallFilters'
import { HALL_STATUS } from '../constants'
import { buildHallFormData, hallToForm } from '../utils/hallForm'

export default function Dashboard({ type }) {
	const { user } = useAuth()
	const isAdmin = type === 'admin'
	const [tab, setTab] = useState('list')
	const [halls, setHalls] = useState([])
	const [owners, setOwners] = useState([])
	const [filters, setFilters] = useState({
		search: '',
		district: '',
		sortPrice: '',
		sortCapacity: '',
		status: '',
		minPrice: '',
		maxPrice: '',
		minCapacity: '',
		maxCapacity: '',
	})
	const [editingOwner, setEditingOwner] = useState(null)
	const [editing, setEditing] = useState(null)
	const [owner, setOwner] = useState({
		firstName: '',
		lastName: '',
		email: '',
		phone: '',
		username: '',
		password: '',
	})
	const [assignHall, setAssignHall] = useState({ hallId: '', ownerId: '' })

	const loadHalls = async (next = filters) => {
		const params = new URLSearchParams()
		Object.entries(next).forEach(([k, v]) => v && params.set(k, v))
		const { data } = await api.get(`/halls?${params}`)
		setHalls(data)
	}

	const loadOwners = () => {
		if (isAdmin) api.get('/admin/owners').then(r => setOwners(r.data))
	}

	useEffect(() => {
		if (!user) return
		loadHalls()
		loadOwners()
	}, [user])

	useEffect(() => {
		loadHalls(filters)
	}, [filters])

	async function saveHall(form, photoFiles, ownerId) {
		try {
			const opts = { ownerId: isAdmin ? ownerId : undefined }
			if (isAdmin) {
				opts.status = editing
					? form.status
					: HALL_STATUS.APPROVED
			}
			const fd = buildHallFormData(form, photoFiles, opts)
			if (editing) {
				await api.put(`/halls/${editing._id}`, fd, {
					headers: { 'Content-Type': 'multipart/form-data' },
				})
				toast.success('To’yxona yangilandi')
			} else {
				await api.post('/halls', fd, {
					headers: { 'Content-Type': 'multipart/form-data' },
				})
				toast.success(
					isAdmin
						? 'To’yxona qo’shildi'
						: 'So’rov yuborildi — admin tasdiqlagach ko’rinadi',
				)
			}
			if (!isAdmin && editing)
				toast('Tahrirlangach admin qayta tasdiqlashi kerak', { icon: 'ℹ️' })
			setEditing(null)
			setTab('list')
			loadHalls()
		} catch (err) {
			toast.error(err.response?.data?.message || 'Xatolik')
		}
	}

	async function addOwner(e) {
		e.preventDefault()
		try {
			await api.post('/admin/owners', owner)
			toast.success('Egasi qo’shildi')
			setOwner({
				firstName: '',
				lastName: '',
				email: '',
				phone: '',
				username: '',
				password: '',
			})
			loadOwners()
		} catch (err) {
			toast.error(err.response?.data?.message || 'Xatolik')
		}
	}

	async function approve(id) {
		await api.patch(`/admin/halls/${id}/approve`)
		toast.success('Tasdiqlandi')
		loadHalls()
	}

	async function reject(id) {
		await api.patch(`/admin/halls/${id}/reject`)
		toast.success('Tasdiqlanmagan qilindi')
		loadHalls()
	}

	async function updateOwner(e) {
		e.preventDefault()
		try {
			await api.patch(`/admin/owners/${editingOwner._id}`, owner)
			toast.success('Egasi yangilandi')
			setEditingOwner(null)
			setOwner({
				firstName: '',
				lastName: '',
				email: '',
				phone: '',
				username: '',
				password: '',
			})
			loadOwners()
		} catch (err) {
			toast.error(err.response?.data?.message || 'Xatolik')
		}
	}

	async function removeOwner(id) {
		if (!confirm('Egasini o’chirasizmi?')) return
		try {
			await api.delete(`/admin/owners/${id}`)
			toast.success('Egasi o’chirildi')
			loadOwners()
		} catch (err) {
			toast.error(err.response?.data?.message || 'Xatolik')
		}
	}

	async function del(id) {
		if (!confirm('To’yxonani o’chirasizmi?')) return
		await api.delete(`/halls/${id}`)
		toast.success('O’chirildi')
		loadHalls()
	}

	async function assignOwner(e) {
		e.preventDefault()
		try {
			await api.patch(`/admin/halls/${assignHall.hallId}/owner`, {
				ownerId: assignHall.ownerId,
			})
			toast.success('Egasi biriktirildi')
			setAssignHall({ hallId: '', ownerId: '' })
			loadHalls()
		} catch (err) {
			toast.error(err.response?.data?.message || 'Xatolik')
		}
	}

	if (!user || (isAdmin && user.role !== 'admin') || (!isAdmin && user.role !== 'owner'))
		return (
			<section className="card">
				<h1>Ruxsat yo’q</h1>
			</section>
		)

	return (
		<section className="dashboard">
			<div className="dash-tabs card">
				<h1>{isAdmin ? 'Admin panel' : 'To’yxona egasi paneli'}</h1>
				<div className="tabs">
					<button
						type="button"
						className={tab === 'list' ? 'active' : ''}
						onClick={() => {
							setTab('list')
							setEditing(null)
						}}
					>
						To’yxonalar
					</button>
					<button
						type="button"
						className={tab === 'form' ? 'active' : ''}
						onClick={() => setTab('form')}
					>
						{editing ? 'Tahrirlash' : 'Qo’shish'}
					</button>
					{isAdmin && (
						<button
							type="button"
							className={tab === 'owners' ? 'active' : ''}
							onClick={() => setTab('owners')}
						>
							Egalari
						</button>
					)}
					<Link to="/bookings" className="tab-link">
						Bronlar
					</Link>
				</div>
			</div>

			{tab === 'list' && (
				<>
					<HallFilters
						filters={filters}
						onChange={setFilters}
						showStatus={isAdmin}
						showRanges
					/>
					<div className="card hall-table">
						<p className="muted">{halls.length} ta to’yxona</p>
						{halls.map(h => (
							<div className="hall-row" key={h._id}>
								<div>
									<b>{h.name}</b>
									<span className="muted">
										{' '}
										· {h.district} · {h.capacity} o’rin ·{' '}
										{h.pricePerSeat?.toLocaleString()} so’m
									</span>
									<br />
									<span
										className={`status-pill ${h.status === HALL_STATUS.APPROVED ? 'ok' : 'warn'}`}
									>
										{h.status === HALL_STATUS.APPROVED
											? 'Tasdiqlangan'
											: 'Tasdiqlanmagan'}
									</span>
									{h.owner && (
										<span className="muted">
											{' '}
											· Egasi: {h.owner.firstName} {h.owner.lastName}
										</span>
									)}
								</div>
								<div className="row-actions">
									<Link
										to={`/halls/${h._id}`}
										className="ghost sm"
										title="Ko’rish"
									>
										<ExternalLink size={16} />
									</Link>
									<button
										type="button"
										className="ghost sm"
										onClick={() => {
											setEditing(h)
											setTab('form')
										}}
									>
										<Edit size={16} />
									</button>
									{isAdmin && h.status === HALL_STATUS.PENDING && (
										<button
											type="button"
											className="ghost sm"
											title="Tasdiqlash"
											onClick={() => approve(h._id)}
										>
											<Check size={16} />
										</button>
									)}
									{isAdmin && h.status === HALL_STATUS.APPROVED && (
										<button
											type="button"
											className="ghost sm"
											title="Bekor qilish"
											onClick={() => reject(h._id)}
										>
											Rad
										</button>
									)}
									<button
										type="button"
										className="danger sm"
										onClick={() => del(h._id)}
									>
										<Trash2 size={16} />
									</button>
								</div>
							</div>
						))}
					</div>
				</>
			)}

			{tab === 'form' && (
				<div className="card">
					<HallForm
						key={editing?._id || 'new'}
						initial={editing ? hallToForm(editing) : undefined}
						owners={owners}
						isAdmin={isAdmin}
						isEditing={!!editing}
						onSubmit={saveHall}
						onCancel={() => {
							setEditing(null)
							setTab('list')
						}}
					/>
				</div>
			)}

			{tab === 'owners' && isAdmin && (
				<>
					<div className="card">
						<h2>
							<UserPlus size={20} /> Yangi egasi
						</h2>
						<form className="grid" onSubmit={addOwner}>
							{[
								'firstName',
								'lastName',
								'email',
								'phone',
								'username',
								'password',
							].map(k => (
								<input
									key={k}
									type={k === 'password' ? 'password' : 'text'}
									placeholder={
										k === 'firstName'
											? 'Ism'
											: k === 'lastName'
												? 'Familiya'
												: k
									}
									value={owner[k]}
									onChange={e =>
										setOwner({ ...owner, [k]: e.target.value })
									}
									required
								/>
							))}
							<button type="submit">Qo’shish</button>
						</form>
					</div>
					<div className="card">
						<h2>Egasi biriktirish</h2>
						<form className="grid" onSubmit={assignOwner}>
							<select
								value={assignHall.hallId}
								onChange={e =>
									setAssignHall({ ...assignHall, hallId: e.target.value })
								}
								required
							>
								<option value="">To’yxona tanlang</option>
								{halls.map(h => (
									<option key={h._id} value={h._id}>
										{h.name}
									</option>
								))}
							</select>
							<select
								value={assignHall.ownerId}
								onChange={e =>
									setAssignHall({ ...assignHall, ownerId: e.target.value })
								}
								required
							>
								<option value="">Egasi tanlang</option>
								{owners.map(o => (
									<option key={o._id} value={o._id}>
										{o.firstName} {o.lastName} ({o.username})
									</option>
								))}
							</select>
							<button type="submit">Biriktirish</button>
						</form>
					</div>
					<div className="card">
						<h2>Barcha egalar</h2>
						{owners.map(o => (
							<div className="hall-row" key={o._id}>
								<div>
									<b>
										{o.firstName} {o.lastName}
									</b>
									<span className="muted">
										{' '}
										— {o.email} — @{o.username}
									</span>
									{!o.isVerified && (
										<span className="status-pill warn">
											{' '}
											OTP kutilmoqda
										</span>
									)}
								</div>
								<div className="row-actions">
									<button
										type="button"
										className="ghost sm"
										onClick={() => {
											setEditingOwner(o)
											setOwner({
												firstName: o.firstName,
												lastName: o.lastName,
												email: o.email,
												phone: o.phone,
												username: o.username,
												password: '',
											})
										}}
									>
										<Edit size={16} />
									</button>
									<button
										type="button"
										className="danger sm"
										onClick={() => removeOwner(o._id)}
									>
										<Trash2 size={16} />
									</button>
								</div>
							</div>
						))}
					</div>
					{editingOwner && (
						<div className="card">
							<h2>Egasini tahrirlash</h2>
							<form className="grid" onSubmit={updateOwner}>
								{['firstName', 'lastName', 'email', 'phone', 'username'].map(k => (
									<input
										key={k}
										value={owner[k]}
										onChange={e =>
											setOwner({ ...owner, [k]: e.target.value })
										}
										required
									/>
								))}
								<input
									type="password"
									placeholder="Yangi parol (ixtiyoriy)"
									value={owner.password}
									onChange={e =>
										setOwner({ ...owner, password: e.target.value })
									}
								/>
								<button type="submit">Saqlash</button>
								<button
									type="button"
									className="ghost"
									onClick={() => setEditingOwner(null)}
								>
									Bekor
								</button>
							</form>
						</div>
					)}
				</>
			)}
		</section>
	)
}
