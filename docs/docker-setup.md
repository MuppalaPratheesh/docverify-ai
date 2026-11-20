# Docker Setup — DocVerify AI Phase 2

This guide explains how to run the full Phase 2 stack with Docker Compose. It matches the verified local setup used during development.

## 1. Services

| Service | Build / image | Host port | Purpose |
|---|---|---|---|
| `frontend` | `frontend/Dockerfile` | 3000 | Production React build via Nginx |
| `backend` | `backend/Dockerfile` | 4000 | Express API |
| `postgres` | `postgres:16-alpine` | 5433 → 5432 | Relational database |
| `qdrant` | `qdrant/qdrant` | 6333 (HTTP), 6334 (gRPC) | Reserved vector DB for Phase 3 |

Network: `docverify_net` (bridge).  
Restart policy: `unless-stopped` for all services.

## 2. Persistent volumes

| Volume | Mount | Contents |
|---|---|---|
| `postgres_data` | `/var/lib/postgresql/data` | Database files |
| `qdrant_data` | `/qdrant/storage` | Qdrant storage |
| `backend_uploads` | `/app/uploads` | Uploaded documents |

Data survives `docker compose restart` and container recreation. Removing volumes (`docker compose down -v`) deletes persisted data.

## 3. Prerequisites

- Docker Engine or Docker Desktop
- Docker Compose v2 (`docker compose`)
- Free ports 3000, 4000, 5433, 6333 (and 6334 if mapped)

## 4. Environment file

Compose reads the repository root `.env` (never commit it).

```bash
cp .env.example .env
```

Required values before first start:

- `POSTGRES_PASSWORD`
- `JWT_SECRET` (≥ 16 characters)
- `SEED_ADMIN_PASSWORD`, `SEED_REVIEWER_PASSWORD`, `SEED_APPLICANT_PASSWORD`

Optional toggles:

- `SEED_ON_START=true` (default) — seed synthetic users after migrate
- `VITE_API_BASE_URL` — baked into the frontend image at build time (default `http://localhost:4000/api`)

Inside Compose, the backend connection string uses hostname `postgres` on port `5432`. The host-mapped Postgres port remains **5433** for tools running outside containers.

## 5. Start the stack

From the repository root:

```bash
docker compose up --build
```

Detached:

```bash
docker compose up --build -d
docker compose ps
docker compose logs -f backend
```

### Backend startup sequence

1. Wait until Postgres accepts TCP connections.  
2. Run `prisma migrate deploy`.  
3. Run seed when `SEED_ON_START=true`.  
4. Start `node dist/server.js`.  
5. Healthcheck probes `GET /api/health`.

Frontend starts after the backend healthcheck succeeds.

## 6. Verify

```bash
curl -fsS http://localhost:3000/health          # Nginx health → ok
curl -fsS http://localhost:4000/api/health      # API JSON health
curl -fsS http://localhost:6333/readyz          # Qdrant readiness
docker exec docverify-postgres pg_isready -U docverify_user -d docverify_db
```

Open the SPA at http://localhost:3000 and log in with a seeded account from `.env`.

## 7. Uploads and restarts

Uploaded files live in `backend_uploads`. After `docker compose restart backend`, existing files and database rows remain available. This was verified during Phase 2 container testing with a synthetic PDF upload and download after restart.

## 8. Useful commands

```bash
docker compose config          # validate rendered Compose file
docker compose build backend   # rebuild one service
docker compose restart backend
docker compose down            # stop containers, keep volumes
docker compose down -v         # stop and delete volumes (destructive)
```

Root npm helpers:

```bash
npm run docker:up
npm run docker:up:detached
npm run docker:down
npm run docker:ps
npm run docker:logs
```

## 9. Local development vs Compose

| Mode | Frontend | Backend | Postgres URL host |
|---|---|---|---|
| Compose | Nginx container :3000 | API container :4000 | `postgres` (in-network) |
| Local Node | `npm run dev` :3000 | `npm run dev` :4000 | `localhost:5433` |

You can run only Postgres in Docker and develop API/UI on the host:

```bash
docker compose up -d postgres
```

## 10. Security notes for containers

- Do not bake secrets into Dockerfiles.
- Pass secrets through Compose environment / `.env`.
- Frontend image only receives public build args such as `VITE_API_BASE_URL`.
- Backend runs as a non-root user inside the image.
- Qdrant in local Compose typically has no API key; do not expose it publicly without protection.

## 11. Phase 3 note

Qdrant is started so Phase 3 can add embedding and search workers without changing the Compose topology. Phase 2 backend routes do **not** read or write Qdrant collections.
