# ONI LMS Architecture Notes

## System boundaries

The LMS is a standalone application. The public college website (`oni_lana`, WordPress) remains a separate system with its own database. Initial integration is via navigation links. Public content APIs and OIDC single sign-on are later milestones.

## Backend conventions

- REST API prefix: `/api/v1`
- UUID primary keys for externally exposed entities
- Laravel Policies/Gates for authorization
- Form Requests for validation
- API Resources for response serialization
- Queue long-running work (notifications, document processing, media tasks)
- Never trust client-side role or exam timer state

## Planned bounded modules

1. Identity and access
2. Academic structure
3. Courses and enrolment
4. Learning content and progress
5. Assignments
6. Examinations and question bank
7. Attendance
8. Certificates
9. Live classroom
10. Analytics
11. AI learning assistant
12. WordPress integration
13. Security, privacy and audit
14. Deployment and operations

## Security notes

- Exam attempts need server-authoritative timers, autosave, persisted attempt snapshots, idempotent submission and server-side grading.
- Never expose answer keys to student clients.
- File access must check course enrolment and resource permissions.
- AI retrieval must enforce the same authorization boundary as the underlying course documents.
- Store secrets outside source control.
