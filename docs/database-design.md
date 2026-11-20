# Database Design — DocVerify AI Phase 2

PostgreSQL is the system of record. Prisma defines the schema, migrations and seed script under `backend/prisma/`. This document describes the Phase 2 relational design. It does not describe vector collections; Qdrant is unused by application logic in this phase.

Related older notes: [`database.md`](database.md).

## 1. Goals

- Store users, applications, documents and review activity reliably.
- Support role-based workflows with clear foreign keys.
- Keep an audit trail of security-relevant and administrative actions.
- Allow catalog configuration (document types, rules, reference sources) without code changes.

## 2. Technology

| Item | Choice |
|---|---|
| DBMS | PostgreSQL 16 |
| ORM | Prisma 6 |
| IDs | `cuid()` strings |
| Migrations | Prisma Migrate (`backend/prisma/migrations`) |
| Seed | `backend/prisma/seed.ts` (synthetic users + baseline catalog) |

## 3. Enumerations

| Enum | Values | Purpose |
|---|---|---|
| `UserRole` | `APPLICANT`, `REVIEWER`, `ADMIN` | Authorization |
| `ApplicationStatus` | `DRAFT`, `SUBMITTED`, `UNDER_REVIEW`, `NEEDS_INFORMATION`, `COMPLETED` | Lifecycle |
| `DocumentStatus` | `ACTIVE`, `REPLACED` | Upload history |
| `ReviewDecision` | `APPROVED`, `NEEDS_INFORMATION`, `REJECTED` | Manual outcomes |
| `DocumentRequestStatus` | `OPEN`, `RESOLVED` | Extra-document requests |

## 4. Entity-relationship overview

```text
User 1──* Application
User 1──* Document (as uploader)
User 1──* ReviewAction
User 1──* DocumentRequest (as reviewer)
User 1──* AuditLog (as actor, optional)

Application 1──* Document
Application 1──* ReviewAction
Application 1──* DocumentRequest

DocumentType 1──* Document
DocumentType 1──* DocumentRequest
DocumentType 1──* VerificationRule

Document  optional self-FK supersededDocumentId (replacement chain)

ReferenceSource  standalone catalog (title + version unique)
```

## 5. Core models

### User

| Field | Notes |
|---|---|
| `email` | Unique, stored lowercased at registration |
| `passwordHash` | bcrypt digest — never returned by APIs |
| `role` | Enum; public registration always creates `APPLICANT` |

### Application

| Field | Notes |
|---|---|
| `applicationNumber` | Unique human-readable id (`APP-YYYYMMDD-…`) |
| `applicantId` | Owner |
| `status` | Workflow state |
| `notes` | Applicant notes (editable in `DRAFT`) |
| `reviewerNotes` | Internal reviewer notes |

### DocumentType

Catalog entries such as `TRANSCRIPT` and `LANGUAGE_CERTIFICATE`. Inactive types cannot be chosen for new uploads.

### Document

Stores metadata and storage location only (not file bytes in the DB):

- `originalFilename`, `storedFilename`, `storagePath`
- `mimeType`, `fileSize`
- `status` (`ACTIVE` / `REPLACED`)
- `supersededDocumentId` for replacements

### ReviewAction

One row per recorded decision with `decision`, optional `comment`, `reviewerId` and `applicationId`.

### DocumentRequest

Reviewer asks for a specific `documentTypeId` with a message. Status moves from `OPEN` to `RESOLVED` when a matching upload is provided.

### VerificationRule

Admin-managed rule metadata bound to an optional document type (`title`, `description`, `effectiveDate`, `isActive`). Phase 2 stores and edits rules; it does **not** execute AI evaluation of them.

### ReferenceSource

Versioned reference metadata (`title` + `version` unique) for future citation / RAG work. Phase 2 is CRUD only.

### AuditLog

Append-only style event log: `actorId`, `action`, `entityType`, `entityId`, `metadata` (JSON), `createdAt`.

## 6. Integrity and indexes

- Cascades: documents/requests/actions delete with their application where defined in the schema.
- Restrict: deleting users who own applications is restricted to avoid orphaned ownership.
- Indexes exist on foreign keys, `status`, `role`, emails uniqueness and common list filters.

## 7. Migration workflow

```bash
cd backend
npx prisma migrate dev      # create/apply during development
npx prisma migrate deploy   # apply committed migrations (Docker/CI)
npx prisma migrate status
npx prisma validate
```

Docker backend entrypoint runs `migrate deploy` before starting the API.

## 8. Seeding

Seed creates:

- Active document types `TRANSCRIPT` and `LANGUAGE_CERTIFICATE`
- One admin, one reviewer and one applicant (credentials from `SEED_*` env vars)
- A baseline `ReferenceSource` row

Passwords are hashed with bcrypt. Seed data is for local/demo use only.

## 9. Test database

Automated tests use a separate database name `docverify_test` (see `backend/.env.test`). Production/development data must not be reused for tests.

## 10. What is not stored yet

- OCR text, embeddings or AI report tables
- Vector collection IDs in PostgreSQL
- Email outbox / notification tables

Those belong to Phase 3 design work.
