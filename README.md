# ONI LMS — Starter Project

A clean starter foundation for the ONI Learning Management System. This is the beginning of the application, **not the complete LMS**. It includes a React + TypeScript frontend, Laravel API foundation, PostgreSQL, Redis, and Docker/Nginx development setup.

## Architecture

- `frontend/` — React + TypeScript + Vite
- `backend/` — Laravel 12 API application
- PostgreSQL — primary relational database
- Redis — cache/queue backend
- Nginx — API reverse proxy
- Docker Compose — local development services

The LMS is independent of the existing `oni_lana` WordPress website. Do not connect the two databases. WordPress integration and SSO are later phases.

## Requirements

Install Docker Desktop (or Docker Engine + Compose) and Git.

## Start the project

From this directory:

```bash
docker compose up --build
```

First startup may take several minutes while Composer and npm install dependencies.

Open:
- Frontend: http://localhost:5173
- API health check: http://localhost:8080/api/v1/health

To run Laravel migrations:

```bash
docker compose exec backend php artisan migrate
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

Included:
- Docker Compose services for frontend, Laravel/PHP-FPM, Nginx, PostgreSQL, and Redis
- Laravel API health endpoint
- PostgreSQL connection configuration
- Redis cache/queue configuration
- React dashboard starter with API health indicator
- Initial users migration

Not yet implemented:
- Login, registration, password reset, role-based access control
- Departments, programmes, semesters, batches, courses and enrolments
- Lessons, video delivery, assignments, examinations and grading
- Attendance, certificates, live classes and analytics
- AI assistant / permission-aware document retrieval
- WordPress integration / SSO
- Production deployment, backups, monitoring and security hardening

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
