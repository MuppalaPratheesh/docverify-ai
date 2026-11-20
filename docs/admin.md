# Administration Panel

Admin features are restricted to `ADMIN` users via backend middleware. Passwords and password hashes are never returned.

## Routes

- `/admin/dashboard`
- `/admin/users`
- `/admin/document-types`
- `/admin/verification-rules`
- `/admin/reference-sources`
- `/admin/audit-logs`

## APIs

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/admin/dashboard` | Totals for users, applications and catalog |
| `GET` | `/api/admin/users` | Search/list users |
| `PATCH` | `/api/admin/users/:userId/role` | Change role (not own role) |
| `GET/POST/PATCH` | `/api/admin/document-types` | Document type CRUD + activate/deactivate |
| `GET/POST/PATCH` | `/api/admin/verification-rules` | Basic verification rule CRUD |
| `GET/POST/PATCH` | `/api/admin/reference-sources` | Reference source metadata CRUD |
| `GET` | `/api/admin/audit-logs` | Searchable audit trail |

## Audit actions

- `USER_ROLE_CHANGED`
- `DOCUMENT_TYPE_CREATED` / `DOCUMENT_TYPE_UPDATED`
- `VERIFICATION_RULE_CREATED` / `VERIFICATION_RULE_UPDATED`
- `REFERENCE_SOURCE_CREATED` / `REFERENCE_SOURCE_UPDATED`

No AI, RAG, vector search or prompt management is included in this Phase 2 panel.
