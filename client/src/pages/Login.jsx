import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { api } from '../api/api'
import { useAuth } from '../context/AuthContext'
import { paymentSuccessMessage } from '../utils/price'

export default function Login() {
	const showDemoHints = import.meta.env.VITE_SHOW_DEMO_HINTS === 'true'
	const [mode, setMode] = useState('login')
	const [form, setForm] = useState({
		firstName: '',
		lastName: '',
		phone: '',
		login: '',
		password: '',
		otp: '',
	})
	const [otpUser, setOtpUser] = useState(null)
	const { save, user } = useAuth()
	const nav = useNavigate()
	const set = e => setForm({ ...form, [e.target.name]: e.target.value })

	useEffect(() => {
		if (!user) return
		const pending = sessionStorage.getItem('pendingBooking')
		if (!pending) return
		const data = JSON.parse(pending)
		api
			.post('/bookings', data)
			.then(res => {
				sessionStorage.removeItem('pendingBooking')
				toast.success(
					paymentSuccessMessage(res.data.totalPrice),
				)
				nav('/bookings')
			})
			.catch(err => {
				toast.error(err.response?.data?.message || 'Bron xatolik')
				nav(`/halls/${data.hallId}`)
			})
	}, [user])

	async function submit(e) {
		e.preventDefault()
		try {
			if (otpUser) {
				const { data } = await api.post('/auth/verify-otp', {
					userId: otpUser,
					otp: form.otp,
				})
				save(data)
				toast.success('Tasdiqlandi')
				return
			}
			const { data } =
				mode === 'login'
					? await api.post('/auth/login', form)
					: await api.post('/auth/register', form)
			if (data.requiresOtp) {
				setOtpUser(data.userId)
				toast.success('OTP emailga yuborildi (server konsolida ham ko’rinadi)')
				return
			}
			save(data)
			toast.success('Xush kelibsiz')
			if (!sessionStorage.getItem('pendingBooking')) nav('/')
		} catch (err) {
			toast.error(err.response?.data?.message || 'Xatolik')
		}
	}

	return (
		<section className="auth card">
			<h1>
				{otpUser
					? 'OTP tasdiqlash'
					: mode === 'login'
						? 'Login'
						: 'Ro’yxatdan o’tish'}
			</h1>
			<form onSubmit={submit} className="grid">
				{mode === 'register' && !otpUser && (
					<>
						<input
							name="firstName"
							placeholder="Ism"
							onChange={set}
							required
						/>
						<input
							name="lastName"
							placeholder="Familiya"
							onChange={set}
							required
						/>
						<input
							name="phone"
							placeholder="Telefon"
							onChange={set}
							required
						/>
					</>
				)}
				{otpUser ? (
					<input name="otp" placeholder="OTP kod" onChange={set} required />
				) : (
					<>
						<input
							name="login"
							placeholder="Username / telefon / email"
							onChange={set}
							required={mode === 'login'}
						/>
						<input
							name="password"
							type="password"
							placeholder="Password"
							onChange={set}
							required
						/>
					</>
				)}
				<button type="submit">
					{otpUser
						? 'Tasdiqlash'
						: mode === 'login'
							? 'Kirish'
							: 'Ro’yxatdan o’tish'}
				</button>
			</form>
			{!otpUser && (
				<button
					type="button"
					className="ghost"
					onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
				>
					{mode === 'login'
						? 'User sifatida ro’yxatdan o’tish'
						: 'Login qilish'}
				</button>
			)}
			{showDemoHints && (
				<div className="demo-hints muted">
					<p>
						<b>Demo:</b> Mijoz ozod_customer / User12345! · Admin
						platform_admin / Admin12345! · Egasi toyxona_owner /
						Owner12345!
					</p>
					<p>
						Yangi egasi birinchi marta OTP bilan tasdiqlanadi (email konsolda).
					</p>
				</div>
			)}
		</section>
	)
}
