import { Plus, Trash2, Upload } from 'lucide-react'
import { useState } from 'react'
import { DISTRICTS, HALL_STATUS } from '../constants'
import { API_URL } from '../api/api'
import { emptyHall } from '../utils/hallForm'

function photoSrc(url) {
	if (!url) return ''
	if (url.startsWith('http')) return url
	return API_URL + url
}

export default function HallForm({
	initial,
	owners = [],
	isAdmin,
	isEditing,
	onSubmit,
	onCancel,
}) {
	const [form, setForm] = useState(initial || emptyHall())
	const [photoFiles, setPhotoFiles] = useState([])
	const [ownerId, setOwnerId] = useState(initial?.owner || '')

	const set = (key, val) => setForm(f => ({ ...f, [key]: val }))
	const setService = (key, val) =>
		setForm(f => ({ ...f, services: { ...f.services, [key]: val } }))

	function addItem(type, template) {
		setService(type, [...form.services[type], template])
	}
	function updateItem(type, idx, key, val) {
		const list = [...form.services[type]]
		list[idx] = { ...list[idx], [key]: val }
		setService(type, list)
	}
	function removeItem(type, idx) {
		setService(
			type,
			form.services[type].filter((_, i) => i !== idx),
		)
	}
	function removeExistingPhoto(idx) {
		set(
			'photos',
			form.photos.filter((_, i) => i !== idx),
		)
	}

	async function submit(e) {
		e.preventDefault()
		await onSubmit(form, photoFiles, isAdmin ? ownerId : undefined)
	}

	return (
		<form className="hall-form" onSubmit={submit}>
			<div className="form-section">
				<h3>Asosiy ma’lumotlar</h3>
				<div className="grid">
					<input
						placeholder="To’yxona nomi *"
						value={form.name}
						onChange={e => set('name', e.target.value)}
						required
					/>
					<select
						value={form.district}
						onChange={e => set('district', e.target.value)}
					>
						{DISTRICTS.map(d => (
							<option key={d} value={d}>
								{d}
							</option>
						))}
					</select>
					<input
						placeholder="Manzil *"
						value={form.address}
						onChange={e => set('address', e.target.value)}
						required
					/>
					<input
						type="number"
						placeholder="Sig’im (o’rin) *"
						value={form.capacity}
						onChange={e => set('capacity', e.target.value)}
						required
						min={1}
					/>
					<input
						type="number"
						placeholder="Narx (1 o’rin) *"
						value={form.pricePerSeat}
						onChange={e => set('pricePerSeat', e.target.value)}
						required
						min={1}
					/>
					<input
						placeholder="Telefon *"
						value={form.phone}
						onChange={e => set('phone', e.target.value)}
						required
					/>
					<input
						placeholder="Badge (masalan: Premium)"
						value={form.badge}
						onChange={e => set('badge', e.target.value)}
					/>
					<input
						type="number"
						step="0.1"
						min="1"
						max="5"
						placeholder="Reyting"
						value={form.rating}
						onChange={e => set('rating', e.target.value)}
					/>
					{isAdmin && (
						<select value={ownerId} onChange={e => setOwnerId(e.target.value)}>
							<option value="">Egasi (ixtiyoriy)</option>
							{owners.map(o => (
								<option key={o._id} value={o._id}>
									{o.firstName} {o.lastName} ({o.username})
								</option>
							))}
						</select>
					)}
					{isAdmin && isEditing && (
						<select
							value={form.status}
							onChange={e => set('status', e.target.value)}
						>
							<option value={HALL_STATUS.APPROVED}>Tasdiqlangan</option>
							<option value={HALL_STATUS.PENDING}>Tasdiqlanmagan</option>
						</select>
					)}
				</div>
				<input
					placeholder="Qulayliklar (vergul bilan: VIP xona, Parking)"
					value={form.amenitiesText}
					onChange={e => set('amenitiesText', e.target.value)}
				/>
				<textarea
					placeholder="Tavsif"
					value={form.description}
					onChange={e => set('description', e.target.value)}
					rows={3}
				/>
			</div>

			<div className="form-section">
				<h3>
					<Upload size={18} /> Suratlar
				</h3>
				<div className="photo-grid">
					{form.photos.map((p, i) => (
						<div className="photo-thumb" key={i}>
							<img src={photoSrc(p.url)} alt="" />
							<button
								type="button"
								className="danger sm"
								onClick={() => removeExistingPhoto(i)}
							>
								<Trash2 size={14} />
							</button>
						</div>
					))}
					{photoFiles.map((f, i) => (
						<div className="photo-thumb" key={`new-${i}`}>
							<img src={URL.createObjectURL(f)} alt="" />
							<button
								type="button"
								className="danger sm"
								onClick={() =>
									setPhotoFiles(files => files.filter((_, j) => j !== i))
								}
							>
								<Trash2 size={14} />
							</button>
						</div>
					))}
				</div>
				<label className="file-btn">
					<Upload size={16} /> Surat yuklash
					<input
						type="file"
						accept="image/*"
						multiple
						hidden
						onChange={e =>
							setPhotoFiles(f => [...f, ...Array.from(e.target.files || [])])
						}
					/>
				</label>
			</div>

			<div className="form-section">
				<h3>Qo’shimcha xizmatlar</h3>
				<div className="service-block">
					<div className="block-head">
						<b>Honandalar</b>
						<button
							type="button"
							className="ghost sm"
							onClick={() =>
								addItem('singers', { name: '', price: '', photo: '' })
							}
						>
							<Plus size={14} /> Qo’shish
						</button>
					</div>
					{form.services.singers.map((s, i) => (
						<div className="inline-grid" key={i}>
							<input
								placeholder="Ism"
								value={s.name}
								onChange={e => updateItem('singers', i, 'name', e.target.value)}
							/>
							<input
								type="number"
								placeholder="Narx"
								value={s.price}
								onChange={e => updateItem('singers', i, 'price', e.target.value)}
							/>
							<input
								placeholder="Surat URL"
								value={s.photo}
								onChange={e => updateItem('singers', i, 'photo', e.target.value)}
							/>
							<button
								type="button"
								className="danger sm"
								onClick={() => removeItem('singers', i)}
							>
								<Trash2 size={14} />
							</button>
						</div>
					))}
				</div>

				<div className="service-block">
					<label className="check-row">
						<input
							type="checkbox"
							checked={form.services.karnaySurnay.available}
							onChange={e =>
								setService('karnaySurnay', {
									...form.services.karnaySurnay,
									available: e.target.checked,
								})
							}
						/>
						Karnay-surnay mavjud
					</label>
					{form.services.karnaySurnay.available && (
						<input
							type="number"
							placeholder="Karnay-surnay narxi"
							value={form.services.karnaySurnay.price}
							onChange={e =>
								setService('karnaySurnay', {
									...form.services.karnaySurnay,
									price: e.target.value,
								})
							}
						/>
					)}
				</div>

				<div className="service-block">
					<div className="block-head">
						<b>Menu variantlari</b>
						<button
							type="button"
							className="ghost sm"
							onClick={() =>
								addItem('menus', { name: '', photo: '', price: '' })
							}
						>
							<Plus size={14} /> Qo’shish
						</button>
					</div>
					{form.services.menus.map((m, i) => (
						<div className="inline-grid" key={i}>
							<input
								placeholder="Menu nomi"
								value={m.name}
								onChange={e => updateItem('menus', i, 'name', e.target.value)}
							/>
							<input
								type="number"
								placeholder="Narx"
								value={m.price}
								onChange={e => updateItem('menus', i, 'price', e.target.value)}
							/>
							<input
								placeholder="Surat URL"
								value={m.photo}
								onChange={e => updateItem('menus', i, 'photo', e.target.value)}
							/>
							<button
								type="button"
								className="danger sm"
								onClick={() => removeItem('menus', i)}
							>
								<Trash2 size={14} />
							</button>
						</div>
					))}
				</div>

				<div className="service-block">
					<div className="block-head">
						<b>Mashinalar</b>
						<button
							type="button"
							className="ghost sm"
							onClick={() =>
								addItem('cars', { brand: '', price: '', photo: '' })
							}
						>
							<Plus size={14} /> Qo’shish
						</button>
					</div>
					{form.services.cars.map((c, i) => (
						<div className="inline-grid" key={i}>
							<input
								placeholder="Brend"
								value={c.brand}
								onChange={e => updateItem('cars', i, 'brand', e.target.value)}
							/>
							<input
								type="number"
								placeholder="Narx"
								value={c.price}
								onChange={e => updateItem('cars', i, 'price', e.target.value)}
							/>
							<input
								placeholder="Surat URL"
								value={c.photo}
								onChange={e => updateItem('cars', i, 'photo', e.target.value)}
							/>
							<button
								type="button"
								className="danger sm"
								onClick={() => removeItem('cars', i)}
							>
								<Trash2 size={14} />
							</button>
						</div>
					))}
				</div>
			</div>

			<div className="form-actions">
				<button type="submit">Saqlash</button>
				{onCancel && (
					<button type="button" className="ghost" onClick={onCancel}>
						Bekor
					</button>
				)}
			</div>
		</form>
	)
}
