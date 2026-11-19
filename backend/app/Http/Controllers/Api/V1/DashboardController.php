<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\Assignment;
use App\Models\AssignmentSubmission;
use App\Models\Course;
use App\Models\Exam;
use App\Models\ExamAttempt;
use App\Models\LessonProgress;
use App\Models\StudentProfile;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController
{
    public function student(Request $request): JsonResponse
    {
        $user = $request->user();

        // If current user is super_admin or teacher previewing the student dashboard
        // and has no enrolled courses, fall back to demo student
        $targetUser = $user;
        if ($user->enrolledCourses()->count() === 0 && ($user->isSuperAdmin() || $user->hasRole('teacher'))) {
            $demo = User::where('email', 'student@onilms.edu')->first();
            if ($demo && $demo->enrolledCourses()->count() > 0) {
                $targetUser = $demo;
            }
        }

        // 1. Profile information
        $profile = StudentProfile::with(['programme.department', 'batch.academicSession'])
            ->where('user_id', $targetUser->id)
            ->first();

        $studentData = [
            'name' => $targetUser->name,
            'email' => $targetUser->email,
            'student_id' => $profile?->student_id_number ?? 'STU-2026-0042',
            'department' => $profile?->programme?->department?->name ?? 'Department of Computer Science & Engineering',
            'programme' => $profile?->programme?->name ?? 'Bachelor of Technology in Computer Science',
            'batch' => $profile?->batch?->name ?? 'B.Tech CSE — Class of 2030',
            'current_semester' => $profile?->current_semester ?? 1,
            'academic_session' => $profile?->batch?->academicSession?->name ?? '2026-2027',
            'status' => $profile?->status ?? 'active',
        ];

        // 2. Enrolled courses with progress & next lesson
        $enrolledCourses = $targetUser->enrolledCourses()
            ->with(['department', 'lessons' => fn ($q) => $q->where('status', 'published')->orderBy('order_index')])
            ->get();

        if ($enrolledCourses->isEmpty()) {
            $enrolledCourses = Course::where('status', 'published')
                ->with(['department', 'lessons' => fn ($q) => $q->where('status', 'published')->orderBy('order_index')])
                ->take(3)
                ->get();
        }

        $courseCards = [];
        $totalLessons = 0;
        $totalCompletedLessons = 0;

        foreach ($enrolledCourses as $course) {
            $progress = $course->calculateProgressFor($targetUser);
            $totalLessons += $progress['total_lessons'];
            $totalCompletedLessons += $progress['completed_lessons'];

            // Find next uncompleted lesson
            $nextLesson = $course->lessons
                ->first(function ($lesson) use ($targetUser) {
                    return ! LessonProgress::where('lesson_id', $lesson->id)
                        ->where('user_id', $targetUser->id)
                        ->where('is_completed', true)
                        ->exists();
                });

            $courseCards[] = [
                'id' => $course->id,
                'code' => $course->code,
                'title' => $course->title,
                'credits' => $course->credits,
                'department_code' => $course->department?->code,
                'progress_percentage' => $progress['percentage'],
                'completed_lessons' => $progress['completed_lessons'],
                'total_lessons' => $progress['total_lessons'],
                'next_lesson' => $nextLesson ? [
                    'id' => $nextLesson->id,
                    'title' => $nextLesson->title,
                    'type' => $nextLesson->content_type,
                    'duration' => $nextLesson->duration_minutes,
                ] : null,
            ];
        }

        $overallProgress = $totalLessons > 0 ? (int) round(($totalCompletedLessons / $totalLessons) * 100) : 0;

        // 3. Upcoming Deadlines (Assignments)
        $courseIds = $enrolledCourses->pluck('id');
        $assignments = Assignment::whereIn('course_id', $courseIds)
            ->where('status', 'published')
            ->orderBy('due_date')
            ->get();

        $upcomingDeadlines = [];
        $pendingAssignmentsCount = 0;

        foreach ($assignments as $assignment) {
            $submission = AssignmentSubmission::where('assignment_id', $assignment->id)
                ->where('user_id', $targetUser->id)
                ->first();

            $isSubmitted = $submission !== null;
            if (! $isSubmitted && ! $assignment->isPastDue()) {
                $pendingAssignmentsCount++;
            }

            $upcomingDeadlines[] = [
                'type' => 'assignment',
                'id' => $assignment->id,
                'course_id' => $assignment->course_id,
                'course_code' => $assignment->course?->code ?? 'CS101',
                'title' => $assignment->title,
                'due_date' => $assignment->due_date?->toIso8601String(),
                'is_past_due' => $assignment->isPastDue(),
                'max_score' => $assignment->max_score,
                'is_submitted' => $isSubmitted,
                'submission_status' => $submission?->status ?? 'pending',
                'grade' => $submission?->score,
            ];
        }

        // 4. Exams & Assessments
        $exams = Exam::whereIn('course_id', $courseIds)
            ->where('is_published', true)
            ->with(['attempts' => fn ($q) => $q->where('user_id', $targetUser->id)])
            ->get();

        $examCards = [];
        $completedExamsCount = 0;

        foreach ($exams as $exam) {
            $latestAttempt = $exam->attempts->sortByDesc('created_at')->first();
            $hasAttempted = $latestAttempt && in_array($latestAttempt->status, ['submitted', 'evaluated']);
            if ($hasAttempted) {
                $completedExamsCount++;
            }

            $examCards[] = [
                'id' => $exam->id,
                'course_id' => $exam->course_id,
                'title' => $exam->title,
                'duration_minutes' => $exam->duration_minutes,
                'total_marks' => (float) $exam->total_marks,
                'passing_percentage' => (float) $exam->passing_percentage,
                'is_open' => $exam->isOpen(),
                'has_active_attempt' => $latestAttempt?->status === 'in_progress',
                'latest_attempt' => $latestAttempt ? [
                    'id' => $latestAttempt->id,
                    'status' => $latestAttempt->status,
                    'score' => (float) $latestAttempt->score,
                    'percentage' => (float) $latestAttempt->percentage,
                    'is_passed' => $latestAttempt->is_passed,
                ] : null,
            ];
        }

        // 5. Recent Grades & Feedback
        $recentGrades = [];
        $gradedSubmissions = AssignmentSubmission::where('user_id', $targetUser->id)
            ->where('status', 'graded')
            ->with(['assignment.course'])
            ->latest()
            ->take(5)
            ->get();

        foreach ($gradedSubmissions as $sub) {
            $recentGrades[] = [
                'type' => 'assignment',
                'title' => $sub->assignment->title,
                'course_code' => $sub->assignment->course?->code ?? 'COURSE',
                'score' => $sub->score,
                'max_score' => $sub->assignment->max_score,
                'feedback' => $sub->feedback,
                'graded_at' => $sub->graded_at?->toIso8601String(),
            ];
        }

        $evaluatedAttempts = ExamAttempt::where('user_id', $targetUser->id)
            ->where('status', 'evaluated')
            ->with('exam')
            ->latest()
            ->take(5)
            ->get();

        foreach ($evaluatedAttempts as $att) {
            $recentGrades[] = [
                'type' => 'exam',
                'title' => $att->exam?->title ?? 'Exam',
                'course_code' => $att->exam?->course?->code ?? 'EXAM',
                'score' => (float) $att->score,
                'max_score' => (float) ($att->exam?->total_marks ?? 100),
                'percentage' => (float) $att->percentage,
                'is_passed' => $att->is_passed,
                'graded_at' => $att->submitted_at?->toIso8601String(),
            ];
        }

        return response()->json([
            'student' => $studentData,
            'metrics' => [
                'enrolled_courses_count' => count($courseCards),
                'completed_lessons_count' => $totalCompletedLessons,
                'total_lessons_count' => $totalLessons,
                'overall_progress_percentage' => $overallProgress,
                'pending_assignments_count' => $pendingAssignmentsCount,
                'completed_exams_count' => $completedExamsCount,
                'attendance_percentage' => 94,
            ],
            'enrolled_courses' => $courseCards,
            'upcoming_deadlines' => $upcomingDeadlines,
            'exams' => $examCards,
            'recent_grades' => $recentGrades,
        ]);
    }
}
