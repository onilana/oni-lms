# Edu Care --- Complete Requirements & Development Roadmap

**Document type:** Product requirements and implementation roadmap\
**Project:** Edu Care Learning Management System (Edu Care)\
**Status:** Requirements baseline --- implementation must be verified
against source code and tests\
**Version:** 1.0\
**Last updated:** 19 November 2026

------------------------------------------------------------------------

## 1. Project Overview

Edu Care is an independent Learning Management System intended to support
college academic administration, teaching, learning, assessment,
attendance, communication, reporting, and related workflows.

This document consolidates the agreed architecture, development rules,
current starter-project baseline, and the 15 development milestones.

The project is a staged development effort. The starter project is
**not** a complete LMS. A requirement must not be marked complete merely
because it appears in this document, README, a route, a migration, or a
controller. Completion requires working implementation and appropriate
verification.

### 1.1 Project goals

-   Provide a secure, maintainable college LMS.
-   Support administrators, academic leaders, teachers, students, and
    non-teaching staff.
-   Manage academic structures, courses, enrolments, learning content,
    assessments, and results.
-   Track attendance and student learning progress.
-   Provide reporting, notifications, and integrations.
-   Support future AI-assisted, permission-aware learning and document
    retrieval.
-   Provide a production-ready deployment with backup, monitoring, and
    security controls.

### 1.2 Scope principles

-   Edu Care is independent of the existing `oni_lana` WordPress website.
-   The LMS and WordPress must use separate databases.
-   WordPress integration and SSO are later-phase work.
-   Do not store large video files on the Laravel application server.
-   AI retrieval must enforce the user's course, enrolment, and document
    permissions.
-   Build and verify the foundation before expanding into later modules.

------------------------------------------------------------------------

## 2. Agreed Technology Architecture

  -----------------------------------------------------------------------
  Layer                   Technology              Responsibility
  ----------------------- ----------------------- -----------------------
  Frontend                React + TypeScript +    User interface and
                          Vite                    client-side application

  Backend                 Laravel 12 / PHP        REST API, business
                                                  logic, authentication,
                                                  authorization

  API                     Versioned REST API      Frontend/backend
                          under `/api/v1`         communication

  Primary database        PostgreSQL              Relational application
                                                  data

  Cache and queues        Redis                   Cache, queue backend,
                                                  and supporting
                                                  transient data

  File storage            S3-compatible storage   Documents, learning
                                                  resources, and other
                                                  uploaded assets

  Web server / reverse    Nginx                   Route requests to
  proxy                                           frontend and backend
                                                  services

  Development             Docker Compose          Reproducible local
  infrastructure                                  development services

  Authentication          Laravel Sanctum         API
  foundation                                      authentication/token or
                                                  session support, as
                                                  appropriate

  Authorization           Laravel Policies and    Server-side permission
                          Gates                   enforcement
  -----------------------------------------------------------------------

### 2.1 Logical project structure

``` text
oni-lms/
├── backend/
│   ├── app/
│   │   └── Http/Controllers/Api/V1/
│   ├── bootstrap/
│   ├── config/
│   ├── database/
│   │   └── migrations/
│   ├── public/
│   ├── routes/
│   ├── tests/
│   ├── Dockerfile
│   └── composer.json
├── frontend/
│   ├── src/
│   ├── Dockerfile
│   ├── index.html
│   └── package.json
├── docker/
│   └── nginx/
│       └── default.conf
├── .env.example
└── docker-compose.yml
```

The actual repository may evolve, but frontend, backend, infrastructure,
and configuration responsibilities should remain clearly separated.

------------------------------------------------------------------------

## 3. Development Standards and Rules

### 3.1 API and backend

-   Keep API routes under `/api/v1`.
-   Enforce authorization on the server using Laravel Policies and
    Gates.
-   Validate incoming data using Laravel Form Requests.
-   Use Laravel API Resources to format API responses.
-   Keep business rules in appropriate application/service/domain layers
    rather than relying on frontend checks.
-   Return consistent validation and error responses.
-   Use database transactions for multi-step operations that must remain
    consistent.
-   Add automated tests with every feature.
-   Enforce tenant/college boundaries if multi-college support is
    introduced; do not assume a tenancy model until it is agreed.

### 3.2 Data and identifiers

-   Use UUIDs for externally exposed records.
-   Use relational constraints and indexes where appropriate.
-   Preserve referential integrity.
-   Define deletion, archival, and retention behavior for academic
    records.
-   Do not encode college-specific student ID, grading, attendance, or
    examination rules until those rules are confirmed.

### 3.3 Security and secrets

-   Never commit `.env`, credentials, API keys, tokens, or production
    secrets.
-   Keep `.env.example` free of real secrets.
-   Do not use hardcoded default administrator passwords.
-   Use secure password hashing and password reset flows.
-   Apply authorization to every sensitive read and write endpoint.
-   Protect student information, grades, enrolment records, and uploaded
    documents.
-   Apply request validation, rate limiting, and audit logging where
    appropriate.
-   Do not rely on frontend route guards as a substitute for backend
    authorization.

### 3.4 Files and media

-   Do not store large video files on the Laravel application server.
-   Use S3-compatible object storage for uploaded files and media where
    appropriate.
-   Validate file type, size, ownership, and access permissions.
-   Restrict access to private course documents and submissions.
-   Use controlled delivery or signed access for private files when
    required.

### 3.5 AI and retrieval

-   AI retrieval must enforce the user's course, enrolment, and document
    permissions.
-   A user must not retrieve content merely because it exists in the
    indexed corpus.
-   Apply authorization before returning retrieved passages or generated
    answers.
-   Keep usage limits, audit logs, and provider credentials server-side.

### 3.6 Quality and release

-   Add automated tests with every feature.
-   Test authorization boundaries, not only successful requests.
-   Verify migrations and seeders on a clean database.
-   Verify frontend production builds.
-   Document setup, configuration, and operational commands.
-   Do not mark a milestone complete until its acceptance criteria are
    met.

------------------------------------------------------------------------

## 4. Starter Project Baseline

The uploaded starter-project README describes the following foundation.
These are documented implementation claims; they must be checked against
the source and runtime before being treated as independently verified.

### 4.1 Documented as included

-   Docker Compose services for frontend, Laravel/PHP-FPM, Nginx,
    PostgreSQL, and Redis.
-   Laravel API health endpoint.
-   PostgreSQL connection configuration.
-   Redis cache/queue configuration.
-   React dashboard starter with API health indicator.
-   Initial users migration.
-   React + TypeScript + Vite frontend.
-   Laravel 12 API foundation.

### 4.2 Documented as not yet implemented in the starter README

-   Login, registration, password reset, and role-based access control.
-   Departments, programmes, semesters, batches, courses, and
    enrolments.
-   Lessons, video delivery, assignments, examinations, and grading.
-   Attendance, certificates, live classes, and analytics.
-   AI assistant and permission-aware document retrieval.
-   WordPress integration and SSO.
-   Production deployment, backups, monitoring, and security hardening.

### 4.3 Later source ZIP audit findings

A later inspection of the uploaded project ZIP reported source evidence
for additional foundations:

-   Authentication endpoints and Laravel Sanctum usage.
-   Five roles, permissions, middleware, and seeders.
-   Academic entities including departments, programmes, sessions,
    semesters, and batches.
-   Course CRUD APIs.
-   Student enrolment and instructor assignment foundations.
-   Initial lesson and progress schema.
-   Frontend dashboard, login modal, academic view, and course view.
-   Feature-test files for health, authentication, academics, and
    courses.

The audit also reported issues requiring verification and correction:

-   A hardcoded fallback administrator password in
    `RoleAndPermissionSeeder.php`.
-   Course enrolment data access and unenrol authorization concerns.
-   Self-enrolment accepting statuses that may be inappropriate for
    student self-service.
-   Docker/Composer installation and dependency packaging issues.
-   Missing or incomplete packaged vendor dependencies.
-   A frontend production build failure attributed to a missing Linux
    Rollup native package in the archived dependencies.
-   Laravel Artisan startup failure attributed to missing Laravel
    Sanctum files in the packaged vendor directory.
-   Backend tests and Docker startup were not verified in that audit
    environment.

**Important:** These findings are an audit baseline, not a claim that
the issues remain unchanged. Re-check the current repository before
modifying it.

------------------------------------------------------------------------


## 4.4 Core Portal Requirements — Student, Teacher, and Administration

Edu Care must provide three role-based portal experiences. They may share one React application and one Laravel API, but each portal must have its own role-aware dashboard, navigation, permitted actions, and data access rules.

After login, users must be directed to the appropriate portal using roles and permissions verified by the backend. Hiding a menu item in React is not a security control: Laravel must authorize every protected operation.

### 4.4.1 Shared portal requirements

- [ ] Responsive layout for desktop, tablet, and mobile.
- [ ] Consistent branding, navigation, layout, and accessibility.
- [ ] Role-aware dashboard and navigation.
- [ ] User profile and account settings.
- [ ] Change password and password recovery.
- [ ] Notifications and announcement centre.
- [ ] Search, filtering, and pagination where appropriate.
- [ ] Clear loading, empty, validation, and error states.
- [ ] Configured institutional timezone for dates and times.
- [ ] Accessible labels, keyboard navigation, and focus states.
- [ ] Session expiry and logout handling.
- [ ] No exposure of another user's private data.
- [ ] Audit important administrative and academic actions.

### 4.4.2 Student Portal

**Purpose:** Give each student a single place to access enrolled courses, learning materials, assignments, examinations, attendance, results, and academic information.

#### Student dashboard

- [ ] Welcome panel with student name and academic context.
- [ ] Student ID, programme, department, semester, batch, and academic session.
- [ ] Enrolled courses summary.
- [ ] Learning progress summary.
- [ ] Upcoming assignment deadlines.
- [ ] Upcoming examination schedule.
- [ ] Recent published grades/results.
- [ ] Attendance summary and shortage warnings where applicable.
- [ ] Recent announcements and notifications.
- [ ] Quick links to active courses and pending work.

#### Student profile and account

- [ ] View personal profile and registration details.
- [ ] Update only profile fields permitted by institutional policy.
- [ ] Submit profile correction requests where direct editing is not allowed.
- [ ] Change password and manage account settings.
- [ ] View account status.

#### Student courses and learning

- [ ] View currently enrolled courses.
- [ ] View course descriptions, instructors, and schedules where available.
- [ ] Open course modules, sections, and lessons.
- [ ] View published PDFs, documents, and learning resources.
- [ ] Access permitted video embeds and external learning links.
- [ ] Record lesson completion and learning progress.
- [ ] Resume incomplete learning activities where supported.
- [ ] Access only content allowed by valid enrolment and permissions.

#### Student assignments

- [ ] View assignments for enrolled courses.
- [ ] View instructions, attachments, open dates, and deadlines.
- [ ] Upload and submit assignment files.
- [ ] View submission receipt, timestamp, and status.
- [ ] View teacher feedback and marks after release.
- [ ] Resubmit only when assignment rules allow it.
- [ ] See late-submission status where applicable.

#### Student examinations and results

- [ ] View published examination timetable and instructions.
- [ ] View examination eligibility.
- [ ] Access online examinations only during authorized availability windows.
- [ ] Save and submit answers according to the examination workflow.
- [ ] Receive submission confirmation.
- [ ] View results only after authorized publication.
- [ ] View marks, grades, and feedback where permitted.
- [ ] Download available mark sheets and academic documents.

#### Student attendance

- [ ] View attendance by course/subject and date.
- [ ] View attendance percentage.
- [ ] View shortage warnings based on approved college policy.
- [ ] View attendance correction requests and their status.
- [ ] Raise a correction request if enabled by the institution.

#### Student certificates and communication

- [ ] View eligible certificates.
- [ ] Download issued certificates and documents.
- [ ] Verify certificate details through the approved process.
- [ ] View college and course announcements.
- [ ] Receive assignment, examination, result, and course notifications.
- [ ] Participate in permitted discussions or teacher communication if enabled.

#### Student access restrictions

- [ ] Students must not access another student's profile, submissions, marks, attendance, or private documents.
- [ ] Students must not create or edit courses, lessons, assignments, examinations, or official results.
- [ ] Students must not alter their own grades, attendance, enrolment status, or examination eligibility.
- [ ] Students must not access unpublished results or restricted course content.
- [ ] Backend access checks must use the authenticated student's identity, enrolment, and permissions.

### 4.4.3 Teacher Portal

**Purpose:** Give each teacher a workspace to manage assigned courses, publish learning content, communicate with students, manage attendance, create assessments, evaluate work, and review student progress.

#### Teacher dashboard

- [ ] Welcome panel and teacher profile summary.
- [ ] Assigned courses summary.
- [ ] Teaching schedule where configured.
- [ ] Upcoming classes and live-class links where enabled.
- [ ] Pending assignment submissions to evaluate.
- [ ] Upcoming assignment and examination dates.
- [ ] Recent student activity and course progress where authorized.
- [ ] Attendance tasks and reminders.
- [ ] Announcements and notifications.
- [ ] Quick links to assigned courses and teaching tasks.

#### Teacher profile and account

- [ ] View teacher profile and staff identifier.
- [ ] View department and assigned academic responsibilities.
- [ ] Update permitted profile fields.
- [ ] Change password and manage account settings.
- [ ] View account status.

#### Teacher course workspace

- [ ] View courses assigned to the authenticated teacher.
- [ ] View course details, enrolled students, and schedules where authorized.
- [ ] Create and organize course modules/sections where permitted.
- [ ] Create, edit, reorder, publish, and archive lessons according to permissions.
- [ ] Upload course documents and learning resources.
- [ ] Add permitted video embeds and external learning links.
- [ ] Control draft and published content states.
- [ ] Review student lesson progress for assigned courses.
- [ ] Restrict access to unassigned courses unless additional permission is granted.

#### Teacher assignments and evaluation

- [ ] Create and edit assignments for assigned courses.
- [ ] Set instructions, attachments, opening dates, and deadlines.
- [ ] Configure allowed file types and submission rules.
- [ ] View submissions from students enrolled in assigned courses.
- [ ] Download authorized submission files.
- [ ] Record marks and feedback.
- [ ] Request or allow resubmission according to policy.
- [ ] Track missing, submitted, late, and evaluated work.
- [ ] Publish feedback and marks according to the release workflow.

#### Teacher examinations and grading

- [ ] Create or manage examinations where authorized.
- [ ] Add or select questions where question-bank permissions allow.
- [ ] Configure examination schedules and instructions within granted permissions.
- [ ] View eligible students for assigned courses.
- [ ] Review descriptive answers where applicable.
- [ ] Enter marks and feedback.
- [ ] Save draft marks and submit them for approval where required.
- [ ] View grading summaries for assigned courses.
- [ ] Do not publish or alter official results unless explicitly authorized.

#### Teacher attendance

- [ ] View assigned classes and course rosters.
- [ ] Record attendance for authorized classes.
- [ ] Edit attendance only within the allowed correction window or approval workflow.
- [ ] Submit attendance for approval where required.
- [ ] View attendance summaries for assigned students.
- [ ] Identify attendance shortages according to approved policy.

#### Teacher student support and communication

- [ ] View permitted student information for assigned courses.
- [ ] Review student learning progress.
- [ ] Send course announcements where authorized.
- [ ] Communicate with students using enabled institutional tools.
- [ ] View notifications and academic reminders.
- [ ] Refer student issues to HOD or administration where supported.

#### Teacher access restrictions

- [ ] Teachers must not access courses or student records outside their assignment unless separately authorized.
- [ ] Teachers must not change student identity, admission, or academic progression records unless granted that permission.
- [ ] Teachers must not alter attendance or marks outside permitted workflows.
- [ ] Teachers must not publish final results if approval belongs to an administrator or examination authority.
- [ ] Backend checks must enforce assigned-course, academic-scope, and permission boundaries.

### 4.4.4 Administration Portal

**Purpose:** Provide authorized administrators and academic leaders with institutional configuration, user administration, academic management, oversight, approvals, and reporting.

The administration portal must show different modules and actions according to the administrator's role and assigned scope.

#### Administration dashboard

- [ ] Institutional overview.
- [ ] Student, teacher, and staff counts where authorized.
- [ ] Department, programme, course, and batch summaries.
- [ ] Current academic session information.
- [ ] Enrolment summaries.
- [ ] Attendance and examination summaries.
- [ ] Pending approvals and administrative tasks.
- [ ] Recent system activity and audit events where permitted.
- [ ] System health indicators for authorized technical administrators.

#### User and access administration

- [ ] Create, update, activate, suspend, and deactivate accounts.
- [ ] Manage student, teacher, and staff profiles according to role.
- [ ] Assign and revoke roles.
- [ ] Manage permissions.
- [ ] Initiate password reset or account recovery workflows.
- [ ] Review user status and relevant account activity.
- [ ] Prevent unauthorized privilege escalation.
- [ ] Maintain an audit trail for access changes.

#### Academic administration

- [ ] Manage departments.
- [ ] Manage programmes.
- [ ] Manage academic sessions.
- [ ] Manage semesters and batches.
- [ ] Manage subjects and course catalogues.
- [ ] Manage admissions and student registration.
- [ ] Manage student ID rules after institutional approval.
- [ ] Assign teachers and academic responsibilities.
- [ ] Manage enrolment and progression workflows.
- [ ] Configure academic calendars and schedules where in scope.

#### Course and learning oversight

- [ ] Review courses and course assignments.
- [ ] Manage course categories and institutional course settings.
- [ ] Review published learning content where authorized.
- [ ] Monitor course enrolments and completion.
- [ ] Manage content permissions and storage policies.
- [ ] Resolve course access and enrolment issues.

#### Assessment, attendance, and result administration

- [ ] Configure approved grading policies.
- [ ] Manage examination schedules and categories.
- [ ] Manage result approval and publication workflows.
- [ ] Review attendance policy settings.
- [ ] Review attendance summaries and correction requests.
- [ ] Manage certificate templates and issuance permissions.
- [ ] Preserve audit history for marks, results, attendance, and certificates.

#### Reports, settings, and audit

- [ ] Generate authorized institutional reports.
- [ ] Export permitted reports to PDF and Excel.
- [ ] Manage announcements and notification settings.
- [ ] Manage integration settings and provider configuration.
- [ ] Review audit logs.
- [ ] Manage backup and operational settings where authorized.
- [ ] Restrict high-risk configuration to designated administrator roles.

#### Initial role boundaries

- **Super Admin:** platform-level configuration, global role/permission management, and technical administration.
- **College Admin:** institutional user, academic, and operational administration within the college scope.
- **Principal:** institutional academic oversight and approval functions granted by policy.
- **HOD:** department-level academic oversight and actions within the assigned department.
- **Teacher:** teaching and assessment functions limited to assigned courses.
- **Student:** self-service learning and academic information limited to the student's own records.
- **Non-teaching Staff:** only the administrative or support modules explicitly granted.

The exact role-permission matrix must be approved and implemented in Laravel. These labels are an initial role model, not a substitute for a detailed permission matrix.

### 4.4.5 Role-based landing pages and navigation

- [ ] Resolve active roles and permissions from the backend after login.
- [ ] Redirect users to the appropriate portal landing page.
- [ ] Support users with multiple roles through explicit context selection if required.
- [ ] Display only authorized navigation items.
- [ ] Re-check permissions on every protected API request.
- [ ] Handle suspended, inactive, or revoked accounts.
- [ ] Handle expired sessions/tokens and return users to login safely.
- [ ] Never trust a role name, user ID, or permission value supplied by the browser.

Suggested route organization (adapt to existing frontend routing conventions):

```text
/login

/student
/student/dashboard
/student/courses
/student/courses/:courseId
/student/assignments
/student/examinations
/student/attendance
/student/results
/student/certificates
/student/notifications
/student/profile

/teacher
/teacher/dashboard
/teacher/courses
/teacher/courses/:courseId
/teacher/lessons
/teacher/assignments
/teacher/submissions
/teacher/examinations
/teacher/attendance
/teacher/students
/teacher/notifications
/teacher/profile

/admin
/admin/dashboard
/admin/users
/admin/roles
/admin/permissions
/admin/departments
/admin/programmes
/admin/sessions
/admin/semesters
/admin/batches
/admin/subjects
/admin/courses
/admin/enrolments
/admin/examinations
/admin/attendance
/admin/results
/admin/certificates
/admin/reports
/admin/settings
/admin/audit-logs
```

These are suggested route names and navigation groups. They do not assert that the routes already exist.

### 4.4.6 Portal security and privacy acceptance criteria

- [ ] Backend authorization is enforced for every protected API endpoint.
- [ ] Students can access only their own private academic records and validly enrolled course content.
- [ ] Teachers can access only assigned courses and permitted student records.
- [ ] HOD access is restricted to the assigned department unless wider permission is granted.
- [ ] Principal and College Admin access follows the approved institutional scope.
- [ ] Super Admin privileges are explicit and auditable.
- [ ] Non-teaching staff receive only explicitly granted access.
- [ ] Guessing another user's URL or record UUID does not grant access.
- [ ] File downloads enforce the same access rules as the records referencing the files.
- [ ] Role changes and account suspension take effect on subsequent protected requests.
- [ ] Automated tests cover permitted and forbidden access for each role.
- [ ] Important changes to users, roles, marks, attendance, enrolments, and results are auditable.

### 4.4.7 Portal-level definition of done

A portal is complete only when:

1. Its dashboard and navigation are implemented.
2. Its core workflows are connected to working backend APIs.
3. Data is scoped to the authenticated user's identity, role, and academic assignments.
4. Loading, empty, validation, and error states are handled.
5. The interface is responsive and usable on supported screen sizes.
6. Protected file access is enforced.
7. Automated tests cover successful and unauthorized access.
8. A role-specific test account can complete intended end-to-end workflows.
9. Documentation describes available modules and permission boundaries.


# 5. Complete Development Milestones

## Milestone 1 --- Foundation Stabilization and Security

**Priority:** Critical

### Requirements

-   [ ] Fix Docker Compose configuration.
-   [ ] Ensure Composer dependencies install cleanly during the backend
    build.
-   [ ] Ensure frontend dependencies install reproducibly from
    lockfiles.
-   [ ] Configure PostgreSQL connection and health checks.
-   [ ] Configure Redis cache and queue connections.
-   [ ] Configure Laravel environment variables correctly.
-   [ ] Create required Laravel storage and cache directories.
-   [ ] Set safe storage and bootstrap cache permissions.
-   [ ] Remove hardcoded administrator credentials and fallback
    passwords.
-   [ ] Require secure initial administrator configuration.
-   [ ] Fix course enrolment and unenrolment authorization.
-   [ ] Protect student records and grades.
-   [ ] Add resource-level authorization.
-   [ ] Validate self-enrolment status transitions.
-   [ ] Fix frontend production build.
-   [ ] Run Laravel migrations and seeders on a clean database.
-   [ ] Run Laravel automated tests.
-   [ ] Run frontend type checking and production build.
-   [ ] Update README and setup documentation.
-   [ ] Remove `vendor/` and `node_modules/` from source archives or Git
    tracking; retain dependency lockfiles.

### Acceptance criteria

-   A fresh clone can build and start using documented Docker commands.
-   Required services become healthy and can communicate.
-   Migrations and seeders run successfully on a clean database.
-   No hardcoded production/default administrator password exists.
-   Sensitive endpoints enforce server-side authorization.
-   Backend tests pass.
-   Frontend type checking and production build pass.
-   Setup documentation matches the actual project.

------------------------------------------------------------------------

## Milestone 2 --- Complete Authentication and RBAC

**Priority:** Critical

### Roles to support

Initial role set:

-   [ ] Super Admin
-   [ ] College Admin
-   [ ] Principal
-   [ ] HOD
-   [ ] Teacher
-   [ ] Student
-   [ ] Non-teaching Staff

The source audit previously identified five roles in the current
implementation. Review and reconcile existing role names before adding
or renaming roles.

### Authentication requirements

-   [ ] Login.
-   [ ] Logout.
-   [ ] Registration, controlled by the agreed administrative policy.
-   [ ] Password reset and recovery.
-   [ ] Email verification.
-   [ ] User profile management.
-   [ ] Change password.
-   [ ] Secure session/token lifecycle.
-   [ ] Login attempt throttling.
-   [ ] Account status handling.
-   [ ] Authentication audit events.
-   [ ] Authentication and authorization tests.

### RBAC requirements

-   [ ] Role management.
-   [ ] Permission management.
-   [ ] Assign and revoke roles.
-   [ ] Assign and revoke permissions where supported.
-   [ ] Define role-to-module permissions.
-   [ ] Define record-level access rules.
-   [ ] Protect API routes with server-side middleware/policies.
-   [ ] Add protected frontend routes.
-   [ ] Add role-aware navigation and dashboards.
-   [ ] Prevent privilege escalation.
-   [ ] Test allowed and denied access for each role.

### Acceptance criteria

Each role can access only its authorized modules and records.
Unauthorized access is denied by the backend even if a user manually
calls an API.

------------------------------------------------------------------------

## Milestone 3 --- Academic Management

**Priority:** High

### Requirements

-   [ ] College and campus configuration, if applicable.
-   [ ] Departments.
-   [ ] Programmes.
-   [ ] Academic sessions.
-   [ ] Semesters.
-   [ ] Batches.
-   [ ] Subjects.
-   [ ] Course allocation.
-   [ ] Student admission and registration.
-   [ ] Student ID generation.
-   [ ] Teacher assignment.
-   [ ] Academic promotion and progression.
-   [ ] Academic management reports.
-   [ ] Academic entity validation and relationship constraints.
-   [ ] Role-based academic administration.
-   [ ] Academic management tests.

### Decisions required before final schema

-   Student ID format and uniqueness scope.
-   Academic session naming and date rules.
-   Programme/semester/batch structure.
-   Whether multiple campuses or colleges are in scope.
-   Student promotion and repeat-year rules.
-   Subject and course ownership rules.

### Acceptance criteria

Authorized administrators can manage the academic structure and assign
students and teachers correctly. Relationships and academic records
remain consistent.

------------------------------------------------------------------------

## Milestone 4 --- Course and Enrolment Management

**Priority:** High

### Requirements

-   [ ] Course creation.
-   [ ] Course editing and archival.
-   [ ] Course categories.
-   [ ] Course descriptions.
-   [ ] Learning objectives.
-   [ ] Instructor assignment.
-   [ ] Student enrolment.
-   [ ] Bulk enrolment.
-   [ ] Enrolment approval, if required.
-   [ ] Course access restrictions.
-   [ ] Course completion status.
-   [ ] Course-level student reports.
-   [ ] Enrolment history.
-   [ ] Safe unenrolment and status transitions.
-   [ ] Course-level authorization tests.

### Acceptance criteria

Students see only courses in which they are validly enrolled. Teachers
see courses assigned to them. Administrators have the access granted by
their role. Enrolment status changes follow approved rules.

------------------------------------------------------------------------

## Milestone 5 --- Learning Content Management

**Priority:** High

### Requirements

-   [ ] Course modules or sections.
-   [ ] Lessons.
-   [ ] Lesson ordering.
-   [ ] PDF and document uploads.
-   [ ] Video embedding and delivery.
-   [ ] YouTube links.
-   [ ] External video links.
-   [ ] Learning resources.
-   [ ] Lesson completion tracking.
-   [ ] Student learning progress.
-   [ ] Course content publishing controls.
-   [ ] Draft/published states.
-   [ ] Permission-controlled content access.
-   [ ] Secure file access.
-   [ ] Content and progress tests.

### Acceptance criteria

Teachers can organize and publish course materials. Enrolled students
can access permitted content and their learning progress is recorded
accurately.

------------------------------------------------------------------------

## Milestone 6 --- Assignments and Submissions

**Priority:** High

### Requirements

-   [ ] Assignment creation and editing.
-   [ ] Assignment instructions.
-   [ ] Assignment attachments.
-   [ ] Open and due dates.
-   [ ] Student submissions.
-   [ ] File attachments in submissions.
-   [ ] Submission history.
-   [ ] Late submission rules.
-   [ ] Resubmission support.
-   [ ] Teacher evaluation.
-   [ ] Marks and feedback.
-   [ ] Submission status tracking.
-   [ ] Notifications for deadlines and feedback.
-   [ ] Assignment authorization and workflow tests.

### Acceptance criteria

Teachers can publish assignments for their courses. Eligible students
can submit work. Teachers can evaluate submissions and provide marks and
feedback. Deadline and late-submission rules are enforced by the
backend.

------------------------------------------------------------------------

## Milestone 7 --- Examination and Grading

**Priority:** High

### Requirements

-   [ ] Examination scheduling.
-   [ ] Examination categories.
-   [ ] Question bank.
-   [ ] Objective questions.
-   [ ] Descriptive questions.
-   [ ] Online examination workflow.
-   [ ] Answer submission.
-   [ ] Examination timing and availability rules.
-   [ ] Marks entry.
-   [ ] Grading configuration.
-   [ ] Result calculation.
-   [ ] Result review and approval.
-   [ ] Result publication.
-   [ ] Mark sheets.
-   [ ] Examination reports.
-   [ ] Examination audit trail.
-   [ ] Examination security and automated tests.

### Decisions required before implementation

-   Grading scale and grade boundaries.
-   Internal/external assessment structure.
-   Pass marks and grace-mark policy.
-   Examination duration and retake rules.
-   Result approval and publication authority.
-   Rules for absent, withheld, and disqualified students.

### Acceptance criteria

Examinations and results are processed according to approved college
policies. Students can access only results they are authorized to view.

------------------------------------------------------------------------

## Milestone 8 --- Attendance Management

**Priority:** High

### Requirements

-   [ ] Subject-wise attendance.
-   [ ] Daily attendance, if required.
-   [ ] Teacher attendance entry.
-   [ ] Student attendance history.
-   [ ] Attendance percentage calculation.
-   [ ] Shortage alerts.
-   [ ] Attendance correction requests.
-   [ ] Correction approval workflow.
-   [ ] Attendance reports.
-   [ ] Attendance audit history.
-   [ ] Attendance authorization and calculation tests.

### Decisions required before implementation

-   Attendance unit: class, subject, day, or session.
-   Minimum attendance percentage.
-   Late/absent/excused status rules.
-   Correction and approval authority.
-   Treatment of holidays and cancelled classes.

### Acceptance criteria

Attendance records and percentages are accurate, changes are auditable,
and only authorized users can record or amend attendance.

------------------------------------------------------------------------

## Milestone 9 --- Certificates and Academic Documents

### Requirements

-   [ ] Certificate templates.
-   [ ] Course completion certificates.
-   [ ] Student academic documents.
-   [ ] Certificate numbering.
-   [ ] PDF generation.
-   [ ] Certificate verification.
-   [ ] Download and print.
-   [ ] Access control and issuance audit trail.

### Acceptance criteria

Authorized staff can issue certificates and documents. Issued
certificates can be verified using a unique reference or verification
mechanism.

------------------------------------------------------------------------

## Milestone 10 --- Communication and Live Classes

### Requirements

-   [ ] Announcements.
-   [ ] Notifications.
-   [ ] Email notifications.
-   [ ] Student-teacher communication.
-   [ ] Discussion forums.
-   [ ] Live class integration.
-   [ ] Class schedules.
-   [ ] Meeting links.
-   [ ] Meeting access control.
-   [ ] Notification preferences.
-   [ ] Communication audit and moderation controls.

### Decisions required

-   Email delivery provider.
-   Live-class/video-conferencing provider.
-   Whether in-app messaging is required.
-   Retention and moderation rules for discussions.

### Acceptance criteria

Users receive relevant announcements and notifications. Live-class links
and communication features are restricted to authorized participants.

------------------------------------------------------------------------

## Milestone 11 --- Analytics and Reporting

### Requirements

-   [ ] Student performance dashboard.
-   [ ] Teacher dashboard.
-   [ ] Course performance.
-   [ ] Attendance analytics.
-   [ ] Examination analytics.
-   [ ] Department reports.
-   [ ] Student progress reports.
-   [ ] Enrolment reports.
-   [ ] Export to PDF.
-   [ ] Export to Excel.
-   [ ] Role-based report access.
-   [ ] Report filters and date ranges.
-   [ ] Performance testing for large reports.

### Acceptance criteria

Dashboards and reports use consistent source data, respect access
permissions, and provide accurate filtered results.

------------------------------------------------------------------------

## Milestone 12 --- AI Assistant

### Requirements

-   [ ] AI-powered student assistant.
-   [ ] Course-specific question answering.
-   [ ] Document retrieval / RAG.
-   [ ] PDF and document indexing.
-   [ ] Permission-aware retrieval.
-   [ ] Teacher assistance.
-   [ ] Administrative assistance.
-   [ ] Usage limits.
-   [ ] Audit logs.
-   [ ] Provider configuration stored securely.
-   [ ] Data privacy and retention controls.
-   [ ] Evaluation of answer quality and retrieval permissions.

### Security requirements

-   Apply course, enrolment, role, and document permissions before
    returning retrieved content.
-   Do not expose content from another course or user's private
    submissions.
-   Do not treat model-generated output as an authorization decision.
-   Log relevant usage and access events without unnecessarily storing
    sensitive content.

### Acceptance criteria

The assistant can answer from permitted sources and cannot retrieve or
disclose documents the requesting user is not authorized to access.

------------------------------------------------------------------------

## Milestone 13 --- WordPress Integration

**Priority:** Later phase

### Requirements

-   [ ] Separate WordPress integration module.
-   [ ] SSO architecture.
-   [ ] Secure API communication.
-   [ ] User synchronization.
-   [ ] Course catalogue integration.
-   [ ] LMS links from `oni_lana`.
-   [ ] Integration error handling and audit logs.
-   [ ] Token/key rotation and revocation.

### Non-negotiable architecture rule

-   Keep the LMS and WordPress databases separate.
-   Do not share database credentials.
-   Integrate through secure APIs and an agreed SSO protocol.
-   WordPress integration must not become a dependency for core LMS
    operation.

### Acceptance criteria

Users can navigate between the WordPress site and LMS through the
approved integration without merging databases or weakening
authorization.

------------------------------------------------------------------------

## Milestone 14 --- Production Deployment

### Requirements

-   [ ] Production Docker configuration.
-   [ ] Nginx configuration.
-   [ ] HTTPS and certificate renewal.
-   [ ] Domain configuration.
-   [ ] Production PostgreSQL.
-   [ ] Redis production configuration.
-   [ ] S3-compatible storage.
-   [ ] Automated database backups.
-   [ ] File-storage backups or recovery strategy.
-   [ ] Monitoring and logging.
-   [ ] Queue workers.
-   [ ] Scheduled task execution.
-   [ ] Secret management.
-   [ ] Security hardening.
-   [ ] Disaster recovery plan.
-   [ ] Deployment and rollback procedure.
-   [ ] Operational documentation.

### Acceptance criteria

The production environment is secure, observable, recoverable, and
deployable through a documented procedure. Backup restoration is tested,
not merely configured.

------------------------------------------------------------------------

## Milestone 15 --- Final QA and Release

### Requirements

-   [ ] Functional testing.
-   [ ] API testing.
-   [ ] Frontend testing.
-   [ ] Security testing.
-   [ ] Permission testing.
-   [ ] Performance testing.
-   [ ] Database integrity testing.
-   [ ] Cross-browser testing.
-   [ ] Mobile responsiveness testing.
-   [ ] Accessibility review.
-   [ ] User acceptance testing.
-   [ ] Production smoke testing.
-   [ ] Release notes.
-   [ ] User and administrator documentation.
-   [ ] Production release approval.

### Acceptance criteria

Critical user journeys pass, access controls are verified,
release-blocking defects are resolved, and the college approves the
release.

------------------------------------------------------------------------

# 6. Recommended Execution Order

    Order Milestone                               Priority
  ------- --------------------------------------- ---------------------
        1 Foundation Stabilization and Security   Critical
        2 Complete Authentication and RBAC        Critical
        3 Academic Management                     High
        4 Course and Enrolment Management         High
        5 Learning Content Management             High
        6 Assignments and Submissions             High
        7 Examination and Grading                 High
        8 Attendance Management                   High
        9 Certificates and Academic Documents     Normal
       10 Communication and Live Classes          Normal
       11 Analytics and Reporting                 Normal
       12 AI Assistant                            Later phase
       13 WordPress Integration                   Later phase
       14 Production Deployment                   Release preparation
       15 Final QA and Release                    Release gate

Milestones may have internal parallel work where dependencies allow, but
security and data-model dependencies must be respected.

------------------------------------------------------------------------

# 7. Immediate Work Plan --- Milestone 1

Use this checklist as the first implementation sprint.

-   [ ] Review the current repository and working tree.
-   [ ] Confirm the current branch and preserve existing user changes.
-   [ ] Review `.gitignore` and ensure secrets/dependency directories
    are excluded.
-   [ ] Review `.env.example` and Docker Compose variable requirements.
-   [ ] Fix backend Dockerfile and Composer installation.
-   [ ] Fix frontend dependency installation from lockfile.
-   [ ] Confirm PostgreSQL and Redis health checks.
-   [ ] Confirm Nginx routing to Laravel and frontend.
-   [ ] Confirm Laravel storage and cache permissions.
-   [ ] Remove hardcoded administrator password.
-   [ ] Correct course enrolment authorization.
-   [ ] Correct unenrol authorization and status transitions.
-   [ ] Protect student records and grades.
-   [ ] Run clean database migrations and seeders.
-   [ ] Run Laravel tests.
-   [ ] Run frontend type checking and production build.
-   [ ] Record commands, outputs, and unresolved failures.
-   [ ] Update project README.

### Local development commands

From the project root:

``` bash
docker compose config
docker compose up --build -d
docker compose logs -f
```

After the environment and dependencies are correctly configured:

``` bash
docker compose exec backend php artisan migrate --seed
docker compose exec backend php artisan test
docker compose exec frontend npm run build
```

Useful commands:

``` bash
docker compose down
docker compose logs -f
docker compose exec backend sh
docker compose exec frontend sh
```

**Warning:** `docker compose down -v` deletes local named volume data,
including the local database volume. Use it only when you intentionally
want to remove that data.

------------------------------------------------------------------------

# 8. College Decisions Required

The following decisions must be confirmed before encoding
college-specific rules into the database or workflows.

  -----------------------------------------------------------------------
  Topic                               Decision required
  ----------------------------------- -----------------------------------
  Student ID                          Format, uniqueness, and generation
                                      rules

  Academic structure                  Departments, programmes, semesters,
                                      batches, and sessions

  Grading                             Marks, grades, pass criteria, and
                                      grade boundaries

  Attendance                          Minimum percentage, attendance
                                      unit, and exception rules

  Examinations                        Internal/external structure,
                                      retakes, grace marks, and approvals

  Student progression                 Promotion, repeat, withdrawal, and
                                      graduation rules

  College scope                       One college or multiple
                                      colleges/campuses

  Live classes                        Preferred provider

  File storage                        S3-compatible provider and storage
                                      budget

  Email                               Email delivery provider

  AI                                  Provider, budget, data policy, and
                                      usage limits

  Deployment                          Hosting provider, domain, expected
                                      user capacity, and budget
  -----------------------------------------------------------------------

Do not invent defaults for these policy decisions. Record the
college-approved answers and update the relevant requirements before
implementation.

------------------------------------------------------------------------

# 9. Definition of Done

A feature or milestone can be marked complete only when all applicable
conditions are met:

1.  Requirements and expected behavior are documented.
2.  Backend implementation is present.
3.  Frontend implementation is present where a user interface is
    required.
4.  Database migrations and constraints are included where needed.
5.  Server-side authorization is implemented and tested.
6.  Input validation and error handling are implemented.
7.  Automated tests cover normal, invalid, and unauthorized cases.
8.  Relevant tests pass in the target development environment.
9.  Documentation and configuration examples are updated.
10. No secrets or production credentials are committed.
11. Manual verification is recorded where automation is insufficient.
12. Known limitations are documented.

A file, route, migration, mockup, or unexecuted test alone is not proof
of a completed feature.

------------------------------------------------------------------------

# 10. Development Reporting Requirements

Every weekly Edu Care report should include:

-   Current milestone and status.
-   Work completed, supported by repository evidence.
-   Work in progress.
-   Blockers and unresolved decisions.
-   Tests actually executed and their results.
-   Deployment status, only if deployment was actually verified.
-   Changes compared with the previous report.
-   Top three next actions.

Reporting rules:

-   Distinguish planned work from implemented work.
-   Distinguish source-code evidence from runtime verification.
-   Never invent commits, issues, tests, deployments, or completed
    features.
-   If no new evidence exists, explicitly report no verified change.
-   Carry forward unresolved blockers until evidence shows they are
    resolved.

------------------------------------------------------------------------

## 11. First Three Next Actions

1.  **Stabilize the project environment:** make a clean Docker build,
    dependency installation, and Laravel startup reproducible.
2.  **Close security gaps:** remove hardcoded credentials and fix
    enrolment, student-record, and grade authorization.
3.  **Establish a passing baseline:** run clean migrations, backend
    tests, frontend type checking, and production build; record the
    results.

------------------------------------------------------------------------

**End of Edu Care requirements and development roadmap.**
