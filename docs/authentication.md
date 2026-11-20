# Authentication and Authorization

DocVerify AI uses JWT access tokens stored in **HttpOnly cookies** (never `localStorage`).

## API endpoints

| Method | Path | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Create an **APPLICANT** account only |
| `POST` | `/api/auth/login` | Public | Authenticate and set session cookie |
| `POST` | `/api/auth/logout` | Authenticated | Clear cookie and write logout audit |
| `GET` | `/api/auth/me` | Authenticated | Return current user (session restore) |
| `PATCH` | `/api/admin/users/:userId/role` | ADMIN | Change a user's role and audit the change |

## Registration rules

- Public registration always creates `APPLICANT` accounts.
- Client-supplied `role` fields are rejected (`400`).
- Email must be unique (`409` on conflict).
- Password requirements: min 8 chars, uppercase, lowercase, number.
- Passwords are hashed with bcrypt before storage.

## Cookie / JWT configuration

Controlled by environment variables:

- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `COOKIE_NAME`
- `COOKIE_SECURE`
- `COOKIE_HTTP_ONLY`
- `COOKIE_SAME_SITE`
- `CORS_ORIGIN` (must include the frontend origin; credentials enabled)

## Role capabilities

| Role | Capabilities |
|---|---|
| `APPLICANT` | Own applications and document uploads only |
| `REVIEWER` | View applications/documents for review, record decisions, request documents |
| `ADMIN` | Administrative user/role/document-type/rule management |

Ownership and permission checks are enforced in backend services (`authorizationService`), not by frontend visibility alone.

## Audit actions

- `USER_REGISTERED`
- `USER_LOGIN`
- `USER_LOGOUT`
- `USER_ROLE_CHANGED`

## Frontend behavior

- `/login` and `/register` pages
- Protected application routes
- Role-filtered sidebar navigation
- Session restored via `GET /api/auth/me` on refresh
- API calls use `credentials: 'include'`
