# Toshkent To'yxona Booking

React + Vite frontend, Express + Prisma backend, PostgreSQL database.

Loyiha berilgan ERD/DDLga mos normalized PostgreSQL jadvallar bilan ishlaydi:
`users`, `wedding_halls`, `hall_images`, `singers`, `cars`, `menus`,
`bookings`, `booking_services`. Barcha bog'lanishlar Prisma relationlari orqali
ulangan, active bookinglar esa bitta to'yxona/bitta sana uchun unique qilinadi.

## Talablar

- Node.js 20.19+ yoki 22.12+
- PostgreSQL connection string
- `backend/.env` ichida kuchli `JWT_SECRET`

## Lokal ishga tushirish

```bash
npm run install:all
copy backend\.env.example backend\.env
copy client\.env.example client\.env
```

`backend/.env` ichida kamida quyidagilarni to'ldiring:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require
JWT_SECRET=replace-with-a-long-random-secret
CLIENT_URL=http://localhost:5173
SEED_DEMO=false
```

PostgreSQL schema (DDL + indekslar) va Prisma client:

```bash
npm --prefix backend run db:setup
```

Agar SQL seed faylida placeholder `password_hash` bo‘lsa, demo parollarni yangilang:

```bash
npm --prefix backend run db:reset-passwords
```

Ishga tushirish:

```bash
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:5000
- Health: http://localhost:5000/api/health

## Demo data

SQL seed (`users`, `wedding_halls`, …) yoki `SEED_DEMO=true` bilan yaratilgan demo ma’lumotlar:

| Rol   | Login            | Parol         |
| ----- | ---------------- | ------------- |
| Admin | `platform_admin` | `Admin12345!` |
| Egasi | `toyxona_owner`  | `Owner12345!` |
| Mijoz | `ozod_customer`  | `User12345!`  |

`SEED_DEMO=true` bo‘lsa va bazada to‘yxona bo‘lmasa, qo‘shimcha demo zallar ham yaratiladi. Productionda `SEED_DEMO=false` qoldiring va admin hisobni env orqali yarating:

```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=very-strong-password
ADMIN_EMAIL=admin@example.com
```

Clientda demo loginlarni ko'rsatish uchun faqat lokal muhitda:

```env
VITE_SHOW_DEMO_HINTS=true
```

Demo loginlar:

- Admin: `admin` / `Admin12345!`
- To'yxona egasi: `aziz_owner` / `Owner12345!`
- Mijoz: `+998901112233` / `User12345!`

## Muhim production sozlamalar

- `JWT_SECRET` majburiy va uzun random qiymat bo'lishi kerak.
- `CLIENT_URL` deploy qilingan frontend domeni bo'lishi kerak; bir nechta origin vergul bilan yoziladi.
- `backend/uploads` uchun persistent disk yoki object storage kerak.
- `npm --prefix backend run db:setup` active booking uchun partial unique index yaratadi.
- SMTP sozlansa, owner OTP email orqali yuboriladi; sozlanmasa, OTP server logida chiqadi.

## Deploy (Render + Vercel)

Loyiha ikki qismdan iborat: **API** (`backend/`) Renderda, **frontend** (`client/`) Vercelda.

### Render (API) Sozlamalari

1. **Environment Variables**:
   - `DATABASE_URL`: PostgreSQL External URL + `?sslmode=require`
   - `JWT_SECRET`: Kamida 32 belgidan iborat maxfiy kalit
   - `CLIENT_URL`: Vercel'dagi frontend manzilingiz
   - `NODE_ENV`: `production`

2. **Build & Start**:
   - Build Command: `npm install && npm --workspace backend run db:setup`
   - Start Command: `npm --workspace backend start`

### Vercel (Frontend) Sozlamalari

1. **Environment Variables**:
   - `VITE_API_URL`: Render'dagi API manzilingiz (masalan: `https://toyxona-booking.onrender.com`)
2. **Settings**:
   - Root Directory: `client`
   - Framework Preset: `Vite`

## Loyiha Strukturasi

```text
├── client/              # Frontend (React + Vite)
│   ├── src/
│   │   ├── api/         # Axios instansiyasi va API sozlamalari
│   │   ├── components/  # Qayta ishlatiluvchi UI komponentlar
│   │   ├── context/     # AuthContext (global holat)
│   │   ├── pages/       # Sahifalar (Halls, Login, Bookings, va h.k.)
│   │   └── utils/       # Yordamchi funksiyalar
├── backend/             # Backend (Node.js + Express + Prisma)
│   ├── prisma/          # Ma'lumotlar bazasi sxemasi va migratsiyalar
│   ├── scripts/         # Ma'muriy skriptlar (parol tiklash, testlar)
│   ├── src/
│   │   ├── config/      # DB ulanish sozlamalari
│   │   ├── middleware/  # Auth va fayl yuklash middleware'lari
│   │   ├── routes/      # API yo'nalishlari (Express routes)
│   │   ├── services/    # Biznes mantiq (Database queries)
│   │   └── utils/       # Formatlash va yordamchi mantiq
├── scripts/             # Monorepo darajasidagi skriptlar
├── render.yaml          # Render platformasi uchun IaC fayli
└── package.json         # Workspace va umumiy skriptlar
```

## Tekshiruv

```bash
# Barcha qismlarni tekshirish
npm run check

# API ishlashini tekshirish (Render'da)
API_URL=https://toyxona-booking.onrender.com npm run smoke-test
```
