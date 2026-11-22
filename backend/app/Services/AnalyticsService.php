<?php

namespace App\Services;

use App\Models\Assignment;
use App\Models\AssignmentSubmission;
use App\Models\AttendanceRecord;
use App\Models\AttendanceSession;
use App\Models\Certificate;
use App\Models\Course;
use App\Models\CourseEnrolment;
use App\Models\Department;
use App\Models\Exam;
use App\Models\ExamAttempt;
use App\Models\Lesson;
use App\Models\LessonProgress;
use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class AnalyticsService
{
    public function getStudentAnalytics(User $student): array
    {
        $enrolments = CourseEnrolment::with(['course.department'])
            ->where('user_id', $student->id)
            ->where('status', 'active')
            ->get();

        $courseAnalytics = [];
        $totalLessons = 0;
        $totalCompletedLessons = 0;
        $allAttendancePercentages = [];
        $allExamPercentages = [];

        foreach ($enrolments as $enrolment) {
            $course = $enrolment->course;
            if (!$course) continue;

            $progress = $course->calculateProgressFor($student);
            $totalLessons += $progress['total_lessons'];
            $totalCompletedLessons += $progress['completed_lessons'];

            $attendance = $course->calculateAttendanceFor($student);
            $allAttendancePercentages[] = $attendance['percentage'];

            // Exams for course
            $examAttempts = ExamAttempt::where('user_id', $student->id)
                ->whereHas('exam', fn ($q) => $q->where('course_id', $course->id))
                ->where('status', 'graded')
                ->get();

            $examAvg = $examAttempts->isNotEmpty() ? round($examAttempts->avg('percentage'), 1) : null;
            if ($examAvg !== null) {
                $allExamPercentages[] = $examAvg;
            }

            // Assignments for course
            $submissions = AssignmentSubmission::where('student_user_id', $student->id)
                ->whereHas('assignment', fn ($q) => $q->where('course_id', $course->id))
                ->whereNotNull('score')
                ->get();

            $assignmentAvg = $submissions->isNotEmpty() ? round($submissions->avg('percentage'), 1) : null;

            // Certificate status
            $hasCertificate = Certificate::where('course_id', $course->id)
                ->where('user_id', $student->id)
                ->valid()
                ->exists();

            $courseAnalytics[] = [
                'course_id' => $course->id,
                'course_code' => $course->code,
                'course_title' => $course->title,
                'credits' => $course->credits,
                'department' => $course->department?->name,
                'progress_percentage' => $progress['percentage'],
                'completed_lessons' => $progress['completed_lessons'],
                'total_lessons' => $progress['total_lessons'],
                'attendance_percentage' => $attendance['percentage'],
                'has_attendance_shortage' => $attendance['has_shortage'],
                'exam_average' => $examAvg,
                'assignment_average' => $assignmentAvg,
                'has_certificate' => $hasCertificate,
            ];
        }

        $overallProgress = $totalLessons > 0 ? (int) round(($totalCompletedLessons / $totalLessons) * 100) : 0;
        $overallAttendance = count($allAttendancePercentages) > 0 ? (int) round(array_sum($allAttendancePercentages) / count($allAttendancePercentages)) : 100;
        $overallExamAvg = count($allExamPercentages) > 0 ? round(array_sum($allExamPercentages) / count($allExamPercentages), 1) : null;

        // Recent 5 Exam attempts score trajectory
        $recentExams = ExamAttempt::with(['exam.course'])
            ->where('user_id', $student->id)
            ->where('status', 'graded')
            ->orderBy('submitted_at', 'desc')
            ->take(6)
            ->get()
            ->map(fn ($att) => [
                'exam_title' => $att->exam?->title ?? 'Exam',
                'course_code' => $att->exam?->course?->code ?? 'N/A',
                'score' => (float) $att->score,
                'percentage' => (float) $att->percentage,
                'is_passed' => (bool) $att->is_passed,
                'date' => $att->submitted_at?->toDateString(),
            ]);

        return [
            'student_name' => $student->name,
            'student_email' => $student->email,
            'summary' => [
                'enrolled_courses_count' => $enrolments->count(),
                'overall_progress_percentage' => $overallProgress,
                'overall_attendance_percentage' => $overallAttendance,
                'has_attendance_shortage' => $overallAttendance < 75,
                'overall_exam_average' => $overallExamAvg,
                'certificates_earned_count' => Certificate::where('user_id', $student->id)->valid()->count(),
            ],
            'courses' => $courseAnalytics,
            'recent_exam_scores' => $recentExams,
        ];
    }

    public function getCourseAnalytics(Course $course): array
    {
        $enrolledStudents = $course->enrolledStudents()
            ->wherePivot('status', 'active')
            ->get();

        $studentCount = $enrolledStudents->count();

        // 1. Progress analytics
        $totalLessons = $course->lessons()->where('status', 'published')->count();
        $studentProgressList = [];
        $atRiskStudents = [];

        // 2. Grade distribution buckets
        $gradeBuckets = [
            'A (90-100%)' => 0,
            'B (75-89%)' => 0,
            'C (60-74%)' => 0,
            'D (50-59%)' => 0,
            'F (<50%)' => 0,
        ];

        foreach ($enrolledStudents as $student) {
            $progress = $course->calculateProgressFor($student);
            $attendance = $course->calculateAttendanceFor($student);

            // Best exam attempt
            $bestExamAttempt = ExamAttempt::where('user_id', $student->id)
                ->whereHas('exam', fn ($q) => $q->where('course_id', $course->id))
                ->where('status', 'graded')
                ->orderBy('percentage', 'desc')
                ->first();

            $examPct = $bestExamAttempt ? (float) $bestExamAttempt->percentage : null;

            if ($examPct !== null) {
                if ($examPct >= 90) $gradeBuckets['A (90-100%)']++;
                elseif ($examPct >= 75) $gradeBuckets['B (75-89%)']++;
                elseif ($examPct >= 60) $gradeBuckets['C (60-74%)']++;
                elseif ($examPct >= 50) $gradeBuckets['D (50-59%)']++;
                else $gradeBuckets['F (<50%)']++;
            }

            $isAtRisk = $attendance['has_shortage'] || ($examPct !== null && $examPct < 50);

            if ($isAtRisk) {
                $atRiskStudents[] = [
                    'student_id' => $student->id,
                    'student_name' => $student->name,
                    'student_email' => $student->email,
                    'attendance_percentage' => $attendance['percentage'],
                    'has_shortage' => $attendance['has_shortage'],
                    'exam_percentage' => $examPct,
                    'progress_percentage' => $progress['percentage'],
                    'reason' => $attendance['has_shortage'] ? 'Attendance below 75% quota' : 'Failing exam score (<50%)',
                ];
            }

            $studentProgressList[] = [
                'student_id' => $student->id,
                'name' => $student->name,
                'email' => $student->email,
                'progress_percentage' => $progress['percentage'],
                'attendance_percentage' => $attendance['percentage'],
                'exam_score' => $examPct,
            ];
        }

        // Attendance summary
        $avgAttendance = $studentCount > 0 ? (int) round(collect($studentProgressList)->avg('attendance_percentage')) : 100;
        $avgProgress = $studentCount > 0 ? (int) round(collect($studentProgressList)->avg('progress_percentage')) : 0;
        $avgExamScore = collect($studentProgressList)->filter(fn ($s) => $s['exam_score'] !== null)->avg('exam_score');

        // Lesson drop-off / completion rate per lesson
        $lessonsEngagement = $course->lessons()->where('status', 'published')
            ->orderBy('order_index')
            ->get()
            ->map(function ($lesson) use ($studentCount) {
                $completedCount = LessonProgress::where('lesson_id', $lesson->id)
                    ->where('is_completed', true)
                    ->count();
                $pct = $studentCount > 0 ? (int) round(($completedCount / $studentCount) * 100) : 0;
                return [
                    'id' => $lesson->id,
                    'title' => $lesson->title,
                    'completed_count' => $completedCount,
                    'completion_percentage' => $pct,
                ];
            });

        return [
            'course' => [
                'id' => $course->id,
                'code' => $course->code,
                'title' => $course->title,
                'credits' => $course->credits,
            ],
            'metrics' => [
                'total_enrolled' => $studentCount,
                'average_attendance' => $avgAttendance,
                'average_progress' => $avgProgress,
                'average_exam_score' => $avgExamScore !== null ? round($avgExamScore, 1) : null,
                'at_risk_count' => count($atRiskStudents),
            ],
            'grade_distribution' => $gradeBuckets,
            'at_risk_students' => $atRiskStudents,
            'lesson_engagement' => $lessonsEngagement,
            'roster' => $studentProgressList,
        ];
    }

    public function getAdminOverview(): array
    {
        $totalStudents = User::whereHas('roles', fn ($q) => $q->where('name', Role::STUDENT))->count();
        $totalTeachers = User::whereHas('roles', fn ($q) => $q->where('name', Role::TEACHER))->count();
        $totalCourses = Course::where('status', 'published')->count();
        $totalDepartments = Department::where('is_active', true)->count();
        $totalCertificates = Certificate::valid()->count();

        // Department Breakdown
        $departments = Department::withCount('courses')
            ->where('is_active', true)
            ->get()
            ->map(function ($dept) {
                $enrolmentsCount = CourseEnrolment::whereHas('course', fn ($q) => $q->where('department_id', $dept->id))
                    ->where('status', 'active')
                    ->count();

                return [
                    'id' => $dept->id,
                    'code' => $dept->code,
                    'name' => $dept->name,
                    'courses_count' => $dept->courses_count,
                    'active_enrolments' => $enrolmentsCount,
                ];
            });

        // Exam evaluation statistics
        $examAttempts = ExamAttempt::where('status', 'graded')->get();
        $totalExamsTaken = $examAttempts->count();
        $passCount = $examAttempts->where('is_passed', true)->count();
        $collegePassRate = $totalExamsTaken > 0 ? (int) round(($passCount / $totalExamsTaken) * 100) : 0;
        $collegeExamAvg = $totalExamsTaken > 0 ? round($examAttempts->avg('percentage'), 1) : null;

        // Overall College Attendance compliance
        $attendanceSessions = AttendanceSession::where('status', 'completed')->count();
        $attendanceRecords = AttendanceRecord::all();
        $presentCount = $attendanceRecords->whereIn('status', ['present', 'late'])->count();
        $totalRecords = $attendanceRecords->count();
        $collegeAttendanceAvg = $totalRecords > 0 ? (int) round(($presentCount / $totalRecords) * 100) : 100;

        return [
            'overview' => [
                'total_students' => $totalStudents,
                'total_teachers' => $totalTeachers,
                'total_courses' => $totalCourses,
                'total_departments' => $totalDepartments,
                'total_certificates_issued' => $totalCertificates,
                'college_attendance_rate' => $collegeAttendanceAvg,
                'college_exam_pass_rate' => $collegePassRate,
                'college_exam_average' => $collegeExamAvg,
            ],
            'departments' => $departments,
        ];
    }
}
