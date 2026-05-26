import { Search } from 'lucide-react'
import { DISTRICTS, HALL_STATUS } from '../constants'

export default function HallFilters({
	filters,
	onChange,
	showStatus = false,
	showRanges = false,
}) {
	function change(e) {
		onChange({ ...filters, [e.target.name]: e.target.value })
	}

	return (
		<div className="filters card">
			<div className="searchbox">
				<Search size={18} />
				<input
					name="search"
					placeholder="To’yxona nomi bo’yicha qidiring..."
					value={filters.search || ''}
					onChange={change}
				/>
			</div>
			<select name="district" value={filters.district || ''} onChange={change}>
				<option value="">Barcha rayonlar</option>
				{DISTRICTS.map(d => (
					<option key={d} value={d}>
						{d}
					</option>
				))}
			</select>
			<select name="sortPrice" value={filters.sortPrice || ''} onChange={change}>
				<option value="">Narx tartibi</option>
				<option value="asc">Arzondan qimmatga</option>
				<option value="desc">Qimmatdan arzonga</option>
			</select>
			<select
				name="sortCapacity"
				value={filters.sortCapacity || ''}
				onChange={change}
			>
				<option value="">Sig’im tartibi</option>
				<option value="asc">Kamdan ko’pga</option>
				<option value="desc">Ko’pdan kamga</option>
			</select>
			{showRanges && (
				<>
					<input
						type="number"
						name="minPrice"
						placeholder="Min narx"
						value={filters.minPrice || ''}
						onChange={change}
					/>
					<input
						type="number"
						name="maxPrice"
						placeholder="Max narx"
						value={filters.maxPrice || ''}
						onChange={change}
					/>
					<input
						type="number"
						name="minCapacity"
						placeholder="Min sig’im"
						value={filters.minCapacity || ''}
						onChange={change}
					/>
					<input
						type="number"
						name="maxCapacity"
						placeholder="Max sig’im"
						value={filters.maxCapacity || ''}
						onChange={change}
					/>
				</>
			)}
			{showStatus && (
				<select name="status" value={filters.status || ''} onChange={change}>
					<option value="">Barcha statuslar</option>
					<option value={HALL_STATUS.APPROVED}>Tasdiqlangan</option>
					<option value={HALL_STATUS.PENDING}>Tasdiqlanmagan</option>
				</select>
			)}
		</div>
	)
}
