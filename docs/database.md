# DocVerify AI Database Structure

PostgreSQL is the primary datastore. Prisma ORM defines the schema, migrations and seed data under `backend/prisma/`.

## Starting PostgreSQL

```bash
# From repository root
docker compose up -d postgres
```

Docker Compose publishes PostgreSQL on **host port 5433** (container port 5432) to avoid conflicts with a local PostgreSQL instance on 5432.

Local backend connection string:

```text
postgresql://docverify_user:change_me_local_only@localhost:5433/docverify_db?schema=public
```

## Migrate and seed

```bash
cd backend
cp .env.example .env   # if needed, then set seed passwords
npm install
npx prisma migrate dev
npx prisma db seed
```

Or:

```bash
cd backend
npm run db:setup
```

## Enums

| Enum | Values |
|---|---|
| `UserRole` | `APPLICANT`, `REVIEWER`, `ADMIN` |
| `ApplicationStatus` | `DRAFT`, `SUBMITTED`, `UNDER_REVIEW`, `NEEDS_INFORMATION`, `COMPLETED` |
| `DocumentStatus` | `ACTIVE`, `REPLACED` |
| `ReviewDecision` | `APPROVED`, `NEEDS_INFORMATION`, `REJECTED` |
| `DocumentRequestStatus` | `OPEN`, `RESOLVED` |

## Entity relationship overview

```text
User (APPLICANT) 1──* Application 1──* Document *──1 DocumentType
User (REVIEWER)  1──* ReviewAction *──1 Application
User (REVIEWER)  1──* DocumentRequest *──1 Application
DocumentType 1──* VerificationRule
DocumentType 1──* DocumentRequest
Document  optional self-relation via supersededDocumentId
User optional 1──* AuditLog
ReferenceSource (standalone catalog)
```

## Models

### User (`users`)
- Unique: `email`
- Indexes: `role`, `createdAt`
- Owns applications, uploaded documents, review actions, document requests and audit entries

### Application (`applications`)
- Unique: `applicationNumber`
- FK: `applicantId` → `users.id` (`onDelete: Restrict`)
- Indexes: `applicantId`, `status`, `createdAt`

### DocumentType (`document_types`)
- Unique: `code`
- Seeded codes: `TRANSCRIPT`, `LANGUAGE_CERTIFICATE`
- Indexes: `active`

### Document (`documents`)
- FKs:
  - `applicationId` → `applications.id` (`Cascade`)
  - `documentTypeId` → `document_types.id` (`Restrict`)
  - `uploadedById` → `users.id` (`Restrict`)
  - `supersededDocumentId` → `documents.id` (`SetNull`, optional replacement history)
- Indexes: application, type, uploader, status, uploadedAt, superseded document

### ReviewAction (`review_actions`)
- FKs: `applicationId` (`Cascade`), `reviewerId` (`Restrict`)
- Indexes: application, reviewer, decision, createdAt

### DocumentRequest (`document_requests`)
- FKs: application (`Cascade`), reviewer (`Restrict`), document type (`Restrict`)
- Indexes: application, reviewer, document type, status, createdAt

### VerificationRule (`verification_rules`)
- FK: `documentTypeId` (`Restrict`)
- Indexes: document type, active flag, effective date

### ReferenceSource (`reference_sources`)
- Unique: (`title`, `version`)
- Index: `effectiveDate`

### AuditLog (`audit_logs`)
- FK: `actorId` → `users.id` (`SetNull`, optional for system events)
- `metadata` stored as JSON
- Indexes: actor, (`entityType`, `entityId`), action, createdAt

## Seed data

Seed credentials are read from environment variables (`SEED_*_EMAIL`, `SEED_*_PASSWORD`, optional `SEED_*_NAME`). Passwords are hashed with bcrypt and are never committed as production secrets.

Default synthetic accounts (development):

| Role | Email env | Purpose |
|---|---|---|
| ADMIN | `SEED_ADMIN_EMAIL` | Administration |
| REVIEWER | `SEED_REVIEWER_EMAIL` | Manual review |
| APPLICANT | `SEED_APPLICANT_EMAIL` | Document submission |

Also seeded:

- Document types `TRANSCRIPT` and `LANGUAGE_CERTIFICATE`
- One synthetic reference source baseline (`DocVerify Verification Baseline` v1.0.0)

## Useful Prisma commands

```bash
npx prisma generate
npx prisma migrate dev
npx prisma migrate deploy
npx prisma db seed
npx prisma studio
```
