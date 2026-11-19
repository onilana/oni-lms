<?php

namespace App\Http\Controllers\Api\V1\Course;

use App\Http\Requests\Course\EnrollStudentRequest;
use App\Http\Resources\Course\CourseEnrolmentResource;
use App\Models\AcademicSession;
use App\Models\Course;
use App\Models\CourseEnrolment;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CourseEnrolmentController
{
    public function index(Request $request, Course $course): JsonResponse
    {
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
        $targetUserId = $validated['user_id'] ?? $request->user()->id;

        // Ensure target user is not already enrolled for this session
        $academicSessionId = $validated['academic_session_id'];

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
            'status' => $validated['status'] ?? 'enrolled',
            'enrolled_at' => now(),
        ]);

        $enrolment->load(['user', 'academicSession', 'semester']);

        return response()->json([
            'message' => 'Successfully enrolled in course.',
            'enrolment' => new CourseEnrolmentResource($enrolment),
        ], 201);
    }

    public function unenroll(Course $course, User $user): JsonResponse
    {
        CourseEnrolment::where('course_id', $course->id)
            ->where('user_id', $user->id)
            ->delete();

        return response()->json([
            'message' => 'User unenrolled from course successfully.',
        ]);
    }
}
