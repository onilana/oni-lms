# Edu Care

Edu Care Learning Management System — a full-stack academic LMS built with React + TypeScript + Vite (`frontend/`) and Laravel 12 (`backend/`), backed by PostgreSQL, Redis, and Nginx.

## Architecture

- `frontend/` — React + TypeScript + Vite
- `backend/` — Laravel 12 API application (`/api/v1`)
- PostgreSQL — primary relational database
- Redis — cache/queue backend
- Nginx — API reverse proxy
- Docker Compose — local development services

The LMS is independent of the `oni_lana` WordPress website and uses separate databases with signed HMAC-SHA256 SSO assertions.

## Requirements

Install Docker Desktop (or Docker Engine + Compose) and Git.

## Start the project

From this directory:

1. Create the root `.env` file and configure secure secrets (`APP_KEY`, `DB_PASSWORD`, `INITIAL_ADMIN_PASSWORD`, `WORDPRESS_WEBHOOK_SECRET`):

```bash
cp .env.example .env
docker compose config
```

2. Build and start the services:

```bash
docker compose up --build
```

Open:
- Frontend: http://localhost:5173
- API health check: http://localhost:8080/api/v1/health

3. Run Laravel migrations and initial role/admin seeding explicitly:

```bash
docker compose exec backend php artisan migrate
docker compose exec backend php artisan db:seed --class=RoleAndPermissionSeeder
```

To generate an application key if one is not already present:

```bash
docker compose exec backend php artisan key:generate
```

## Useful commands

```bash
# Stop services
docker compose down

# Stop services and remove the local database volume (DELETES local DB DATA)
docker compose down -v

# View logs
docker compose logs -f

# Laravel shell
docker compose exec backend sh

# Frontend shell
docker compose exec frontend sh
```

## Project structure

```text
oni-lms/
├── backend/
│   ├── app/Http/Controllers/Api/V1/
│   ├── bootstrap/
│   ├── config/
│   ├── database/migrations/
│   ├── public/
│   ├── routes/
│   ├── Dockerfile
│   └── composer.json
├── frontend/
│   ├── src/
│   ├── Dockerfile
│   ├── index.html
│   └── package.json
├── docker/nginx/default.conf
├── .env.example
└── docker-compose.yml
```

## Current implementation status

Implemented modules:
- Docker Compose services for frontend, Laravel/PHP-FPM, Nginx, PostgreSQL, and Redis
- Authentication & RBAC (Sanctum, roles, permissions, Student/Teacher/Department/Admin dashboards)
- Academic management (departments, programmes, sessions, semesters, batches)
- Courses, enrolments, sections, lessons, and learning content
- Assignments, submissions, grading, examinations, and question bank
- Attendance, certificates, live sessions, announcements, and notifications
- Analytics, AI assistant, WordPress integration/SSO, audit logs, and database backups

Remaining production hardening:
- HttpOnly cookie-based SPA session auth (replacing `localStorage` bearer tokens)
- Production Docker/HTTPS/monitoring deployment configuration and off-site encrypted backup storage
- Broad negative authorization testing and policy centralization across all endpoints

## Development rules

- Keep API routes under `/api/v1`.
- Enforce authorization on the server with Laravel Policies/Gates.
- Validate input using Laravel Form Requests.
- Use API Resources for response formatting.
- Never commit `.env`, credentials, API keys, or production secrets.
- Use UUIDs for externally exposed records.
- Add automated tests with every feature.
- Do not store large video files on the Laravel application server.
- AI retrieval must enforce the user's course, enrolment and document permissions.

## Next development milestone

Implement authentication and RBAC, then academic management. Confirm college-specific rules (student ID format, grading, attendance and exam policies) before encoding them in the database.
