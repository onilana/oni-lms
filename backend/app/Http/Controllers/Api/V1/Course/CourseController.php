<?php

namespace App\Http\Controllers\Api\V1\Course;

use App\Http\Requests\Course\AssignInstructorRequest;
use App\Http\Requests\Course\CourseRequest;
use App\Http\Resources\Course\CourseInstructorResource;
use App\Http\Resources\Course\CourseResource;
use App\Models\Course;
use App\Models\CourseInstructor;
use App\Models\CourseSection;
use App\Models\Lesson;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class CourseController
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = Course::query()
            ->with(['department', 'programme', 'instructors.user'])
            ->withCount('enrolments');

        // Department isolation for HoD, Department Admins, and Faculty Instructors
        if ($user && !$user->isInstitutionAdmin() && $user->hasRole([Role::HOD, Role::DEPT_ADMIN, Role::TEACHER])) {
            $assignedDeptId = $user->getAssignedDepartmentId();
            if ($assignedDeptId) {
                $query->where(function ($q) use ($assignedDeptId, $user) {
                    $q->where('department_id', $assignedDeptId)
                      ->orWhereHas('instructors', fn ($sub) => $sub->where('user_id', $user->id));
                });
            } else {
                $query->whereHas('instructors', fn ($sub) => $sub->where('user_id', $user->id));
            }
        } elseif ($request->filled('department_id')) {
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

        // Automatically provision an initial CourseSection & Lessons from attached media / video link
        $materials = $data['materials'] ?? [];
        $videoUrl = $data['video_url'] ?? null;
        if (! empty($materials) || ! empty($videoUrl)) {
            $section = CourseSection::create([
                'course_id' => $course->id,
                'title' => 'Course Materials & Media',
                'description' => 'Initial documents, images, and video resources added during course setup.',
                'order_index' => 1,
                'status' => 'published',
            ]);

            $order = 1;
            if (! empty($videoUrl)) {
                Lesson::create([
                    'course_id' => $course->id,
                    'section_id' => $section->id,
                    'title' => 'Course Introduction Video',
                    'type' => 'video',
                    'video_url' => $videoUrl,
                    'order_index' => $order++,
                    'status' => 'published',
                ]);
            }

            $lessonTypeMap = [
                'pdf' => 'pdf',
                'docx' => 'word',
                'excel' => 'spreadsheet',
                'image' => 'link',
                'video' => 'video',
                'video_embed' => 'video',
            ];

            foreach ($materials as $item) {
                $matType = $item['type'] ?? 'pdf';
                $lessonType = $lessonTypeMap[$matType] ?? 'doc';
                $isVideo = in_array($matType, ['video', 'video_embed'], true);

                Lesson::create([
                    'course_id' => $course->id,
                    'section_id' => $section->id,
                    'title' => $item['title'] ?? ($item['name'] ?? 'Course Resource'),
                    'type' => $lessonType,
                    'video_url' => $isVideo ? ($item['url'] ?? null) : null,
                    'attachment_path' => $isVideo ? null : ($item['url'] ?? null),
                    'attachment_name' => $item['name'] ?? ($item['title'] ?? 'resource'),
                    'order_index' => $order++,
                    'status' => 'published',
                ]);
            }
        }

        $course->load(['department', 'programme', 'instructors.user'])->loadCount('enrolments');

        return response()->json([
            'message' => 'Course created successfully.',
            'course' => new CourseResource($course),
        ], 201);
    }

    public function show(Request $request, Course $course): JsonResponse
    {
        Gate::authorize('view', $course);

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
