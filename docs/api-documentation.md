# API Documentation — DocVerify AI Phase 2

Base URL (local): `http://localhost:4000/api`  
Content type: `application/json` unless uploading multipart files.  
Authentication: HttpOnly session cookie set on login/register (`COOKIE_NAME`, default `docverify_session`). Browser clients must send `credentials: 'include'`.

Responses generally follow:

```json
{ "success": true, "data": { } }
```

Errors:

```json
{ "success": false, "error": { "message": "…" } }
```

Password hashes are never included in responses.

---

## 1. Health

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | No | Liveness payload |

---

## 2. Authentication (`/api/auth`)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | No | Create applicant account; sets cookie |
| POST | `/auth/login` | No | Login; sets cookie |
| POST | `/auth/logout` | Yes | Clears cookie; writes audit log |
| GET | `/auth/me` | Yes | Current public user profile |

### Register body

```json
{ "name": "Ada Lovelace", "email": "ada@example.com", "password": "SecurePass1" }
```

Rules:

- Password min 8 chars with upper, lower and digit.
- Extra fields such as `role` are rejected (`strict` schema).
- Duplicate email → `409`.

### Login body

```json
{ "email": "ada@example.com", "password": "SecurePass1" }
```

Invalid credentials → `401` (generic message).

---

## 3. Document types (`/api/document-types`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/document-types` | Yes | List active types for upload UI |

---

## 4. Applications (`/api/applications`)

Requires authentication. Applicants see only their own applications. Reviewers/admins have broader list rules as implemented in services.

| Method | Path | Roles | Description |
|---|---|---|---|
| POST | `/applications` | APPLICANT (ADMIN allowed by service) | Create `DRAFT` application |
| GET | `/applications` | Authenticated | List applications for caller |
| GET | `/applications/:id` | Owner / REVIEWER / ADMIN | Application detail |
| PATCH | `/applications/:id` | Owner | Update notes while `DRAFT` |
| POST | `/applications/:id/submit` | Owner | `DRAFT` → `SUBMITTED` (needs ≥1 active doc) |
| POST | `/applications/:id/documents` | APPLICANT / ADMIN | Multipart upload |
| GET | `/applications/:id/requests` | Owner / REVIEWER / ADMIN | Document requests |

### Create body

```json
{ "notes": "Optional applicant notes" }
```

### Upload (multipart)

Fields:

- `file` — required
- `documentTypeId` — required
- `replaceDocumentId` — optional; marks previous document `REPLACED`

Allowed content: PDF, JPEG, PNG (validated by magic bytes, not extension alone).  
Upload allowed only when application status is `DRAFT` or `NEEDS_INFORMATION`.

Cross-applicant access → `403`. Missing application → `404`.

---

## 5. Documents (`/api/documents`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/documents/:id/download` | Yes + access check | Stream file |

Unauthorized callers receive `403`. The API does not expose a public uploads directory.

---

## 6. Reviewer (`/api/reviewer`)

Requires `REVIEWER` or `ADMIN`.

| Method | Path | Description |
|---|---|---|
| GET | `/reviewer/dashboard` | Counts and recent decisions |
| GET | `/reviewer/applications` | Queue; query `status`, `q` |
| GET | `/reviewer/applications/:id` | Detail; may move `SUBMITTED` → `UNDER_REVIEW` |
| PATCH | `/reviewer/applications/:id/notes` | Update `reviewerNotes` |
| POST | `/reviewer/applications/:id/decisions` | Record decision |
| POST | `/reviewer/applications/:id/requests` | Request additional document |

### Decision body

```json
{
  "decision": "APPROVED",
  "comment": "Optional comment"
}
```

`decision` ∈ `APPROVED` | `NEEDS_INFORMATION` | `REJECTED`.  
Completed applications reject further decisions (`400`).

### Document request body

```json
{
  "documentTypeId": "…",
  "message": "Please upload a language certificate (min 10 chars)."
}
```

Sets application status to `NEEDS_INFORMATION`.

Applicants calling reviewer routes → `403`.

---

## 7. Administration (`/api/admin`)

Requires `ADMIN` only. Applicants and reviewers receive `403`.

| Method | Path | Description |
|---|---|---|
| GET | `/admin/dashboard` | Totals for users, applications by status, open requests |
| GET | `/admin/users` | List/search users (`q`, optional `role`) |
| PATCH | `/admin/users/:userId/role` | Change role (cannot change own role) |
| GET/POST | `/admin/document-types` | List / create |
| PATCH | `/admin/document-types/:id` | Update / activate / deactivate |
| GET/POST | `/admin/verification-rules` | List / create |
| PATCH | `/admin/verification-rules/:id` | Update |
| GET/POST | `/admin/reference-sources` | List / create |
| PATCH | `/admin/reference-sources/:id` | Update |
| GET | `/admin/audit-logs` | Searchable audit trail |

Role change body:

```json
{ "role": "REVIEWER" }
```

Self role change → `400`. User responses omit `passwordHash`.

---

## 8. Common status codes

| Code | Meaning |
|---|---|
| 200 / 201 | Success |
| 400 | Validation or illegal state transition |
| 401 | Missing/invalid session |
| 403 | Authenticated but not permitted |
| 404 | Resource not found (or hidden) |
| 409 | Conflict (e.g. duplicate email) |

---

## 9. Out of scope for this API (Phase 3)

There are **no** endpoints for:

- OCR jobs
- LLM extraction
- Embedding generation
- RAG / Qdrant search
- AI verification reports

Those will be documented when Phase 3 implements them.
