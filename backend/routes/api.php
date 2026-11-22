<?php

use App\Http\Controllers\Api\V1\Academic\AcademicSessionController;
use App\Http\Controllers\Api\V1\Academic\BatchController;
use App\Http\Controllers\Api\V1\Academic\DepartmentController;
use App\Http\Controllers\Api\V1\Academic\ProgrammeController;
use App\Http\Controllers\Api\V1\Academic\SemesterController;
use App\Http\Controllers\Api\V1\AiAssistantController;
use App\Http\Controllers\Api\V1\Analytics\AnalyticsController;
use App\Http\Controllers\Api\V1\Assignment\AssignmentAttachmentController;
use App\Http\Controllers\Api\V1\AuditLogController;
use App\Http\Controllers\Api\V1\BackupController;
use App\Http\Controllers\Api\V1\Assignment\AssignmentController;
use App\Http\Controllers\Api\V1\Assignment\AssignmentSubmissionController;
use App\Http\Controllers\Api\V1\Attendance\AttendanceController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\Certificate\CertificateController;
use App\Http\Controllers\Api\V1\Communication\AnnouncementController;
use App\Http\Controllers\Api\V1\Communication\LiveSessionController;
use App\Http\Controllers\Api\V1\Communication\NotificationController;
use App\Http\Controllers\Api\V1\Course\CourseController;
use App\Http\Controllers\Api\V1\Course\CourseEnrolmentController;
use App\Http\Controllers\Api\V1\DashboardController;
use App\Http\Controllers\Api\V1\ExamController;
use App\Http\Controllers\Api\V1\ExamAttemptController;
use App\Http\Controllers\Api\V1\HealthController;
use App\Http\Controllers\Api\V1\Lesson\CourseSectionController;
use App\Http\Controllers\Api\V1\Lesson\LessonController;
use App\Http\Controllers\Api\V1\Lesson\LessonProgressController;
use App\Http\Controllers\Api\V1\QuestionController;
use App\Http\Controllers\Api\V1\RoleController;
use App\Http\Controllers\Api\V1\UserController;
use App\Http\Controllers\Api\V1\WordPressIntegrationController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function (): void {
    // Health check
    Route::get('/health', HealthController::class);

    // Authentication (public)
    Route::prefix('auth')->group(function (): void {
        Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:10,1');
    });

    // Public Certificate Verification (Epic 9)
    Route::get('/certificates/verify/{code}', [CertificateController::class, 'verify']);

    // Public WordPress Integration (Milestone 13 - oni_lana)
    Route::prefix('integrations/wordpress')->group(function (): void {
        Route::get('/catalogue', [WordPressIntegrationController::class, 'catalogue']);
        Route::post('/sso-handshake', [WordPressIntegrationController::class, 'ssoHandshake']);
    });

    // Authenticated endpoints
    Route::middleware('auth:sanctum')->group(function (): void {
        // User profile & session
        Route::prefix('auth')->group(function (): void {
            Route::get('/me', [AuthController::class, 'me']);
            Route::post('/logout', [AuthController::class, 'logout']);
            Route::post('/change-password', [AuthController::class, 'changePassword']);
            Route::put('/profile', [AuthController::class, 'updateProfile']);
        });

        // Dashboards & Portals (Student, Teacher, Department, Admin)
        Route::get('/dashboard/student', [DashboardController::class, 'student']);
        Route::get('/dashboard/teacher', [DashboardController::class, 'teacher']);
        Route::get('/dashboard/department', [DashboardController::class, 'department']);
        Route::get('/dashboard/admin', [DashboardController::class, 'admin']);

        // Administration, Users & RBAC
        Route::middleware('role:super_admin,college_admin,dept_admin')->group(function (): void {
            Route::get('/roles', [RoleController::class, 'index']);
            Route::apiResource('users', UserController::class);
            Route::post('/users/{user}/reset-password', [UserController::class, 'resetPassword']);
            Route::post('/students/import', [UserController::class, 'importStudents']);
        });

        // Academic Management (Epic 3)
        Route::prefix('academic')->group(function (): void {
            // Read endpoints (accessible to authenticated users)
            Route::get('/departments', [DepartmentController::class, 'index']);
            Route::get('/departments/{department}', [DepartmentController::class, 'show']);
            Route::get('/programmes', [ProgrammeController::class, 'index']);
            Route::get('/programmes/{programme}', [ProgrammeController::class, 'show']);
            Route::get('/sessions', [AcademicSessionController::class, 'index']);
            Route::get('/sessions/{session}', [AcademicSessionController::class, 'show']);
            Route::get('/semesters', [SemesterController::class, 'index']);
            Route::get('/semesters/{semester}', [SemesterController::class, 'show']);
            Route::get('/batches', [BatchController::class, 'index']);
            Route::get('/batches/{batch}', [BatchController::class, 'show']);

            // Mutation endpoints (requires academic.manage permission)
            Route::middleware('permission:academic.manage')->group(function (): void {
                // Departments
                Route::post('/departments', [DepartmentController::class, 'store']);
                Route::put('/departments/{department}', [DepartmentController::class, 'update']);
                Route::delete('/departments/{department}', [DepartmentController::class, 'destroy']);

                // Programmes
                Route::post('/programmes', [ProgrammeController::class, 'store']);
                Route::put('/programmes/{programme}', [ProgrammeController::class, 'update']);
                Route::delete('/programmes/{programme}', [ProgrammeController::class, 'destroy']);

                // Academic Sessions
                Route::post('/sessions', [AcademicSessionController::class, 'store']);
                Route::put('/sessions/{session}', [AcademicSessionController::class, 'update']);
                Route::post('/sessions/{session}/make-current', [AcademicSessionController::class, 'makeCurrent']);
                Route::delete('/sessions/{session}', [AcademicSessionController::class, 'destroy']);

                // Semesters
                Route::post('/semesters', [SemesterController::class, 'store']);
                Route::put('/semesters/{semester}', [SemesterController::class, 'update']);
                Route::post('/semesters/{semester}/toggle-active', [SemesterController::class, 'toggleActive']);
                Route::delete('/semesters/{semester}', [SemesterController::class, 'destroy']);

                // Batches
                Route::post('/batches', [BatchController::class, 'store']);
                Route::put('/batches/{batch}', [BatchController::class, 'update']);
                Route::delete('/batches/{batch}', [BatchController::class, 'destroy']);
            });
        });

        // Course & Enrolment Management (Epic 4)
        Route::prefix('courses')->group(function (): void {
            // Course catalogue & details
            Route::get('/', [CourseController::class, 'index']);
            Route::get('/{course}', [CourseController::class, 'show']);
            Route::get('/{course}/enrolments', [CourseEnrolmentController::class, 'index']);
            Route::get('/{course}/progress', [LessonProgressController::class, 'courseProgress']);

            // Course enrollment
            Route::post('/{course}/enroll', [CourseEnrolmentController::class, 'enroll']);
            Route::delete('/{course}/enrolments/{user}', [CourseEnrolmentController::class, 'unenroll']);

            // Course management
            Route::middleware('permission:courses.create')->post('/', [CourseController::class, 'store']);
            Route::middleware('permission:courses.update')->group(function (): void {
                Route::put('/{course}', [CourseController::class, 'update']);
                Route::post('/{course}/instructors', [CourseController::class, 'assignInstructor']);
                Route::delete('/{course}/instructors/{user}', [CourseController::class, 'removeInstructor']);
            });
            Route::middleware('permission:courses.delete')->delete('/{course}', [CourseController::class, 'destroy']);

            // Course Sections (Modules)
            Route::get('/{course}/sections', [CourseSectionController::class, 'index']);
            Route::post('/{course}/sections', [CourseSectionController::class, 'store']);
            Route::get('/{course}/sections/{section}', [CourseSectionController::class, 'show']);
            Route::put('/{course}/sections/{section}', [CourseSectionController::class, 'update']);
            Route::delete('/{course}/sections/{section}', [CourseSectionController::class, 'destroy']);

            // Course Assignments
            Route::get('/{course}/assignments', [AssignmentController::class, 'index']);
            Route::post('/{course}/assignments', [AssignmentController::class, 'store']);
        });

        // Lessons & Learning Content (Epic 5)
        Route::prefix('sections/{section}/lessons')->group(function (): void {
            Route::get('/', [LessonController::class, 'index']);
            Route::post('/', [LessonController::class, 'store']);
        });

        Route::prefix('lessons/{lesson}')->group(function (): void {
            Route::get('/', [LessonController::class, 'show']);
            Route::put('/', [LessonController::class, 'update']);
            Route::delete('/', [LessonController::class, 'destroy']);
            Route::get('/access', [LessonController::class, 'access']);
            Route::post('/progress', [LessonProgressController::class, 'updateProgress']);
        });

        // Assignments & Submissions (Epic 6)
        Route::prefix('assignments')->group(function (): void {
            Route::get('/', [AssignmentController::class, 'index']);
            Route::get('/{assignment}', [AssignmentController::class, 'show']);
            Route::put('/{assignment}', [AssignmentController::class, 'update']);
            Route::delete('/{assignment}', [AssignmentController::class, 'destroy']);

            Route::get('/{assignment}/submissions', [AssignmentSubmissionController::class, 'index']);
            Route::get('/{assignment}/my-submission', [AssignmentSubmissionController::class, 'mySubmission']);
            Route::post('/{assignment}/attachments', [AssignmentAttachmentController::class, 'store']);
            Route::post('/{assignment}/submit', [AssignmentSubmissionController::class, 'submit']);
        });

        Route::get('/submissions/{submission}/attachment', [AssignmentAttachmentController::class, 'download'])
            ->name('api.v1.submissions.attachment');
        Route::post('/submissions/{submission}/grade', [AssignmentSubmissionController::class, 'grade']);

        // Examinations & Question Bank (Epic 7)
        Route::prefix('courses/{course}/exams')->group(function (): void {
            Route::get('/', [ExamController::class, 'index']);
            Route::post('/', [ExamController::class, 'store']);
        });

        Route::prefix('exams/{exam}')->group(function (): void {
            Route::get('/', [ExamController::class, 'show']);
            Route::put('/', [ExamController::class, 'update']);
            Route::delete('/', [ExamController::class, 'destroy']);
            Route::post('/questions', [ExamController::class, 'attachQuestions']);
            Route::post('/start', [ExamAttemptController::class, 'start']);
        });

        Route::prefix('questions')->group(function (): void {
            Route::get('/', [QuestionController::class, 'index']);
            Route::post('/', [QuestionController::class, 'store']);
            Route::get('/{question}', [QuestionController::class, 'show']);
            Route::put('/{question}', [QuestionController::class, 'update']);
            Route::delete('/{question}', [QuestionController::class, 'destroy']);
        });

        Route::prefix('attempts/{attempt}')->group(function (): void {
            Route::get('/', [ExamAttemptController::class, 'show']);
            Route::post('/save', [ExamAttemptController::class, 'saveProgress']);
            Route::post('/submit', [ExamAttemptController::class, 'submit']);
        });

        // Attendance Management (Epic 8)
        Route::prefix('courses/{course}/attendance')->group(function (): void {
            Route::get('/sessions', [AttendanceController::class, 'index']);
            Route::post('/sessions', [AttendanceController::class, 'store']);
            Route::get('/summary', [AttendanceController::class, 'courseSummary']);
        });

        Route::prefix('attendance/sessions/{session}')->group(function (): void {
            Route::get('/', [AttendanceController::class, 'show']);
            Route::put('/', [AttendanceController::class, 'update']);
            Route::delete('/', [AttendanceController::class, 'destroy']);
            Route::post('/bulk-mark', [AttendanceController::class, 'bulkMark']);
        });

        Route::get('/my-attendance', [AttendanceController::class, 'myAttendance']);

        // Certificate Management (Epic 9)
        Route::get('/certificates', [CertificateController::class, 'index']);
        Route::get('/my-certificates', [CertificateController::class, 'myCertificates']);
        Route::get('/courses/{course}/certificate/eligibility', [CertificateController::class, 'eligibility']);
        Route::post('/courses/{course}/certificate/claim', [CertificateController::class, 'claim']);
        Route::post('/certificates/issue', [CertificateController::class, 'issue']);
        Route::get('/certificates/{certificate}', [CertificateController::class, 'show']);
        Route::put('/certificates/{certificate}', [CertificateController::class, 'update']);
        Route::post('/certificates/{certificate}/revoke', [CertificateController::class, 'revoke']);

        // Communication & Live Classes (Milestone 10)
        Route::prefix('courses/{course}/live-sessions')->group(function (): void {
            Route::get('/', [LiveSessionController::class, 'indexForCourse']);
            Route::post('/', [LiveSessionController::class, 'store']);
        });

        Route::prefix('live-sessions')->group(function (): void {
            Route::get('/upcoming', [LiveSessionController::class, 'upcoming']);
            Route::get('/{session}', [LiveSessionController::class, 'show']);
            Route::post('/{session}/join', [LiveSessionController::class, 'join']);
            Route::post('/{session}/status', [LiveSessionController::class, 'updateStatus']);
            Route::delete('/{session}', [LiveSessionController::class, 'destroy']);
        });

        Route::prefix('announcements')->group(function (): void {
            Route::get('/', [AnnouncementController::class, 'index']);
            Route::post('/', [AnnouncementController::class, 'store']);
            Route::get('/{announcement}', [AnnouncementController::class, 'show']);
            Route::delete('/{announcement}', [AnnouncementController::class, 'destroy']);
        });

        Route::prefix('notifications')->group(function (): void {
            Route::get('/', [NotificationController::class, 'index']);
            Route::post('/{notification}/read', [NotificationController::class, 'markAsRead']);
            Route::post('/mark-all-read', [NotificationController::class, 'markAllAsRead']);
        });

        // Analytics & Reporting (Milestone 11)
        Route::prefix('analytics')->group(function (): void {
            Route::get('/student', [AnalyticsController::class, 'student']);
            Route::get('/teacher', [AnalyticsController::class, 'teacher']);
            Route::get('/courses/{course}', [AnalyticsController::class, 'course']);
            Route::get('/admin', [AnalyticsController::class, 'admin']);
            Route::get('/export/csv', [AnalyticsController::class, 'exportCsv']);
        });

        // AI Learning Assistant (Milestone 12)
        Route::prefix('ai')->group(function (): void {
            Route::get('/conversations', [AiAssistantController::class, 'indexConversations']);
            Route::post('/conversations', [AiAssistantController::class, 'storeConversation']);
            Route::get('/conversations/{conversation}', [AiAssistantController::class, 'showConversation']);
            Route::post('/conversations/{conversation}/messages', [AiAssistantController::class, 'sendMessage']);
            Route::post('/documents/index', [AiAssistantController::class, 'indexDocument']);
            Route::get('/usage', [AiAssistantController::class, 'usageStats']);
        });

        // WordPress Integration (Milestone 13 - oni_lana)
        Route::prefix('integrations/wordpress')->group(function (): void {
            Route::get('/status', [WordPressIntegrationController::class, 'status']);
            Route::post('/sync-notices', [WordPressIntegrationController::class, 'syncNotices']);
            Route::get('/snippets', [WordPressIntegrationController::class, 'snippets']);
        });

        // Security & Audit Logs (Part 12)
        Route::prefix('audit-logs')->group(function (): void {
            Route::get('/', [AuditLogController::class, 'index']);
            Route::get('/stats', [AuditLogController::class, 'stats']);
        });

        // Backup & Disaster Recovery (Part 13)
        Route::prefix('backups')->group(function (): void {
            Route::get('/', [BackupController::class, 'index']);
            Route::post('/', [BackupController::class, 'create']);
            Route::get('/{filename}/download', [BackupController::class, 'download']);
        });
    });
});
