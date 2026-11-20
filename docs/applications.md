# Applications and Document Uploads

## Applicant APIs

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/applications` | Create draft application |
| `GET` | `/api/applications` | List own applications (applicants) |
| `GET` | `/api/applications/:id` | Application detail |
| `PATCH` | `/api/applications/:id` | Update notes (DRAFT only) |
| `POST` | `/api/applications/:id/submit` | Submit draft (requires ≥1 active document) |
| `POST` | `/api/applications/:id/documents` | Upload/replace document (`multipart/form-data`) |
| `GET` | `/api/applications/:id/requests` | Reviewer document requests |
| `GET` | `/api/documents/:id/download` | Authorized download |
| `GET` | `/api/document-types` | Active document types |

## Upload rules

- Allowed types: PDF, JPG, PNG
- Max size: 10 MB (`MAX_FILE_SIZE_BYTES`)
- Multer stores files under `UPLOAD_DIR` with UUID filenames
- MIME type and magic-byte signatures are validated
- Uploads are never served as static public files
- Path traversal is blocked via basename/path confinement checks

## Replacement history

1. Original document remains in the database
2. Original status becomes `REPLACED`
3. New document stays on the same application
4. `supersededDocumentId` points to the replaced document

## Frontend routes

- `/` dashboard
- `/applications`
- `/applications/new`
- `/applications/:id`
