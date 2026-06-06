import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'

dotenv.config()

const url = process.env.DATABASE_URL
if (url?.includes('render.com') && !url.includes('sslmode=')) {
	process.env.DATABASE_URL = `${url}${url.includes('?') ? '&' : '?'}sslmode=require`
}

const prisma = new PrismaClient()
export default prisma
