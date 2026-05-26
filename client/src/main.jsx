import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider } from './context/AuthContext'
import Halls from './pages/Halls'
import HallDetail from './pages/HallDetail'
import Login from './pages/Login'
import Bookings from './pages/Bookings'
import Dashboard from './pages/Dashboard'
import './style.css'

createRoot(document.getElementById('root')).render(
	<React.StrictMode>
		<BrowserRouter>
			<AuthProvider>
				<Layout>
					<Routes>
						<Route path="/" element={<Halls />} />
						<Route path="/halls/:id" element={<HallDetail />} />
						<Route path="/login" element={<Login />} />
						<Route
							path="/bookings"
							element={
								<ProtectedRoute roles={['admin', 'owner', 'user']}>
									<Bookings />
								</ProtectedRoute>
							}
						/>
						<Route
							path="/admin"
							element={
								<ProtectedRoute roles={['admin']}>
									<Dashboard type="admin" />
								</ProtectedRoute>
							}
						/>
						<Route
							path="/owner"
							element={
								<ProtectedRoute roles={['owner']}>
									<Dashboard type="owner" />
								</ProtectedRoute>
							}
						/>
					</Routes>
				</Layout>
				<Toaster position="top-right" />
			</AuthProvider>
		</BrowserRouter>
	</React.StrictMode>,
)
