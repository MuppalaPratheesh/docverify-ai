# Architecture — DocVerify AI Phase 2

## 1. Purpose

This document describes the runtime and software architecture of DocVerify AI after Phase 2. It covers what is running today. AI / OCR / RAG components are called out only as reserved extension points.

## 2. High-level view

```text
┌─────────────────────────────────────────────────────────────┐
│                         Client                              │
│              React SPA (Vite, TypeScript)                   │
│         Applicant / Reviewer / Admin views                  │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTP + credentials (cookies)
┌───────────────────────────▼─────────────────────────────────┐
│                    Express API (Node.js)                    │
│  Auth · Applications · Documents · Reviewer · Admin · Health│
│  Middleware: cookies, JWT, RBAC, Zod validation, Multer     │
└───────┬───────────────────────────────┬─────────────────────┘
        │                               │
        ▼                               ▼
┌───────────────────┐         ┌───────────────────┐
│   PostgreSQL      │         │  Upload storage   │
│   (Prisma ORM)    │         │  disk / volume    │
└───────────────────┘         └───────────────────┘

┌───────────────────┐
│ Qdrant (Compose)  │  ← running for Phase 3 readiness;
│                   │    Phase 2 application code does not query it
└───────────────────┘
```

## 3. Monorepo layout

```text
docverify-ai/
├── frontend/          SPA source, Nginx Dockerfile
├── backend/           API, Prisma, tests, API Dockerfile
├── docs/              Technical documentation
├── .github/workflows/ CI pipeline
├── docker-compose.yml Four-service stack
└── .env.example       Documented configuration
```

Frontend and backend are independently buildable and testable. Root `package.json` scripts proxy common lint/build/test commands.

## 4. Frontend architecture

- **Stack:** React 19, React Router, Vite, TypeScript.
- **Layout:** Shared authenticated shell with role-based navigation.
- **Data access:** `fetch` helpers with `credentials: 'include'` against `VITE_API_BASE_URL`.
- **Protection:** Client routes use a `ProtectedRoute` component; this is UX only. Real enforcement is on the API.
- **Production image:** Multi-stage build → static assets served by Nginx on port 3000 (SPA `try_files`).

Major route groups:

| Prefix | Audience |
|---|---|
| `/login`, `/register` | Public |
| `/applications/*` | Applicants |
| `/reviewer/*` | Reviewers |
| `/admin/*` | Administrators |

## 5. Backend architecture

- **Stack:** Express 5, TypeScript (compiled to CommonJS `dist/`).
- **Entry:** `src/server.ts` loads validated env and listens on `HOST`/`PORT`.
- **App factory:** `createApp()` mounts routers and error handlers (also used by Supertest).
- **Layers:**
  - **Routes** — HTTP mapping and status codes
  - **Validators** — Zod schemas (strict objects where role injection must be rejected)
  - **Services** — business rules, ownership, Prisma transactions
  - **Middleware** — `requireAuth`, `requireRoles`, upload, error handling
  - **Utils** — password hashing, JWT, file signatures, application status helpers

Mounted API prefixes:

| Mount | Responsibility |
|---|---|
| `/api/health` | Liveness |
| `/api/auth` | Register, login, logout, session |
| `/api/applications` | Applicant application lifecycle |
| `/api/documents` | Authorized download |
| `/api/document-types` | Active catalog for uploads |
| `/api/reviewer` | Review queue and decisions |
| `/api/admin` | Administration CRUD and audit |

## 6. Authentication and authorization

1. Registration creates an `APPLICANT` only (role cannot be supplied by the client).
2. Passwords are bcrypt-hashed (`BCRYPT_SALT_ROUNDS`).
3. Successful auth sets an HttpOnly cookie containing a JWT (`COOKIE_NAME`).
4. `requireAuth` verifies the JWT and loads the current user from PostgreSQL.
5. `requireRoles(...)` gates reviewer and admin routers.
6. Ownership helpers block applicants from other users’ applications and files.
7. Administrators cannot change their own role through the admin role API.

Audit log rows are written for registration, login/logout, role changes, application events and review actions.

## 7. Document storage

- Uploads go through Multer to a temporary location, then are validated (PDF/JPEG/PNG signatures) and moved under `UPLOAD_DIR` with a UUID filename.
- Metadata (original name, MIME, size, status, uploader) is stored in PostgreSQL.
- Downloads stream from disk only after authorization checks.
- Files are **not** exposed via a public `/uploads` static route.

## 8. Application status flow (manual)

```text
DRAFT → SUBMITTED → UNDER_REVIEW → COMPLETED
                 ↘ NEEDS_INFORMATION ↗ (after applicant upload / later decision)
```

- Submit requires at least one active document.
- Opening a submitted application as a reviewer moves it to `UNDER_REVIEW`.
- Document requests set `NEEDS_INFORMATION`.
- Approve / reject decisions set `COMPLETED`.

No automated AI status changes exist in Phase 2.

## 9. Docker deployment architecture

Compose services on network `docverify_net`:

| Service | Image / build | Persistence |
|---|---|---|
| `frontend` | `frontend/Dockerfile` | — |
| `backend` | `backend/Dockerfile` + entrypoint | `backend_uploads` |
| `postgres` | `postgres:16-alpine` | `postgres_data` |
| `qdrant` | `qdrant/qdrant` | `qdrant_data` |

Backend entrypoint waits for Postgres TCP, runs `prisma migrate deploy`, optionally seeds, then starts `node dist/server.js`.

## 10. Extension points for Phase 3

The following are intentionally **not** wired in Phase 2 application code:

- Calling Qdrant for embeddings or search
- OCR pipelines
- LLM prompt execution or RAG retrieval
- Automated verification report generation

When Phase 3 begins, new services can sit beside the existing Express routers without replacing auth, storage ownership or the relational schema.

## 11. Related documents

- [`database-design.md`](database-design.md)
- [`api-documentation.md`](api-documentation.md)
- [`docker-setup.md`](docker-setup.md)
- [`authentication.md`](authentication.md)
