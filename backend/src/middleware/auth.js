import jwt from 'jsonwebtoken'
import { getAuthUser } from '../utils/users.js'

function jwtSecret() {
	return process.env.JWT_SECRET || 'dev-secret-key-12345'
}

export async function auth(req, res, next) {
	try {
		const header = req.headers.authorization || ''
		const token = header.startsWith('Bearer ') ? header.slice(7) : null
		if (!token) return res.status(401).json({ message: 'Login required' })
		const payload = jwt.verify(token, jwtSecret())
		req.user = await getAuthUser(payload.id)
		if (!req.user) return res.status(401).json({ message: 'Invalid token' })
		next()
	} catch {
		res.status(401).json({ message: 'Invalid token' })
	}
}

export function permit(...roles) {
	return (req, res, next) => {
		if (!roles.includes(req.user.role))
			return res.status(403).json({ message: 'Forbidden' })
		next()
	}
}

export async function optionalAuth(req, res, next) {
	try {
		const header = req.headers.authorization || ''
		const token = header.startsWith('Bearer ') ? header.slice(7) : null
		if (token) {
			const payload = jwt.verify(token, jwtSecret())
			req.user = await getAuthUser(payload.id)
		}
	} catch {
		req.user = null
	}
	next()
}
