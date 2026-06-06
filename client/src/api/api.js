import axios from 'axios'

const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000'
export const API_URL = rawApiUrl.replace(/\/+$/, '').replace(/\/api$/, '')
export const api = axios.create({ baseURL: `${API_URL}/api` })

api.interceptors.request.use(config => {
	const token = localStorage.getItem('token')
	if (token) config.headers.Authorization = `Bearer ${token}`
	return config
})
