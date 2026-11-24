<?php

namespace App\Http\Controllers\Api\V1\Communication;

use App\Http\Requests\LiveSession\StoreLiveSessionRequest;
use App\Http\Resources\LiveSessionResource;
use App\Models\AttendanceRecord;
use App\Models\AttendanceSession;
use App\Models\Course;
use App\Models\InAppNotification;
use App\Models\LiveSession;
use App\Models\Role;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Str;

class LiveSessionController
{
    public function indexForCourse(Course $course, Request $request): AnonymousResourceCollection
    {
        $user = $request->user();
        if (!$user->hasRole([Role::SUPER_ADMIN, Role::COLLEGE_ADMIN, Role::DEPT_ADMIN]) &&
            !$course->isTaughtBy($user) &&
            !$course->hasStudent($user)) {
            abort(403, 'Unauthorized to view live classes for this course.');
        }

        $sessions = $course->liveSessions()
            ->with(['course', 'instructor'])
            ->orderBy('scheduled_start_at', 'desc')
            ->get();

        return LiveSessionResource::collection($sessions);
    }

    public function upcoming(Request $request): AnonymousResourceCollection
    {
        $user = $request->user();

        // Find sessions for courses user teaches or is enrolled in
        $query = LiveSession::with(['course', 'instructor'])
            ->whereIn('status', [LiveSession::STATUS_SCHEDULED, LiveSession::STATUS_LIVE])
            ->where('scheduled_end_at', '>=', now()->subHours(2));

        if (!$user->hasRole([Role::SUPER_ADMIN, Role::COLLEGE_ADMIN])) {
            $query->where(function ($q) use ($user) {
                $q->where('instructor_id', $user->id)
                  ->orWhereIn('course_id', function ($sub) use ($user) {
                      $sub->select('course_id')
                          ->from('course_enrolments')
                          ->where('user_id', $user->id)
                          ->where('status', 'active');
                  })
                  ->orWhereIn('course_id', function ($sub) use ($user) {
                      $sub->select('course_id')
                          ->from('course_instructors')
                          ->where('user_id', $user->id);
                  });
            });
        }

        $sessions = $query->orderBy('scheduled_start_at', 'asc')->get();

        return LiveSessionResource::collection($sessions);
    }

    public function store(Course $course, StoreLiveSessionRequest $request): JsonResponse
    {
        $user = $request->user();
        if (!$user->hasRole([Role::SUPER_ADMIN, Role::COLLEGE_ADMIN, Role::DEPT_ADMIN]) && !$course->isTaughtBy($user)) {
            return response()->json(['message' => 'Only course instructors or administrators can schedule live classes.'], 403);
        }

        $validated = $request->validated();
        $provider = $validated['provider'] ?? LiveSession::PROVIDER_JITSI;
        $meetingUrl = $validated['meeting_url'] ?? null;

        if (empty($meetingUrl) && $provider === LiveSession::PROVIDER_JITSI) {
            $slug = Str::slug($course->code ?: 'class');
            $meetingUrl = 'https://meet.jit.si/ONI-LMS-' . $slug . '-' . Str::random(10);
        }

        // Optional attendance session linkage
        $attendanceSessionId = null;
        if (!empty($validated['link_attendance'])) {
            $academicSessionId = $course->enrolments()->latest()->first()?->academic_session_id
                ?? \App\Models\AcademicSession::where('is_current', true)->first()?->id;

            $attSession = AttendanceSession::create([
                'course_id' => $course->id,
                'academic_session_id' => $academicSessionId,
                'instructor_id' => $user->id,
                'session_date' => date('Y-m-d', strtotime($validated['scheduled_start_at'])),
                'start_time' => date('H:i', strtotime($validated['scheduled_start_at'])),
                'end_time' => date('H:i', strtotime($validated['scheduled_end_at'])),
                'topic' => 'Live Class: ' . $validated['title'],
                'room' => 'Online (' . ucfirst($provider) . ')',
                'status' => 'completed',
            ]);
            $attendanceSessionId = $attSession->id;
        }

        $liveSession = LiveSession::create([
            'course_id' => $course->id,
            'academic_session_id' => $course->enrolments()->latest()->first()?->academic_session_id
                ?? \App\Models\AcademicSession::where('is_current', true)->first()?->id,
            'instructor_id' => $user->id,
            'attendance_session_id' => $attendanceSessionId,
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'provider' => $provider,
            'meeting_url' => $meetingUrl ?: 'https://meet.jit.si/ONI-LMS-Room-' . Str::random(8),
            'meeting_id' => $validated['meeting_id'] ?? null,
            'passcode' => $validated['passcode'] ?? null,
            'scheduled_start_at' => $validated['scheduled_start_at'],
            'scheduled_end_at' => $validated['scheduled_end_at'],
            'status' => LiveSession::STATUS_SCHEDULED,
            'settings' => $validated['settings'] ?? [],
        ]);

        // Broadcast notifications to all enrolled active students
        $students = $course->enrolledStudents()->wherePivot('status', 'active')->get();
        foreach ($students as $student) {
            InAppNotification::create([
                'user_id' => $student->id,
                'type' => 'live_class',
                'title' => 'New Live Class Scheduled: ' . $course->code,
                'message' => "Live session '{$liveSession->title}' scheduled for " . date('M d, H:i', strtotime($liveSession->scheduled_start_at)),
                'action_url' => "/courses/{$course->id}/live",
                'data' => [
                    'course_id' => $course->id,
                    'live_session_id' => $liveSession->id,
                ],
            ]);
        }

        return response()->json([
            'message' => 'Live class session scheduled successfully.',
            'data' => new LiveSessionResource($liveSession->load(['course', 'instructor'])),
        ], 201);
    }

    public function show(LiveSession $session, Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$session->canAccess($user)) {
            return response()->json(['message' => 'Access denied to this live session.'], 403);
        }

        return response()->json([
            'data' => new LiveSessionResource($session->load(['course', 'instructor'])),
        ]);
    }

    public function join(LiveSession $session, Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$session->canAccess($user)) {
            return response()->json(['message' => 'Unauthorized. You must be enrolled in this course to join the live session.'], 403);
        }

        if (!$session->isJoinable() && !$user->hasRole([Role::SUPER_ADMIN, Role::TEACHER])) {
            return response()->json([
                'message' => 'Classroom is not open yet. Live rooms open 15 minutes prior to scheduled start time.',
            ], 422);
        }

        // Automatic attendance logging if linked to attendance session
        if ($session->attendance_session_id && $user->hasRole(Role::STUDENT)) {
            AttendanceRecord::updateOrCreate(
                [
                    'attendance_session_id' => $session->attendance_session_id,
                    'student_user_id' => $user->id,
                ],
                [
                    'status' => 'present',
                    'marked_by_id' => $session->instructor_id,
                    'remarks' => 'Auto-logged via Live Classroom join',
                ]
            );
        }

        return response()->json([
            'message' => 'Room access granted.',
            'meeting_url' => $session->meeting_url,
            'meeting_id' => $session->meeting_id,
            'passcode' => $session->passcode,
            'provider' => $session->provider,
            'title' => $session->title,
        ]);
    }

    public function update(LiveSession $session, Request $request): JsonResponse
    {
        $user = $request->user();
        if ($session->instructor_id !== $user->id && !$user->isSuperAdmin() && !$user->hasRole([Role::COLLEGE_ADMIN, Role::DEPT_ADMIN])) {
            return response()->json(['message' => 'Unauthorized to edit this live class schedule.'], 403);
        }

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'scheduled_start_at' => 'required|date',
            'scheduled_end_at' => 'required|date|after:scheduled_start_at',
            'provider' => 'sometimes|string|in:jitsi,zoom,google_meet,custom',
            'meeting_url' => 'nullable|string|url|max:1000',
            'status' => 'sometimes|string|in:scheduled,live,completed,cancelled',
        ]);

        $session->update($validated);

        return response()->json([
            'message' => 'Live class schedule updated successfully.',
            'data' => new LiveSessionResource($session->load(['course', 'instructor'])),
        ]);
    }

    public function updateStatus(LiveSession $session, Request $request): JsonResponse
    {
        $user = $request->user();
        if ($session->instructor_id !== $user->id && !$user->isSuperAdmin() && !$user->hasRole([Role::COLLEGE_ADMIN, Role::DEPT_ADMIN])) {
            return response()->json(['message' => 'Only the session instructor or administrator can update session status.'], 403);
        }

        $validated = $request->validate([
            'status' => 'required|string|in:scheduled,live,completed,cancelled',
            'recording_url' => 'nullable|url|max:1000',
        ]);

        $updates = ['status' => $validated['status']];
        if ($validated['status'] === LiveSession::STATUS_LIVE && empty($session->actual_started_at)) {
            $updates['actual_started_at'] = now();
        } elseif ($validated['status'] === LiveSession::STATUS_COMPLETED && empty($session->actual_ended_at)) {
            $updates['actual_ended_at'] = now();
        }

        if (isset($validated['recording_url'])) {
            $updates['recording_url'] = $validated['recording_url'];
        }

        $session->update($updates);

        return response()->json([
            'message' => 'Session status updated.',
            'data' => new LiveSessionResource($session->load(['course', 'instructor'])),
        ]);
    }

    public function destroy(LiveSession $session, Request $request): JsonResponse
    {
        $user = $request->user();
        if ($session->instructor_id !== $user->id && !$user->isSuperAdmin() && !$user->hasRole([Role::COLLEGE_ADMIN, Role::DEPT_ADMIN])) {
            return response()->json(['message' => 'Unauthorized to cancel this session.'], 403);
        }

        $session->update(['status' => LiveSession::STATUS_CANCELLED]);

        return response()->json(['message' => 'Live class session cancelled successfully.']);
    }
}
