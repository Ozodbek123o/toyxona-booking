import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, roles }) {
	const { user } = useAuth()
	if (!user) return <Navigate to="/login" replace />
	if (roles && !roles.includes(user.role))
		return (
			<section className="card">
				<h1>Ruxsat yo’q</h1>
				<p>Bu sahifaga kirish uchun kerakli rolga ega emassiz.</p>
			</section>
		)
	return children
}
