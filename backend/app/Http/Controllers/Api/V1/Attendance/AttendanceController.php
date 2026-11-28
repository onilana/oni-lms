<?php

namespace App\Http\Controllers\Api\V1\Attendance;

use App\Http\Requests\Attendance\AttendanceSessionRequest;
use App\Http\Requests\Attendance\BulkMarkAttendanceRequest;
use App\Http\Resources\Attendance\AttendanceSessionResource;
use App\Models\AttendanceRecord;
use App\Models\AttendanceSession;
use App\Models\Course;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class AttendanceController
{
    private function canAccessCourseAttendance(?User $user, Course $course): bool
    {
        if (! $user) {
            return false;
        }

        if ($user->isInstitutionAdmin()) {
            return true;
        }

        if ($user->hasRole([Role::HOD, Role::DEPT_ADMIN])) {
            return $course->department_id === $user->getAssignedDepartmentId();
        }

        if ($user->hasRole(Role::TEACHER)) {
            return $course->isTaughtBy($user);
        }

        return $user->hasPermission('attendance.mark') && ! $user->hasRole(Role::STUDENT);
    }

    public function index(Request $request, Course $course): AnonymousResourceCollection
    {
        if (! $this->canAccessCourseAttendance($request->user(), $course)) {
            abort(403, 'Unauthorized access to course attendance.');
        }

        $sessions = $course->attendanceSessions()
            ->with(['records.student'])
            ->latest('session_date')
            ->get();

        return AttendanceSessionResource::collection($sessions);
    }

    public function show(Request $request, AttendanceSession $session): AttendanceSessionResource
    {
        if (! $this->canAccessCourseAttendance($request->user(), $session->course)) {
            abort(403, 'Unauthorized access to attendance session.');
        }

        $session->load(['records.student', 'instructor']);
        return new AttendanceSessionResource($session);
    }

    public function store(AttendanceSessionRequest $request, Course $course): JsonResponse
    {
        $user = $request->user();
        $data = $request->validated();
        $data['course_id'] = $course->id;
        $data['instructor_id'] = $user->id;

        $session = AttendanceSession::create($data);

        // Auto-populate roster from active course enrolments
        $enrolledStudents = $course->enrolledStudents()
            ->wherePivot('status', 'enrolled')
            ->get();

        foreach ($enrolledStudents as $student) {
            AttendanceRecord::firstOrCreate(
                [
                    'attendance_session_id' => $session->id,
                    'student_user_id' => $student->id,
                ],
                [
                    'status' => 'present',
                    'marked_by_id' => $user->id,
                ]
            );
        }

        return response()->json([
            'message' => 'Attendance session created with student roster',
            'data' => new AttendanceSessionResource($session->fresh(['records.student'])),
        ], 201);
    }

    public function update(AttendanceSessionRequest $request, AttendanceSession $session): JsonResponse
    {
        $session->update($request->validated());

        return response()->json([
            'message' => 'Attendance session updated',
            'data' => new AttendanceSessionResource($session),
        ]);
    }

    public function destroy(Request $request, AttendanceSession $session): JsonResponse
    {
        if (! $this->canAccessCourseAttendance($request->user(), $session->course)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $session->delete();

        return response()->json([
            'message' => 'Attendance session deleted',
        ]);
    }

    public function bulkMark(BulkMarkAttendanceRequest $request, AttendanceSession $session): JsonResponse
    {
        $user = $request->user();
        $records = $request->validated('records');

        foreach ($records as $item) {
            AttendanceRecord::updateOrCreate(
                [
                    'attendance_session_id' => $session->id,
                    'student_user_id' => $item['student_user_id'],
                ],
                [
                    'status' => $item['status'],
                    'remarks' => $item['remarks'] ?? null,
                    'marked_by_id' => $user->id,
                ]
            );
        }

        $session->update(['status' => 'completed']);

        return response()->json([
            'message' => 'Attendance roster saved successfully',
            'data' => new AttendanceSessionResource($session->fresh(['records.student'])),
        ]);
    }

    public function courseSummary(Request $request, Course $course): JsonResponse
    {
        if (! $this->canAccessCourseAttendance($request->user(), $course)) {
            abort(403, 'Unauthorized access to course attendance summary.');
        }

        $students = $course->enrolledStudents()
            ->wherePivot('status', 'enrolled')
            ->get();

        $summary = [];
        foreach ($students as $student) {
            $att = $course->calculateAttendanceFor($student);
            $summary[] = [
                'student_id' => $student->id,
                'name' => $student->name,
                'email' => $student->email,
                'metrics' => $att,
            ];
        }

        return response()->json([
            'course' => [
                'id' => $course->id,
                'code' => $course->code,
                'title' => $course->title,
                'total_sessions' => $course->attendanceSessions()->where('status', 'completed')->count(),
            ],
            'students' => $summary,
        ]);
    }

    public function myAttendance(Request $request): JsonResponse
    {
        $user = $request->user();
        $courses = $user->enrolledCourses()->with('department')->get();

        $courseSummaries = [];
        $totalAttended = 0;
        $totalConducted = 0;

        foreach ($courses as $course) {
            $att = $course->calculateAttendanceFor($user);
            $totalAttended += ($att['present'] + $att['late']);
            $totalConducted += max(1, $att['total_sessions'] - $att['excused']);

            $recentSessions = $course->attendanceSessions()
                ->where('status', 'completed')
                ->latest('session_date')
                ->take(5)
                ->get()
                ->map(function ($sess) use ($user) {
                    $rec = $sess->records()->where('student_user_id', $user->id)->first();
                    return [
                        'date' => $sess->session_date?->format('Y-m-d'),
                        'topic' => $sess->topic,
                        'status' => $rec?->status ?? 'absent',
                        'remarks' => $rec?->remarks,
                    ];
                });

            $courseSummaries[] = [
                'course_id' => $course->id,
                'code' => $course->code,
                'title' => $course->title,
                'department' => $course->department?->code,
                'stats' => $att,
                'recent_sessions' => $recentSessions,
            ];
        }

        $overallPct = $totalConducted > 0 ? (int) round(($totalAttended / $totalConducted) * 100) : 100;

        return response()->json([
            'overall_percentage' => min(100, $overallPct),
            'has_shortage' => $overallPct < 75,
            'courses' => $courseSummaries,
        ]);
    }
}
