# PostgreSQL ulash

## 1. `.env` tayyorlash

```bash
copy .env.example .env
```

`DATABASE_URL` ni PostgreSQL external connection string bilan to'ldiring:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require
JWT_SECRET=replace-with-a-long-random-secret
CLIENT_URL=http://localhost:5173
```

## 2. Schema va indexlar

```bash
npm run db:setup
```

Bu buyruq Prisma schema yaratadi yoki yangilaydi va bitta zal uchun bir kunda faqat bitta active bron bo'lishini kafolatlaydigan partial unique index qo'shadi.

## 3. Server

```bash
npm run dev
```

Health check:

```text
http://localhost:5000/api/health
```

## Eslatma

- Productionda `SEED_DEMO=false`.
- `server/uploads` persistent diskda saqlanishi kerak.
- SMTP sozlanmasa, owner OTP server logida ko'rinadi.
