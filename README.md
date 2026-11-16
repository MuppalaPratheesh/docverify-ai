
# DocVerify AI
### AI-Powered Academic Document Verification System

**MIT 5.2 – Senior IT Project | Winter Semester 2026/27**

DocVerify AI is a web-based document verification platform designed to help educational institutions review academic documents submitted by applicants.

The system supports the submission and review of academic transcripts and language certificates. It provides tools for document management, application tracking, reviewer decisions and administration.

The long-term objective is to use OCR, Large Language Models (LLMs) and Retrieval-Augmented Generation (RAG) to support document verification with explainable findings and references.

The AI functionality is planned for Phase 3. Phase 2 focuses on implementing the core application and its infrastructure.

---

## 1. Project Objectives

- Provide a platform for applicants to submit academic documents.
- Allow applicants to track their application status.
- Enable reviewers to examine submitted documents.
- Support manual review decisions and additional document requests.
- Allow administrators to manage users, roles, document types and verification rules.
- Establish a secure, modular and containerized application architecture.
- Prepare the platform for future AI-based document verification.

## 2. User Roles

The platform supports three main roles:

| Role | Responsibilities |
|---|---|
| Applicant | Register, create applications, upload documents and track progress |
| Reviewer | Review applications, inspect documents, add comments and record decisions |
| Administrator | Manage users, roles, document types, verification rules and reference sources |

## 3. Document Types

The initial project scope focuses on:

- Academic transcripts
- Language certificates

Supported upload formats:

- PDF
- JPG
- PNG

Only synthetic or anonymized documents are used for development and testing.

## 4. Technology Stack

| Component | Technology |
|---|---|
| Frontend | React, Vite, TypeScript |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL |
| ORM | Prisma |
| Authentication | JWT, bcrypt |
| File Upload | Multer |
| Vector Database | Qdrant |
| Containerization | Docker, Docker Compose |
| CI/CD | GitHub Actions |
| Testing | Jest, Supertest |

## 5. Project Structure

```text
docverify-ai/
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── Dockerfile
│   └── package.json
│
├── backend/
│   ├── src/
│   ├── prisma/
│   ├── tests/
│   ├── Dockerfile
│   └── package.json
│
├── docs/
│
├── .github/
│   └── workflows/
│       └── ci.yml
│
├── docker-compose.yml
├── .dockerignore
├── .gitignore
├── .env.example
└── README.md
```

## 6. Phase 2 Implementation Scope

The core implementation focuses on:

- User registration and authentication.
- Role-based access control.
- Applicant application management.
- Academic document uploads and storage.
- Application status tracking.
- Reviewer dashboard.
- Manual review decisions and history.
- Requests for additional documents.
- Administrative user and document-type management.
- Verification rule management.
- Docker containerization.
- Automated testing.
- GitHub Actions CI pipeline.

Features will be marked as complete only after implementation and testing.

## 7. Planned Phase 3 Features

The following features are outside the current Phase 2 implementation scope:

- OCR and PDF text extraction.
- Automatic document classification.
- LLM-based structured data extraction.
- Retrieval-Augmented Generation (RAG).
- Vector embeddings and semantic search.
- AI verification reports.
- Versioned prompts and AI evaluation.

## 8. Prerequisites

Install the following software:

- Node.js (LTS version)
- npm
- Git
- Docker Desktop or Docker Engine
- Docker Compose

## 9. Installation and Setup

Clone the repository:

```bash
git clone https://github.com/MuppalaPratheesh/docverify-ai.git

cd docverify-ai
```

Create local environment files from the examples:

```bash
cp .env.example .env
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env
```

Generate a secure local JWT secret:

```bash
openssl rand -base64 32
```

Add the generated value to `JWT_SECRET` inside `.env` and `backend/.env`.

Update other environment variables if necessary. Never commit real secrets.

### Running with Docker

Docker Compose configuration will be added in a later Phase 2 step. Planned commands:

```bash
docker compose up --build -d
docker compose ps
docker compose logs -f
docker compose down
```

### Local Development

Frontend and backend run independently. Use two terminals.

**Backend** (http://localhost:4000):

```bash
cd backend
npm install
npm run dev
```

**Frontend** (http://localhost:3000):

```bash
cd frontend
npm install
npm run dev
```

Convenience scripts from the repository root:

```bash
npm run dev:backend
npm run dev:frontend
npm run lint
npm run build
npm test
```

Verify the API health endpoint:

```bash
curl http://localhost:4000/api/health
```

Expected response shape:

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "service": "docverify-ai-backend",
    "environment": "development",
    "timestamp": "...",
    "uptimeSeconds": 0
  }
}
```

For local backend development outside Docker, set the PostgreSQL hostname in `DATABASE_URL` to `localhost` (see `backend/.env.example`).

## 10. Application URLs

The planned local service addresses are:

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:4000 |
| Backend Health | http://localhost:4000/api/health |
| Qdrant | http://localhost:6333 |

## 11. Database Management

The project uses Prisma ORM with PostgreSQL.

Typical database commands:

```bash
npx prisma generate

npx prisma migrate dev

npx prisma studio
```

Production-style migration deployment:

```bash
npx prisma migrate deploy
```

Run these commands from the backend directory with a correctly configured database connection.

## 12. Testing and Code Quality

The project uses automated testing and code-quality checks.

Expected commands:

```bash
npm run lint

npm run build

npm test
```

Backend integration tests are written using Jest and Supertest.

GitHub Actions is configured to check code quality, run tests and build the application images.

## 13. Git Workflow

The project follows a feature-branch workflow.

1. Create a feature branch.
2. Implement the feature.
3. Commit changes using meaningful messages.
4. Push the branch to GitHub.
5. Open a pull request.
6. Obtain the required review and approval.
7. Merge into the main branch.

Example:

```bash
git switch -c feat/document-upload

git add .

git commit -m "feat(documents): implement document upload"

git push -u origin feat/document-upload
```

## 14. Security and Data Protection

- Never commit API keys, passwords or private credentials.
- Use environment variables for application configuration.
- Store passwords using secure password hashing.
- Implement backend role-based authorization.
- Validate uploaded files.
- Restrict access to application documents.
- Use only synthetic or anonymized documents.
- Never submit real personal documents to external AI services.

## 15. Available Scripts

| Location | Command | Description |
|---|---|---|
| `frontend/` | `npm run dev` | Start Vite development server |
| `frontend/` | `npm run build` | Typecheck and production build |
| `frontend/` | `npm run lint` | Run ESLint |
| `backend/` | `npm run dev` | Start Express API with hot reload |
| `backend/` | `npm run build` | Compile TypeScript to `dist/` |
| `backend/` | `npm run lint` | Run ESLint |
| `backend/` | `npm test` | Run Jest + Supertest |
| root | `npm run lint` / `build` / `test` | Run checks across apps |

## 16. Project Status

**Current milestone:** Phase 2 – Core Platform Implementation (scaffold complete)

**Completed in this step:**

- Monorepo layout (`frontend`, `backend`, `docs`, `.github/workflows`)
- React + Vite + TypeScript frontend with responsive sidebar layout
- Express + TypeScript backend with `/api/health`
- Environment examples and validation
- ESLint, Prettier, CI workflow and Docker ignore rules

**Repository:** https://github.com/MuppalaPratheesh/docverify-ai

This project is being developed as an individual academic project. Implementation status, testing evidence and documentation will be updated as development progresses.


---

MIT 5.2 – Senior IT Project  
Winter Semester 2026/27
