<?php

namespace App\Http\Controllers\Api\V1\Course;

use App\Http\Requests\Course\AssignInstructorRequest;
use App\Http\Requests\Course\CourseRequest;
use App\Http\Resources\Course\CourseInstructorResource;
use App\Http\Resources\Course\CourseResource;
use App\Models\Course;
use App\Models\CourseInstructor;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CourseController
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = Course::query()
            ->with(['department', 'programme', 'instructors.user'])
            ->withCount('enrolments');

        // Filter by department or programme
        if ($request->filled('department_id')) {
            $query->where('department_id', $request->query('department_id'));
        }

        if ($request->filled('programme_id')) {
            $query->where('programme_id', $request->query('programme_id'));
        }

        // Student or guest: only show published courses unless viewing 'my_courses'
        $isStaff = $user?->hasRole([Role::SUPER_ADMIN, Role::COLLEGE_ADMIN, Role::DEPT_ADMIN, Role::TEACHER]);

        if ($request->boolean('my_courses') && $user) {
            $query->where(function ($q) use ($user) {
                $q->whereHas('enrolments', fn ($sub) => $sub->where('user_id', $user->id))
                  ->orWhereHas('instructors', fn ($sub) => $sub->where('user_id', $user->id));
            });
        } elseif (! $isStaff) {
            $query->where('status', 'published');
        } elseif ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        $courses = $query->orderBy('title')->get();

        $collection = CourseResource::collection($courses);

        return response()->json([
            'courses' => $collection,
            'data' => $collection,
        ]);
    }

    public function store(CourseRequest $request): JsonResponse
    {
        $data = $request->validated();
        $user = $request->user();
        $data['created_by_id'] = $user?->id;

        $course = Course::create($data);

        // If a teacher created it, automatically assign them as lead instructor
        if ($user && $user->hasRole(Role::TEACHER)) {
            CourseInstructor::firstOrCreate([
                'course_id' => $course->id,
                'user_id' => $user->id,
            ], [
                'role' => 'lead',
            ]);
        }

        $course->load(['department', 'programme', 'instructors.user'])->loadCount('enrolments');

        return response()->json([
            'message' => 'Course created successfully.',
            'course' => new CourseResource($course),
        ], 201);
    }

    public function show(Course $course): JsonResponse
    {
        $course->load(['department', 'programme', 'creator', 'instructors.user', 'enrolments'])
            ->loadCount('enrolments');

        return response()->json([
            'course' => new CourseResource($course),
        ]);
    }

    public function update(CourseRequest $request, Course $course): JsonResponse
    {
        $course->update($request->validated());
        $course->load(['department', 'programme', 'instructors.user'])->loadCount('enrolments');

        return response()->json([
            'message' => 'Course updated successfully.',
            'course' => new CourseResource($course),
        ]);
    }

    public function destroy(Course $course): JsonResponse
    {
        $course->delete();

        return response()->json([
            'message' => 'Course deleted successfully.',
        ]);
    }

    public function assignInstructor(AssignInstructorRequest $request, Course $course): JsonResponse
    {
        $validated = $request->validated();

        $instructor = CourseInstructor::updateOrCreate([
            'course_id' => $course->id,
            'user_id' => $validated['user_id'],
            'academic_session_id' => $validated['academic_session_id'] ?? null,
        ], [
            'role' => $validated['role'] ?? 'lead',
        ]);

        $instructor->load('user');

        return response()->json([
            'message' => 'Instructor assigned successfully.',
            'instructor' => new CourseInstructorResource($instructor),
        ]);
    }

    public function removeInstructor(Course $course, User $user): JsonResponse
    {
        CourseInstructor::where('course_id', $course->id)
            ->where('user_id', $user->id)
            ->delete();

        return response()->json([
            'message' => 'Instructor removed successfully.',
        ]);
    }
}
