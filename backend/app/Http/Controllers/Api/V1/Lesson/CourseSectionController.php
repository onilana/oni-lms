<?php

namespace App\Http\Controllers\Api\V1\Lesson;

use App\Http\Requests\Lesson\CourseSectionRequest;
use App\Http\Resources\Lesson\CourseSectionResource;
use App\Models\Course;
use App\Models\CourseSection;
use App\Models\Role;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CourseSectionController
{
    public function index(Request $request, Course $course): JsonResponse
    {
        $userId = $request->user()?->id;
        $sections = CourseSection::where('course_id', $course->id)
            ->with([
                'lessons.course',
                'lessons.section',
                'lessons.progressRecords' => fn ($query) => $query->where('user_id', $userId),
            ])
            ->orderBy('order_index')
            ->get();

        return response()->json([
            'sections' => CourseSectionResource::collection($sections),
        ]);
    }

    public function store(CourseSectionRequest $request, Course $course): JsonResponse
    {
        $data = $request->validated();
        $data['course_id'] = $course->id;

        $section = CourseSection::create($data);
        $section->load([
            'lessons.course',
            'lessons.section',
            'lessons.progressRecords' => fn ($query) => $query->where('user_id', $request->user()?->id),
        ]);

        return response()->json([
            'message' => 'Section created successfully.',
            'section' => new CourseSectionResource($section),
        ], 201);
    }

    public function show(Request $request, Course $course, CourseSection $section): JsonResponse
    {
        abort_unless($section->course_id === $course->id, 404);

        $section->load([
            'lessons.course',
            'lessons.section',
            'lessons.progressRecords' => fn ($query) => $query->where('user_id', $request->user()?->id),
        ]);

        return response()->json([
            'section' => new CourseSectionResource($section),
        ]);
    }

    public function update(CourseSectionRequest $request, Course $course, CourseSection $section): JsonResponse
    {
        abort_unless($section->course_id === $course->id, 404);

        $section->update($request->validated());
        $section->load([
            'lessons.course',
            'lessons.section',
            'lessons.progressRecords' => fn ($query) => $query->where('user_id', $request->user()?->id),
        ]);

        return response()->json([
            'message' => 'Section updated successfully.',
            'section' => new CourseSectionResource($section),
        ]);
    }

    public function destroy(Request $request, Course $course, CourseSection $section): JsonResponse
    {
        abort_unless($section->course_id === $course->id, 404);

        $user = $request->user();
        if (
            ! $course->isTaughtBy($user)
            && ! $user->isSuperAdmin()
            && ! ($user->hasPermission('lessons.manage') && ! $user->hasRole(Role::TEACHER))
        ) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $section->delete();

        return response()->json([
            'message' => 'Section deleted successfully.',
        ]);
    }
}
