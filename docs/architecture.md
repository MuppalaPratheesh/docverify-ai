# DocVerify AI Architecture

## Overview

DocVerify AI is organized as a monorepo with independently runnable frontend and backend applications.

```text
docverify-ai/
├── frontend/     React + Vite + TypeScript SPA
├── backend/      Express + TypeScript API
├── docs/         Project documentation
└── .github/      CI workflows
```

## Runtime layout (Phase 2 scaffold)

| Layer | Responsibility |
|---|---|
| Frontend | Application shell, routing, API health status display |
| Backend | HTTP API, environment validation, health endpoint |
| PostgreSQL | Primary relational data store (Prisma planned next) |
| Qdrant | Vector store reserved for Phase 3 AI features |

## Current API surface

- `GET /` — service metadata
- `GET /api/health` — liveness/health payload

## Security notes

- Secrets belong in `.env` files that are never committed.
- JWT cookie auth, uploads, Prisma models and role checks are planned for later Phase 2 steps.
- No OCR/LLM/RAG features are implemented in this scaffold.
