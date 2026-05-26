import { Link, NavLink } from 'react-router-dom'
import { CalendarDays, LogOut, User } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Layout({ children }) {
	const { user, logout } = useAuth()
	return (
		<>
			<header className="nav">
				<Link to="/" className="brand">
					<CalendarDays /> Toshkent To’yxona
				</Link>
				<nav>
					<NavLink to="/">To’yxonalar</NavLink>
					{user?.role === 'admin' && <NavLink to="/admin">Admin</NavLink>}
					{user?.role === 'owner' && <NavLink to="/owner">Egasi</NavLink>}
					{user && <NavLink to="/bookings">Bronlar</NavLink>}
					{!user ? (
						<NavLink to="/login">
							<User size={18} /> Login
						</NavLink>
					) : (
						<button type="button" onClick={logout}>
							<LogOut size={18} /> Chiqish
						</button>
					)}
				</nav>
			</header>
			<main>{children}</main>
		</>
	)
}
