# Edu Care — Project Context
Last updated: 18 November 2026

## Purpose
Build a college Learning Management System similar in broad scope to Moodle. It is separate from the existing `oni_lana` WordPress college website. Keep separate databases; do not couple the LMS to WordPress internals.

## Agreed architecture
- Frontend: React + TypeScript (Vite)
- Backend: Laravel / PHP
- Architecture: modular monolith
- Database: PostgreSQL
- Cache and queues: Redis
- File/object storage: S3-compatible storage
- Web server: Nginx
- Local development: Docker Compose
- API: versioned REST API under `/api/v1`
- Initial authentication: Laravel-managed; OIDC SSO later
- Initial delivery: responsive web app / PWA direction

## Roles and academic model
Roles: Super Admin, College Administrator, Department Administrator, Teacher, Student.
Academic entities: departments, programmes, academic sessions, semesters, batches, students, teachers, courses, instructor assignments and enrolments.

## Functional backlog — 16 epics
1. Project foundation: GitHub, React, Laravel, Docker, documentation, CI.
2. Authentication/RBAC: users, login, verification, recovery, roles, permissions, admin UI.
3. Academic management: departments, programmes, sessions, semesters, batches, students, teachers.
4. Courses/enrolment: course APIs, instructor assignment, enrolment, course builder/catalogue.
5. Learning content/video: lessons, secure uploads, PDFs, video, progress, lesson player.
6. Assignments: creation, student submission, teacher grading/feedback.
7. Examinations: question bank, exam setup, secure attempts, evaluation, results, testing.
8. Attendance: sessions, marking, reports.
9. Certificates: eligibility, PDF generation, QR verification.
10. Live classroom: provider selection/adapter, scheduling, attendance, recordings.
11. Analytics: student, teacher and administrator dashboards.
12. AI learning assistant: provider abstraction, document ingestion, permission-aware RAG, chat, governance.
13. WordPress integration: navigation links first, public content integration and OIDC later.
14. Security/privacy: audit logs, file security, privacy/retention, security assessment.
15. Deployment/operations: production Docker, HTTPS, workers, backups, monitoring, staging.
16. QA/release: backend/frontend/E2E/load tests, WCAG 2.2 AA target, college acceptance, launch.

## Release plan
**MVP:** auth/RBAC, profiles, academic structures, courses/enrolment, lessons/PDF/video, assignments, question bank/exams/results, attendance, basic dashboards/notifications, secure deployment/backups, WordPress navigation links.
**Release 1.1:** certificates, live classes, advanced analytics, OIDC SSO, public catalogue integration.
**Release 1.2:** AI assistant/RAG, recommendations, SCORM/H5P, advanced reporting.

## Critical engineering rules
- Use UUIDs for externally exposed records.
- Enforce authorization server-side with Laravel Policies/Gates; frontend hiding is not security.
- Validate with Form Requests; serialize with API Resources.
- Exam timers must be server-authoritative. Persist attempt snapshots, autosave, make submission idempotent, grade server-side, and never leak answer keys.
- Do not serve large video files directly through Laravel. Use a storage/streaming provider abstraction and permission-checked signed URLs.
- AI retrieval must enforce the same course, enrolment and document permissions as the LMS.
- Keep secrets out of Git. Add automated tests and audit logs for sensitive actions.

## Decisions still required
Expected student and concurrent-user counts; academic hierarchy; student ID format; grading and attendance policies; examination/retake rules; video and live-class provider; storage provider/region; AI provider and budget; email/notification service; SSO provider; hosting, backups, privacy and retention requirements. Do not invent college policies or vendor choices.

## Development workflow
Suggested GitHub board: Backlog → Ready → In Progress → Code Review → QA Testing → Done.
Definition of done: committed code, validation, server-side authorization, tests, API docs where relevant, error handling, security review, code review, QA evidence.

## Current artifact status
A starter ZIP named `EDU-CARE-Starter-Project.zip` was generated in this conversation. It contains an initial React dashboard, Laravel API foundation files, PostgreSQL/Redis configuration, Docker Compose/Nginx configuration, a health endpoint, an initial users migration and documentation.
This is a scaffold, not the complete LMS. Functional modules are not yet implemented. No GitHub repository, production deployment, test run, security assessment, load test or college acceptance test has been verified. Before relying on it as runnable, audit and validate Laravel's standard project bootstrap/dependencies and Docker startup locally. Never claim tests pass unless actually run.

## Instructions for a VS Code coding assistant
Read this file and README first. Inspect the repository and Git status; distinguish existing code from planned features. First audit the scaffold for missing Laravel files, dependency installation, Docker startup blockers, security issues and tests. Return an ordered fix list and exact commands before implementing features. Work in small increments, preserve the architecture, add tests with each feature, update docs when approved decisions change, and ask before choosing unresolved college policies/providers. Do not fabricate commits, tests, deployment status or issue completion.

## First implementation task
Audit the starter scaffold. Report: (1) files present, (2) setup/build blockers, (3) security concerns, (4) exact commands to validate, (5) prioritized fixes. Do not start all LMS modules at once.
