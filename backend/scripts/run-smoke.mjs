const API = process.env.API_URL || 'http://localhost:5000'

async function req(path, options = {}) {
	const res = await fetch(`${API}${path}`, options)
	const text = await res.text()
	let data
	try {
		data = JSON.parse(text)
	} catch {
		data = text
	}
	return { status: res.status, data }
}

function ok(label, cond, detail = '') {
	const mark = cond ? 'PASS' : 'FAIL'
	console.log(`${mark} ${label}${detail ? ` — ${detail}` : ''}`)
	return cond
}

let passed = 0
let failed = 0
function tally(result) {
	if (result) passed++
	else failed++
}

console.log('\n=== Toyxona smoke test ===\n')

const health = await req('/api/health')
tally(ok('Health', health.status === 200 && health.data?.ok, JSON.stringify(health.data)))

const halls = await req('/api/halls?public=true')
tally(
	ok(
		'Public halls',
		halls.status === 200 && Array.isArray(halls.data) && halls.data.length > 0,
		`count=${halls.data?.length}`,
	),
)

const hallId = halls.data?.[0]?.id
if (hallId) {
	const detail = await req(`/api/halls/${hallId}`)
	tally(
		ok(
			'Hall detail',
			detail.status === 200 && detail.data?.hall?.services?.singers,
			detail.data?.hall?.name,
		),
	)
}

const logins = [
	['admin', 'Admin12345!', 'admin'],
	['+998901112233', 'User12345!', 'user'],
	['aziz_owner', 'Owner12345!', 'owner'],
]

let customerToken = null
for (const [login, password, role] of logins) {
	const r = await req('/api/auth/login', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ login, password }),
	})
	const good = r.status === 200 && r.data?.token && r.data?.user?.role === role
	tally(ok(`Login ${role}`, good, r.data?.message || login))
	if (role === 'user') customerToken = r.data?.token
}

if (customerToken && hallId) {
	const booking = await req('/api/bookings', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${customerToken}`,
		},
		body: JSON.stringify({
			hallId,
			date: '2027-03-15',
			seats: 50,
			selectedServices: { singers: [], cars: [], menus: [], karnaySurnay: false },
		}),
	})
	tally(
		ok(
			'Create booking',
			booking.status === 201,
			booking.data?.message || `total=${booking.data?.totalPrice}`,
		),
	)

	const list = await req('/api/bookings', {
		headers: { Authorization: `Bearer ${customerToken}` },
	})
	tally(
		ok(
			'List bookings',
			list.status === 200 && Array.isArray(list.data) && list.data.length > 0,
			`count=${list.data?.length}`,
		),
	)
}

const ownerLogin = await req('/api/auth/login', {
	method: 'POST',
	headers: { 'Content-Type': 'application/json' },
	body: JSON.stringify({ login: 'toyxona_owner', password: 'Owner12345!' }),
})
if (ownerLogin.data?.token) {
	const ownerHalls = await req('/api/halls', {
		headers: { Authorization: `Bearer ${ownerLogin.data.token}` },
	})
	tally(
		ok(
			'Owner halls',
			ownerHalls.status === 200 && Array.isArray(ownerHalls.data),
			`count=${ownerHalls.data?.length}`,
		),
	)
}

console.log(`\n=== Result: ${passed} passed, ${failed} failed ===\n`)
process.exit(failed > 0 ? 1 : 0)
