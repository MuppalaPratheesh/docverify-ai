# Reviewer Dashboard (Phase 2 Manual Review)

This module supports **manual** document review only. It does not generate AI verification results, authenticity scores, or tampering claims.

## Pages

- `/reviewer/dashboard`
- `/reviewer/applications`
- `/reviewer/applications/:id`

## APIs

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/reviewer/dashboard` | Queue counts and recent decisions |
| `GET` | `/api/reviewer/applications` | List/filter/search submitted applications |
| `GET` | `/api/reviewer/applications/:id` | Detail + history; moves `SUBMITTED` → `UNDER_REVIEW` |
| `PATCH` | `/api/reviewer/applications/:id/notes` | Save reviewer notes |
| `POST` | `/api/reviewer/applications/:id/decisions` | Record `APPROVED` / `NEEDS_INFORMATION` / `REJECTED` |
| `POST` | `/api/reviewer/applications/:id/requests` | Request missing/replacement document |

Query params for list:

- `status` — `SUBMITTED`, `UNDER_REVIEW`, `NEEDS_INFORMATION`, `COMPLETED`
- `q` — applicant name/email or application number

## Decision effects

| Decision | Application status |
|---|---|
| `APPROVED` | `COMPLETED` |
| `REJECTED` | `COMPLETED` |
| `NEEDS_INFORMATION` | `NEEDS_INFORMATION` |

Document requests require `documentTypeId` + explanation, create a `DocumentRequest`, set status to `NEEDS_INFORMATION`, and appear on the applicant application page.

When the applicant uploads a matching replacement, the open request is resolved and document history is preserved.

## Audit actions

- `APPLICATION_UNDER_REVIEW`
- `REVIEWER_NOTES_UPDATED`
- `DOCUMENT_REQUEST_CREATED`
- `APPLICATION_NEEDS_INFORMATION`
- `REVIEW_DECISION_RECORDED`
