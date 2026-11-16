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

Or from the repository root (npm workspaces):

```bash
npm install
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
