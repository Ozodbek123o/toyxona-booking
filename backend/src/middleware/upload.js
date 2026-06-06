import multer from 'multer'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const uploadDir = path.join(__dirname, '..', '..', 'uploads')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

const allowedMimeTypes = new Set([
	'image/jpeg',
	'image/png',
	'image/webp',
	'image/gif',
])

const storage = multer.diskStorage({
	destination: uploadDir,
	filename: (req, file, cb) =>
		cb(
			null,
			`${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname).toLowerCase()}`,
		),
})

export const upload = multer({
	storage,
	fileFilter(req, file, cb) {
		if (allowedMimeTypes.has(file.mimetype)) return cb(null, true)
		return cb(new Error('Only JPG, PNG, WebP or GIF images are allowed'))
	},
	limits: {
		files: 10,
		fileSize: Number(process.env.MAX_UPLOAD_BYTES || 5 * 1024 * 1024),
	},
})
