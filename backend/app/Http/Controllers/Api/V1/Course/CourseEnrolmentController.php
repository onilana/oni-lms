<?php

namespace App\Http\Controllers\Api\V1\Course;

use App\Http\Requests\Course\EnrollStudentRequest;
use App\Http\Resources\Course\CourseEnrolmentResource;
use App\Models\AcademicSession;
use App\Models\Course;
use App\Models\CourseEnrolment;
use App\Models\Role;
use App\Models\Semester;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class CourseEnrolmentController
{
    public function index(Request $request, Course $course): JsonResponse
    {
        Gate::authorize('manageEnrolments', $course);

        $enrolments = CourseEnrolment::where('course_id', $course->id)
            ->with(['user', 'academicSession', 'semester'])
            ->orderBy('enrolled_at', 'desc')
            ->get();

        return response()->json([
            'enrolments' => CourseEnrolmentResource::collection($enrolments),
        ]);
    }

    public function enroll(EnrollStudentRequest $request, Course $course): JsonResponse
    {
        $validated = $request->validated();
        $authUser = $request->user();
        $targetUserId = $validated['user_id'] ?? $authUser->id;
        $canManage = Gate::allows('manageEnrolments', $course);

        // Students cannot manipulate their own enrolment status
        if (! $canManage && isset($validated['status']) && $validated['status'] !== 'enrolled') {
            abort(403, 'Students cannot set or modify their own enrolment status.');
        }

        // Self-enrolment is only permitted on published courses
        if (! $canManage && $course->status !== 'published') {
            return response()->json([
                'message' => 'This course is not open for enrolment.',
            ], 422);
        }

        $targetUser = User::findOrFail($targetUserId);
        if ($targetUser->status !== 'active') {
            return response()->json([
                'message' => 'Only active user accounts can be enrolled.',
            ], 422);
        }

        // Ensure target user is not already enrolled for this session
        $academicSessionId = $validated['academic_session_id'];

        if (! empty($validated['semester_id'])) {
            $semesterValid = Semester::where('id', $validated['semester_id'])
                ->where('academic_session_id', $academicSessionId)
                ->exists();
            if (! $semesterValid) {
                return response()->json([
                    'message' => 'The selected semester does not belong to the specified academic session.',
                ], 422);
            }
        }

        $existing = CourseEnrolment::where('course_id', $course->id)
            ->where('user_id', $targetUserId)
            ->where('academic_session_id', $academicSessionId)
            ->first();

        if ($existing) {
            return response()->json([
                'message' => 'User is already enrolled in this course for the selected session.',
                'enrolment' => new CourseEnrolmentResource($existing->load(['user', 'academicSession', 'semester'])),
            ], 200);
        }

        $enrolment = CourseEnrolment::create([
            'course_id' => $course->id,
            'user_id' => $targetUserId,
            'academic_session_id' => $academicSessionId,
            'semester_id' => $validated['semester_id'] ?? null,
            'status' => $canManage ? ($validated['status'] ?? 'enrolled') : 'enrolled',
            'enrolled_at' => now(),
        ]);

        $enrolment->load(['user', 'academicSession', 'semester']);

        return response()->json([
            'message' => 'Successfully enrolled in course.',
            'enrolment' => new CourseEnrolmentResource($enrolment),
        ], 201);
    }

    public function unenroll(Request $request, Course $course, User $user): JsonResponse
    {
        $authUser = $request->user();
        if (!$authUser || ($authUser->id !== $user->id && !Gate::allows('manageEnrolments', $course))) {
            abort(403, 'Access denied. You do not have permission to unenroll this user.');
        }

        CourseEnrolment::where('course_id', $course->id)
            ->where('user_id', $user->id)
            ->delete();

        return response()->json([
            'message' => 'User unenrolled from course successfully.',
        ]);
    }
}
