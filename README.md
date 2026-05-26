# Toshkent To'yxona Booking

React + Vite frontend, Express + Prisma backend, PostgreSQL database.

## Talablar

- Node.js 20.19+ yoki 22.12+
- PostgreSQL connection string
- `server/.env` ichida kuchli `JWT_SECRET`

## Lokal ishga tushirish

```bash
npm run install:all
copy server\.env.example server\.env
copy client\.env.example client\.env
```

`server/.env` ichida kamida quyidagilarni to'ldiring:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require
JWT_SECRET=replace-with-a-long-random-secret
CLIENT_URL=http://localhost:5173
SEED_DEMO=false
```

Database schema va active booking unique index:

```bash
npm --prefix server run db:setup
```

Ishga tushirish:

```bash
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:5000
- Health: http://localhost:5000/api/health

## Demo data

Demo hisoblar va demo to'yxonalar faqat `server/.env` ichida `SEED_DEMO=true` bo'lsa yaratiladi. Productionda `SEED_DEMO=false` qoldiring va admin hisobni env orqali yarating:

```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=very-strong-password
ADMIN_EMAIL=admin@example.com
```

Clientda demo loginlarni ko'rsatish uchun faqat lokal muhitda:

```env
VITE_SHOW_DEMO_HINTS=true
```

## Muhim production sozlamalar

- `JWT_SECRET` majburiy va uzun random qiymat bo'lishi kerak.
- `CLIENT_URL` deploy qilingan frontend domeni bo'lishi kerak; bir nechta origin vergul bilan yoziladi.
- `server/uploads` uchun persistent disk yoki object storage kerak.
- `npm --prefix server run db:setup` active booking uchun partial unique index yaratadi.
- SMTP sozlansa, owner OTP email orqali yuboriladi; sozlanmasa, OTP server logida chiqadi.

## Tekshiruv

```bash
npm run check
npm --prefix server audit --omit=dev
npm --prefix client audit --omit=dev
```
