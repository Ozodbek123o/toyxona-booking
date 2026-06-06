# Deploy qo'llanmasi (Render + Vercel)

Loyiha ikki qismdan iborat: **API** (`server/`) Renderda, **frontend** (`client/`) Vercelda.

## Render (API)

**Dashboard:** [toyxona-booking Web Service](https://dashboard.render.com)

| O'zgaruvchi | Qiymat |
|-------------|--------|
| `DATABASE_URL` | PostgreSQL → **Connections** → **External Database URL** + `?sslmode=require` |
| `JWT_SECRET` | Uzun random string (kamida 32 belgi) |
| `CLIENT_URL` | `https://toyxona-booking-client-wms5.vercel.app` |
| `NODE_ENV` | `production` |
| `SEED_DEMO` | `false` |
| `ADMIN_USERNAME` | `admin` (yoki o'zingiz tanlang) |
| `ADMIN_PASSWORD` | Kuchli parol (`Admin12345!` dan foydalanmang) |
| `ADMIN_EMAIL` | `admin@toyxona.uz` |

**Build Command:**

```bash
npm install && npm --workspace server run db:setup
```

**Start Command:**

```bash
npm --workspace server start
```

**Health check:** `GET /api/health` → `{"ok":true,"database":"postgresql"}`

### DATABASE_URL muammosi

Agar `Can't reach database server` yoki API timeout chiqsa:

1. Render Dashboard → PostgreSQL (`toyxona_db`) — **Resume** tugmasi bo'lsa bosing (free DB suspend bo'lishi mumkin)
2. **Connections** → **External Database URL** ni nusxalang (hostname `.oregon-postgres.render.com` bilan tugashi kerak)
3. Oxiriga `?sslmode=require` qo'shing
4. Web Service → **Environment** → `DATABASE_URL` ni yangilang
5. **Manual Deploy** → **Clear build cache & deploy**

Ulanishni tekshirish (lokal):

```bash
npm --workspace server run db:ping
```

> Render Web Service uchun **Internal Database URL** ham ishlaydi (bir xil Render hisobida). Lokal mashina yoki Vercel dan faqat **External** URL ishlatiladi.

## Vercel (Frontend)

**Dashboard:** [toyxona-booking-client](https://vercel.com)

| O'zgaruvchi | Qiymat |
|-------------|--------|
| `VITE_API_URL` | `https://toyxona-booking.onrender.com` |

**Root Directory:** `client`

> `VITE_API_URL` da `/api` qo'shmang — client avtomatik `${VITE_API_URL}/api` ishlatadi.

## GitHub push

```bash
git add -A
git commit -m "Fix API prefix, deploy config, districts"
git push origin main
```

Render va Vercel `main` branchga push qilinganda avtomatik yangilanadi.

## Lokal ishga tushirish

```bash
npm install
copy server\.env.example server\.env
copy client\.env.example client\.env
```

`server/.env` da `DATABASE_URL` ni Render **External** URL bilan to'ldiring.

```bash
npm --workspace server run db:setup
npm run dev
```

- Frontend: http://localhost:5173
- API health: http://localhost:5000/api/health

## Tekshiruv

```bash
npm run check
```

Production smoke test (API ishlayotganda):

```bash
API_URL=https://toyxona-booking.onrender.com npm run smoke-test
```

## Demo loginlar (SQL seed bo'lsa)

| Rol | Login | Parol |
|-----|-------|-------|
| Admin | `platform_admin` | `Admin12345!` |
| Egasi | `toyxona_owner` | `Owner12345!` |
| Mijoz | `ozod_customer` | `User12345!` |

Productionda `SEED_DEMO=false` va `ADMIN_*` env orqali admin yarating.
