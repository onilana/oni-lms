<?php

use App\Http\Controllers\Api\V1\Academic\AcademicSessionController;
use App\Http\Controllers\Api\V1\Academic\BatchController;
use App\Http\Controllers\Api\V1\Academic\DepartmentController;
use App\Http\Controllers\Api\V1\Academic\ProgrammeController;
use App\Http\Controllers\Api\V1\Academic\SemesterController;
use App\Http\Controllers\Api\V1\Assignment\AssignmentController;
use App\Http\Controllers\Api\V1\Assignment\AssignmentSubmissionController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\Course\CourseController;
use App\Http\Controllers\Api\V1\Course\CourseEnrolmentController;
use App\Http\Controllers\Api\V1\ExamController;
use App\Http\Controllers\Api\V1\ExamAttemptController;
use App\Http\Controllers\Api\V1\HealthController;
use App\Http\Controllers\Api\V1\Lesson\CourseSectionController;
use App\Http\Controllers\Api\V1\Lesson\LessonController;
use App\Http\Controllers\Api\V1\Lesson\LessonProgressController;
use App\Http\Controllers\Api\V1\QuestionController;
use App\Http\Controllers\Api\V1\RoleController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function (): void {
    // Health check
    Route::get('/health', HealthController::class);

    // Authentication (public)
    Route::prefix('auth')->group(function (): void {
        Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:10,1');
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

        // Administration & RBAC lookup
        Route::middleware('role:super_admin,college_admin')->group(function (): void {
            Route::get('/roles', [RoleController::class, 'index']);
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
            Route::post('/{assignment}/submit', [AssignmentSubmissionController::class, 'submit']);
        });

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
    });
});
