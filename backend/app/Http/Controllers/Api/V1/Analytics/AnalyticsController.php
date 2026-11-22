<?php

namespace App\Http\Controllers\Api\V1\Analytics;

use App\Models\Course;
use App\Models\CourseEnrolment;
use App\Models\Role;
use App\Models\User;
use App\Services\AnalyticsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AnalyticsController
{
    public function student(Request $request, AnalyticsService $service): JsonResponse
    {
        $user = $request->user();

        $targetStudent = $user;
        if ($request->has('student_id') && $user->hasRole([Role::SUPER_ADMIN, Role::COLLEGE_ADMIN, Role::DEPT_ADMIN, Role::TEACHER])) {
            $targetStudent = User::findOrFail($request->input('student_id'));
        }

        $analytics = $service->getStudentAnalytics($targetStudent);

        return response()->json([
            'data' => $analytics,
        ]);
    }

    public function teacher(Request $request, AnalyticsService $service): JsonResponse
    {
        $user = $request->user();
        if (!$user->hasRole([Role::TEACHER, Role::DEPT_ADMIN, Role::COLLEGE_ADMIN, Role::SUPER_ADMIN])) {
            return response()->json(['message' => 'Unauthorized to view teacher analytics.'], 403);
        }

        $taughtCourses = $user->taughtCourses()->with('department')->get();
        if ($taughtCourses->isEmpty() && $user->isSuperAdmin()) {
            $taughtCourses = Course::with('department')->take(5)->get();
        }

        $courseSummaries = [];
        $totalStudents = 0;
        $totalAtRisk = 0;

        foreach ($taughtCourses as $course) {
            $courseData = $service->getCourseAnalytics($course);
            $totalStudents += $courseData['metrics']['total_enrolled'];
            $totalAtRisk += $courseData['metrics']['at_risk_count'];

            $courseSummaries[] = [
                'id' => $course->id,
                'code' => $course->code,
                'title' => $course->title,
                'department' => $course->department?->code,
                'enrolled_count' => $courseData['metrics']['total_enrolled'],
                'average_attendance' => $courseData['metrics']['average_attendance'],
                'average_progress' => $courseData['metrics']['average_progress'],
                'average_exam_score' => $courseData['metrics']['average_exam_score'],
                'at_risk_count' => $courseData['metrics']['at_risk_count'],
            ];
        }

        return response()->json([
            'data' => [
                'teacher_name' => $user->name,
                'overview' => [
                    'active_courses_count' => $taughtCourses->count(),
                    'total_students_taught' => $totalStudents,
                    'total_at_risk_students' => $totalAtRisk,
                ],
                'courses' => $courseSummaries,
            ],
        ]);
    }

    public function course(Course $course, Request $request, AnalyticsService $service): JsonResponse
    {
        $user = $request->user();
        if (!$user->hasRole([Role::SUPER_ADMIN, Role::COLLEGE_ADMIN, Role::DEPT_ADMIN]) && !$course->isTaughtBy($user)) {
            return response()->json(['message' => 'Unauthorized to inspect this course analytics.'], 403);
        }

        $analytics = $service->getCourseAnalytics($course);

        return response()->json([
            'data' => $analytics,
        ]);
    }

    public function admin(Request $request, AnalyticsService $service): JsonResponse
    {
        $user = $request->user();
        if (!$user->hasRole([Role::SUPER_ADMIN, Role::COLLEGE_ADMIN, Role::DEPT_ADMIN])) {
            return response()->json(['message' => 'Unauthorized to view administrative institutional analytics.'], 403);
        }

        $overview = $service->getAdminOverview();

        return response()->json([
            'data' => $overview,
        ]);
    }

    public function exportCsv(Request $request, AnalyticsService $service): StreamedResponse
    {
        $user = $request->user();
        if (!$user->hasRole([Role::SUPER_ADMIN, Role::COLLEGE_ADMIN, Role::DEPT_ADMIN, Role::TEACHER])) {
            abort(403, 'Unauthorized to export academic reports.');
        }

        $type = $request->input('type', 'course_roster');
        $courseId = $request->input('course_id');
        $course = Course::findOrFail($courseId);

        $analytics = $service->getCourseAnalytics($course);
        $roster = $analytics['roster'];

        $filename = "{$course->code}_Analytics_Report_" . date('Y-m-d') . ".csv";

        return response()->streamDownload(function () use ($roster, $course) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['Student ID', 'Student Name', 'Email', 'Syllabus Progress (%)', 'Attendance (%)', 'Exam Score (%)', 'Status']);

            foreach ($roster as $row) {
                $status = ($row['attendance_percentage'] < 75) ? 'At Risk (Attendance)' : 'Good Standing';
                fputcsv($handle, [
                    $row['student_id'],
                    $row['name'],
                    $row['email'],
                    $row['progress_percentage'] . '%',
                    $row['attendance_percentage'] . '%',
                    $row['exam_score'] !== null ? $row['exam_score'] . '%' : 'N/A',
                    $status,
                ]);
            }
            fclose($handle);
        }, $filename, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }
}
