# DocVerify AI

### Academic Document Verification Platform (Phase 2)

**MIT 5.2 – Senior IT Project | Winter Semester 2026/27**  
**Repository:** https://github.com/MuppalaPratheesh/docverify-ai

DocVerify AI is a web application that helps educational institutions collect, review and administer academic documents submitted by applicants. Phase 2 delivers the core platform: authentication, applications, document uploads, manual reviewer workflows, administration, Docker packaging, automated tests and CI.

OCR, LLM extraction, RAG and vector search are **not** implemented in Phase 2. Those capabilities are planned for Phase 3. Qdrant is included in Docker Compose so the Phase 3 vector store can be connected later without redesigning the stack.

---

## 1. Project overview

Applicants register, create applications and upload academic transcripts or language certificates (PDF, JPG or PNG). Reviewers inspect submitted files, leave notes, request additional documents and record approve / needs-information / reject decisions. Administrators manage users, document types, verification rules, reference sources and audit logs.

The system is a TypeScript monorepo with a React frontend and an Express API backed by PostgreSQL (Prisma). Uploaded files are stored on disk (or a Docker volume) and are never served as public static assets.

## 2. Product objectives

- Let applicants submit and track academic applications.
- Let reviewers perform structured manual review.
- Let administrators configure catalog data and roles.
- Enforce authentication and authorization on the backend.
- Provide a reproducible Docker-based local environment.
- Establish automated tests and GitHub Actions CI.
- Keep the architecture ready for Phase 3 AI features without claiming they exist today.

## 3. Implemented Phase 2 features

| Area | Status |
|---|---|
| Applicant registration and login (JWT HttpOnly cookie) | Implemented |
| Role-based access (APPLICANT, REVIEWER, ADMIN) | Implemented |
| Application create / draft / submit | Implemented |
| Document upload, replacement and authorized download | Implemented |
| MIME/signature validation for PDF, JPG, PNG | Implemented |
| Reviewer queue, notes, decisions and document requests | Implemented |
| Administration (users, types, rules, sources, audit logs, dashboard) | Implemented |
| PostgreSQL schema, migrations and seed users | Implemented |
| Docker Compose (frontend, backend, postgres, qdrant) | Implemented |
| Jest + Supertest unit and integration tests | Implemented |
| GitHub Actions CI on `main` | Implemented |
| OCR / LLM / RAG / embeddings | **Not implemented (Phase 3)** |

## 4. Technology stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, TypeScript, React Router |
| Backend | Node.js 20+, Express 5, TypeScript |
| Database | PostgreSQL 16, Prisma ORM |
| Auth | bcrypt password hashing, JWT in HttpOnly cookies |
| Uploads | Multer + magic-byte validation |
| Containers | Docker, Docker Compose, Nginx (frontend image) |
| Vector DB (reserved) | Qdrant (running, unused by Phase 2 app logic) |
| CI | GitHub Actions |
| Tests | Jest, Supertest |

## 5. Application architecture

```text
Browser (React SPA)
        │  HTTPS/HTTP + cookies
        ▼
Express API  ──► PostgreSQL (Prisma)
        │
        ├── local/volume file storage (uploads)
        └── Qdrant (Phase 3 reserved; no Phase 2 queries)
```

- **Frontend:** role-aware routes for applicants, reviewers and admins.
- **Backend:** REST JSON API under `/api/*` with middleware for auth, roles and validation.
- **Database:** relational model for users, applications, documents, reviews and admin catalogs.
- **Compose network:** services communicate on an internal bridge; only published ports are exposed to the host.

More detail: [`docs/architecture.md`](docs/architecture.md).

## 6. Prerequisites

- Node.js 20 or newer and npm
- Git
- Docker Desktop or Docker Engine with Docker Compose
- Optional: `psql` / `curl` for manual checks

## 7. Local installation

```bash
git clone https://github.com/MuppalaPratheesh/docverify-ai.git
cd docverify-ai

cp .env.example .env
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env
```

Generate a JWT secret and set it in `.env` and `backend/.env`:

```bash
openssl rand -base64 32
```

Also set synthetic seed passwords (`SEED_*_PASSWORD`) before seeding. Never commit real secrets.

**Start PostgreSQL (host port 5433):**

```bash
docker compose up -d postgres
```

**Backend** (http://localhost:4000):

```bash
cd backend
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev
```

**Frontend** (http://localhost:3000):

```bash
cd frontend
npm install
npm run dev
```

Health check:

```bash
curl http://localhost:4000/api/health
```

## 8. Environment configuration

| File | Purpose |
|---|---|
| `.env.example` | Documented root variables for Compose |
| `.env` | Local Compose secrets (gitignored) |
| `backend/.env.example` | Backend-local development template |
| `backend/.env` | Backend secrets (gitignored) |
| `backend/.env.test` | Dedicated test DB settings (`docverify_test`) |
| `frontend/.env.example` | `VITE_API_BASE_URL` for the SPA |

Important variables:

- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — signing key (min. 16 characters)
- `CORS_ORIGIN` / `FRONTEND_URL` — browser origin (default `http://localhost:3000`)
- `UPLOAD_DIR` — file storage path
- `QDRANT_URL` — reserved for Phase 3 (`http://qdrant:6333` in Compose)
- `SEED_*` — synthetic demo accounts only

## 9. Docker Compose startup

```bash
cp .env.example .env
# Set JWT_SECRET and SEED_* passwords in .env

docker compose up --build
```

| Service | Host port | Notes |
|---|---|---|
| frontend | 3000 | Nginx serves the production React build |
| backend | 4000 | Waits for Postgres, runs migrations + seed, then starts API |
| postgres | 5433 | Named volume `postgres_data` |
| qdrant | 6333 | Named volume `qdrant_data` (unused by Phase 2 logic) |

Uploads persist in volume `backend_uploads`.

```bash
docker compose ps
docker compose logs -f
docker compose down
```

Full guide: [`docs/docker-setup.md`](docs/docker-setup.md).

## 10. Database migration and seed

```bash
cd backend
npx prisma migrate dev          # local development
npx prisma migrate deploy       # Docker / CI
npx prisma db seed
npx prisma studio               # optional UI
```

Seeded synthetic users (passwords come from env):

| Role | Default email (example) |
|---|---|
| ADMIN | `admin@docverify.local` |
| REVIEWER | `reviewer@docverify.local` |
| APPLICANT | `applicant@docverify.local` |

Schema details: [`docs/database-design.md`](docs/database-design.md).

## 11. API endpoint overview

Base URL: `http://localhost:4000/api`

| Group | Examples |
|---|---|
| Health | `GET /health` |
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` |
| Applications | `GET/POST /applications`, submit, upload documents |
| Documents | `GET /documents/:id/download` |
| Reviewer | dashboard, queue, decisions, document requests |
| Admin | users, document types, rules, sources, audit logs |
| Catalog | `GET /document-types` (authenticated) |

Full reference: [`docs/api-documentation.md`](docs/api-documentation.md).

## 12. User roles and permissions

| Capability | Applicant | Reviewer | Admin |
|---|---|---|---|
| Register / login | Yes | Yes (seeded) | Yes (seeded) |
| Own applications & uploads | Yes | No | Limited (admin tools) |
| Reviewer APIs | No | Yes | Yes |
| Admin APIs | No | No | Yes |
| Change own role | No | No | No (blocked) |
| Download another applicant’s files | No | Yes (review) | Yes |

Authorization is enforced in Express middleware and service-layer ownership checks, not only in the UI.

## 13. Automated test commands

```bash
# From repository root
npm test

# Backend only
cd backend
npm run test:unit
npm run test:integration
npm test
```

Tests use PostgreSQL database `docverify_test`, synthetic fixtures only, and reset transactional data between cases. See [`docs/testing.md`](docs/testing.md).

Local quality checks:

```bash
npm run lint
npm run typecheck
npm run build
```

## 14. GitHub Actions

Workflow: [`.github/workflows/ci.yml`](.github/workflows/ci.yml)

Triggers: push to `main`, pull requests targeting `main`, manual `workflow_dispatch`.

Jobs:

1. Frontend lint, typecheck, build  
2. Backend lint and typecheck  
3. Backend unit + integration tests (Postgres service)  
4. Prisma validate / migrate deploy / migrate status  
5. Docker Compose config check + frontend/backend image builds  
6. CI success gate  

Example successful run on `main`:  
https://github.com/MuppalaPratheesh/docverify-ai/actions/runs/44698784811

Inspect: GitHub → **Actions** → **CI** → open a run → expand job logs.  
CLI: `gh run list --branch main` then `gh run view <id>`.

## 15. Known limitations and Phase 3

**Phase 2 limitations**

- No OCR, PDF text extraction or automatic classification.
- No LLM prompts, structured AI extraction or verification reports.
- No RAG, embeddings or Qdrant queries from the application.
- Review is manual only.
- File storage is local/volume-based (not object storage).
- Email notifications are not implemented.

**Planned Phase 3 (not started)**

- OCR and document text extraction  
- LLM-assisted field extraction  
- Embeddings + Qdrant semantic search  
- RAG-backed explainable findings with references  
- Versioned prompts and evaluation  

---

## Further documentation

| Document | Content |
|---|---|
| [`docs/architecture.md`](docs/architecture.md) | System architecture |
| [`docs/database-design.md`](docs/database-design.md) | Schema and relationships |
| [`docs/api-documentation.md`](docs/api-documentation.md) | API reference |
| [`docs/docker-setup.md`](docs/docker-setup.md) | Container setup |
| [`docs/testing.md`](docs/testing.md) | Test strategy and commands |
| [`docs/sprint-documentation.md`](docs/sprint-documentation.md) | Sprint report |
| [`docs/authentication.md`](docs/authentication.md) | Auth details |
| [`docs/applications.md`](docs/applications.md) | Applicant flows |
| [`docs/reviewer.md`](docs/reviewer.md) | Reviewer flows |
| [`docs/admin.md`](docs/admin.md) | Admin panel |

---

MIT 5.2 – Senior IT Project  
Winter Semester 2026/27  
Individual academic project — documentation reflects implemented Phase 2 behaviour only.
