# Sprint Documentation — DocVerify AI Phase 2

**Course:** MIT 5.2 – Senior IT Project  
**Semester:** Winter 2026/27  
**Project:** DocVerify AI  
**Repository:** https://github.com/MuppalaPratheesh/docverify-ai  

This report summarises the Phase 2 implementation sprint for the core platform. It only lists work that was actually delivered and verified.

---

## 1. Sprint goal

Deliver a working Phase 2 foundation for academic document verification **without** AI/OCR/RAG:

- Authenticated multi-role web application
- Applicant applications and document uploads
- Manual reviewer workflow
- Administration panel
- PostgreSQL persistence with migrations
- Docker Compose packaging
- Automated tests and GitHub Actions CI on `main`

Success means a teammate (or examiner) can clone the repo, start Compose or local services, exercise the main flows, and see a green CI run on `main`.

---

## 2. Sprint backlog

| ID | Backlog item | Priority | Outcome |
|---|---|---|---|
| B1 | Monorepo scaffold (frontend/backend/docs/CI) | High | Done |
| B2 | PostgreSQL + Prisma schema, migrations, seed | High | Done |
| B3 | JWT cookie auth + RBAC | High | Done |
| B4 | Applicant applications + document upload/replace/download | High | Done |
| B5 | Reviewer dashboard, decisions, document requests | High | Done |
| B6 | Admin users, types, rules, sources, audit, dashboard | High | Done |
| B7 | Dockerfiles + Compose (frontend, backend, postgres, qdrant) | High | Done |
| B8 | Jest/Supertest unit + integration suite on test DB | High | Done |
| B9 | Production GitHub Actions pipeline | High | Done |
| B10 | Phase 2 technical documentation set | High | Done (this docs pass) |
| B11 | OCR / LLM / RAG features | — | **Deferred to Phase 3** |

---

## 3. Completed tasks

### Platform foundation
- React + Vite + TypeScript SPA with role-aware navigation
- Express + TypeScript API with env validation and `/api/health`
- Shared monorepo scripts for lint/build/test

### Data and security
- Prisma models for users, applications, documents, reviews, admin catalogs, audit logs
- Migrations and synthetic seed users
- bcrypt password hashing; JWT HttpOnly cookies
- Backend ownership and role checks; no password hashes in API responses
- Admins cannot change their own role

### Applicant / reviewer / admin product surfaces
- Application draft → submit flow with validated uploads (PDF/JPG/PNG)
- Reviewer queue, notes, decisions, additional-document requests
- Admin CRUD for document types, verification rules, reference sources; user search/role change; audit log view; dashboard totals

### Packaging and quality
- Multi-stage Docker images; Compose healthchecks and named volumes
- Backend waits for Postgres, runs `migrate deploy`, seeds, then serves API
- 67 automated Jest tests (unit + integration) against `docverify_test`
- CI jobs for lint, typecheck, build, tests, Prisma migrate checks, Compose validation, image builds

### Explicitly not completed
- OCR, LLM extraction, embeddings, Qdrant queries, RAG reports, email notifications

---

## 4. Pull requests

Merged into `main` during Phase 2 (feature branch `feat/phase2-foundation`):

| PR | Title | Merged (UTC) | URL |
|---|---|---|---|
| #11 | chore: initialize project foundation | 2026-11-16 | https://github.com/MuppalaPratheesh/docverify-ai/pull/11 |
| #12 | Database architecture and Prisma models | 2026-11-19 | https://github.com/MuppalaPratheesh/docverify-ai/pull/12 |
| #13 | Authentication and role-based access control | 2026-11-20 | https://github.com/MuppalaPratheesh/docverify-ai/pull/13 |
| #14 | Implement Reviewer Dashboard and Administration Module | 2026-11-20 | https://github.com/MuppalaPratheesh/docverify-ai/pull/14 |
| #15 | Phase 2: Docker, tests, and GitHub Actions CI | 2026-11-20 | https://github.com/MuppalaPratheesh/docverify-ai/pull/15 |

Documentation updates for this finalisation may follow in a subsequent commit/PR on top of `main`.

---

## 5. Testing results

### Automated suite (committed)

| Metric | Value |
|---|---|
| Framework | Jest + Supertest |
| Test files | 12 |
| Test cases (`it`) | 67 |
| Database | `docverify_test` (isolated) |
| Fixtures | Synthetic PDF/JPEG/PNG only |

Commands:

```bash
cd backend
npm run test:unit
npm run test:integration
npm test
```

### CI on `main`

Successful workflow run after merging PR #15:

- URL: https://github.com/MuppalaPratheesh/docverify-ai/actions/runs/44698784811
- Conclusion: **success**
- Jobs: frontend quality, backend quality, backend tests, Prisma migrate validation, Docker builds, success gate — all green

Earlier intermediate CI failures on the feature branch (for example incomplete Postgres wiring or an invalid workflow `env` context) were fixed before the final green `main` run. This document does not invent pass rates beyond the committed suite and that recorded Actions run.

### Manual Compose checks performed during Phase 2

- Four services started (`frontend`, `backend`, `postgres`, `qdrant`)
- Frontend HTTP 200 and Nginx `/health`
- Backend `/api/health` healthy
- Postgres seed users present
- Qdrant `/readyz` ready
- Upload file + DB row survived backend container restart

---

## 6. Sprint review

### Demonstrable outcomes
- End-to-end applicant → reviewer → admin paths on a local or Compose stack
- Clear separation between Phase 2 (manual verification platform) and Phase 3 (AI)
- Reproducible setup via `.env.example`, migrations, seed and Compose
- Examiner-visible CI evidence on GitHub Actions

### Feedback themes to carry forward
- Keep Qdrant in Compose but document that it is unused until Phase 3 (avoids false expectations)
- Prefer dedicated test DB and CI services over sharing development data
- Treat workflow YAML validation (`actionlint` / careful `env` usage) as part of the Definition of Done

---

## 7. Retrospective

### What went well
- Incremental PRs kept `main` reviewable
- Backend-enforced authorization caught UI-only mistakes early
- Docker entrypoint (wait → migrate → seed → start) reduced “works on my machine” API startup issues
- Expanding from a thin health API to full role workflows stayed within one monorepo

### What was difficult
- Host networking issues with remote managed Postgres (IPv6) pushed the team to rely on local Docker Postgres for day-to-day work
- Disk pressure / Docker Desktop instability briefly blocked image builds during packaging
- First CI workflow revision failed to parse because job-level `env` referenced the `env` context incorrectly; fixed and re-verified on `main`

### Improvements for the next sprint (Phase 3 planning)
- Add frontend component/e2e tests once AI UI appears
- Design OCR/LLM jobs as asynchronous workers with clear audit metadata
- Introduce object storage if upload volume grows beyond a single node
- Pin/upgrade GitHub Action runtimes when Node 20 deprecation warnings become blocking

---

## 8. Individual contribution log

This is an **individual** academic project. Primary author and repository owner: **Muppala Pratheesh** (`MuppalaPratheesh` on GitHub).

| Area | Contribution |
|---|---|
| Product scope | Defined Phase 2 vs Phase 3 boundaries; kept AI out of Phase 2 claims |
| Backend | Auth, applications, documents, reviewer and admin APIs; Prisma schema/migrations/seed |
| Frontend | Applicant, reviewer and admin pages aligned with API contracts |
| DevOps | Dockerfiles, Compose, volumes/healthchecks, GitHub Actions CI |
| Quality | Jest/Supertest suite, test DB isolation, CI green on `main` |
| Documentation | README and `docs/*` technical set for Phase 2 hand-in |

Development was assisted by an AI coding assistant (Cursor) for scaffolding and iterative fixes. Final responsibility for correctness, honesty of documentation and academic integrity remains with the student author. Commits that used the assistant may list a `Co-authored-by: Cursor` trailer where applicable.

---

## 9. Definition of Done checklist (Phase 2)

- [x] Features implemented behind real Postgres persistence  
- [x] Backend authorization enforced  
- [x] Docker Compose brings up four services  
- [x] Automated tests exist and are executed in CI  
- [x] Successful CI run recorded on `main`  
- [x] Documentation distinguishes Phase 2 vs Phase 3  
- [x] No claim of OCR/LLM/RAG functionality  

---

*End of Phase 2 sprint documentation.*
