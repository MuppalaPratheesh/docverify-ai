# Development Guide

## First-time setup

```bash
cp .env.example .env
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env
```

Generate a JWT secret and place it in both the root `.env` and `backend/.env`:

```bash
openssl rand -base64 32
```

Set development-only seed passwords in `SEED_*_PASSWORD` variables before seeding.

## Database

```bash
docker compose up -d postgres
cd backend
npm install
npx prisma migrate dev
npx prisma db seed
```

See [`database.md`](database.md) for schema details. Host port mapping is `localhost:5433`.

## Run applications independently

Backend:

```bash
cd backend
npm install
npm run dev
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

From the repository root:

```bash
npm run dev:backend
npm run dev:frontend
```

## Quality checks

```bash
# Backend
cd backend && npm run lint && npm run build && npm test

# Frontend
cd frontend && npm run lint && npm run build
```

## Health check

```bash
curl http://localhost:4000/api/health
```

## Authentication smoke test

```bash
curl -c cookies.txt -H 'Content-Type: application/json' \
  -d '{"name":"Test Applicant","email":"test@example.com","password":"SecurePass1"}' \
  http://localhost:4000/api/auth/register

curl -b cookies.txt http://localhost:4000/api/auth/me
curl -b cookies.txt -X POST http://localhost:4000/api/auth/logout
```

See [`authentication.md`](authentication.md) for full auth/authorization details.
