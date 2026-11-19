# DocVerify AI Architecture

## Overview

DocVerify AI is organized as a monorepo with independently runnable frontend and backend applications.

```text
docverify-ai/
├── frontend/     React + Vite + TypeScript SPA
├── backend/      Express + TypeScript API + Prisma
├── docs/         Project documentation
└── .github/      CI workflows
```

## Runtime layout (Phase 2)

| Layer | Responsibility |
|---|---|
| Frontend | Application shell, routing, API health status display |
| Backend | HTTP API, environment validation, health endpoint, Prisma data access |
| PostgreSQL | Primary relational data store (Prisma models and migrations) |
| Qdrant | Vector store reserved for Phase 3 AI features |

## Data layer

Prisma models cover users, applications, documents, review workflow, verification rules, reference sources and audit logs. See [`database.md`](database.md) for the full schema.

## Current API surface

- `GET /` — service metadata
- `GET /api/health` — liveness/health payload

## Security notes

- Secrets belong in `.env` files that are never committed.
- Seed passwords are environment-configured and bcrypt-hashed.
- JWT cookie auth, uploads and role-protected routes are planned for later Phase 2 steps.
- No OCR/LLM/RAG features are implemented in this phase.
