# Testing — DocVerify AI Phase 2

This document describes the automated test approach for Phase 2. Figures below come from the committed Jest suite and from a successful GitHub Actions run on `main`. They are not estimates.

## 1. Goals

- Exercise real Express routes with Supertest (no fake always-green stubs).
- Use a dedicated PostgreSQL database (`docverify_test`), not production data.
- Cover both pure unit logic and end-to-end HTTP flows.
- Use only synthetic files (minimal PDF/JPEG/PNG bytes), never real personal documents.
- Fail CI when lint, typecheck, tests, migrations or Docker builds fail.

## 2. Tooling

| Tool | Use |
|---|---|
| Jest | Test runner |
| Supertest | HTTP assertions against `createApp()` |
| PostgreSQL | Persistence for integration and ownership tests |
| Prisma | Migrate + seed inside Jest global setup |

Configuration: `backend/jest.config.cjs`  
Env defaults: `backend/.env.test` (overridden by CI `DATABASE_URL` when set)

## 3. Layout

```text
backend/tests/
├── setup/           loadTestEnv, globalSetup/Teardown, jest.setup, seed
├── helpers/         fixtures, synthetic files, DB reset
├── unit/            password, validation, roles, status, files, ownership, decisions
├── integration/     auth, applications, reviewer, admin
└── health.test.ts
```

## 4. Commands

From `backend/`:

```bash
npm run test:unit          # unit folder only
npm run test:integration   # integration folder + health
npm test                   # full suite
```

From repository root:

```bash
npm test
```

Prerequisites:

- PostgreSQL reachable (local Docker on port 5433, or CI service on 5432)
- Ability to create/use database `docverify_test`
- `psql` available for global setup when creating the DB locally

## 5. Suite size (as committed)

| Metric | Count |
|---|---|
| Test files | 12 |
| `it(...)` cases | 67 |

Breakdown by area (approximate by folder purpose):

- **Unit:** password hashing, auth Zod schemas, role middleware helpers, application status transitions, file signature validation, ownership asserts, review decision schemas
- **Integration:** registration/login/logout, duplicate email, application CRUD/upload/metadata, unauthorized access, reviewer decisions/requests/replacements, admin role updates and admin API denial
- **Health:** `GET /api/health`

Global setup migrates and seeds synthetic admin/reviewer/applicant users. `beforeEach` resets transactional tables while keeping seed users and baseline document types.

## 6. What the suite intentionally does not cover

- OCR / LLM / RAG behaviour (not implemented)
- Load / performance testing
- Frontend component unit tests (Phase 2 focuses on API correctness; frontend is covered by lint, typecheck and production build in CI)
- Penetration testing beyond ownership and role denial cases

## 7. Continuous Integration

Workflow: `.github/workflows/ci.yml`

Backend test job:

- Starts `postgres:16-alpine` as a GitHub Actions service
- Runs `npm run test:unit` then `npm run test:integration`
- Uses synthetic CI seed passwords defined in the workflow (not production secrets)

Observed successful `main` run (all jobs green):  
https://github.com/MuppalaPratheesh/docverify-ai/actions/runs/44698784811

Jobs in that run:

| Job | Conclusion |
|---|---|
| Frontend lint, typecheck, build | success |
| Backend lint and typecheck | success |
| Backend unit and integration tests | success |
| Prisma migration validation | success |
| Docker Compose and image builds | success |
| CI success gate | success |

## 8. Manual verification notes (Phase 2)

In addition to automated tests, Docker Compose was exercised locally:

- All four containers started healthy
- Frontend and `/api/health` responded
- Postgres accepted connections and retained seed users
- Qdrant `/readyz` responded
- A synthetic PDF upload remained readable after `docker compose restart backend`

Those checks validate packaging; they are not counted as additional Jest cases.

## 9. Writing new tests

1. Prefer the helpers in `tests/helpers/` for emails, login agents and synthetic files.  
2. Assert both success and failure paths.  
3. Never commit real personal documents.  
4. Keep tests deterministic (`--runInBand`, unique emails, DB reset).  
5. Do not weaken assertions to force a green build.
