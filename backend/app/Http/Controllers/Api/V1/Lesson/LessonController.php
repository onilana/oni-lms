<?php

namespace App\Http\Controllers\Api\V1\Lesson;

use App\Http\Requests\Lesson\LessonRequest;
use App\Http\Resources\Lesson\LessonResource;
use App\Models\CourseSection;
use App\Models\Lesson;
use App\Models\Role;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LessonController
{
    public function index(Request $request, CourseSection $section): JsonResponse
    {
        $lessons = Lesson::where('section_id', $section->id)
            ->with([
                'course',
                'section',
                'progressRecords' => fn ($query) => $query->where('user_id', $request->user()?->id),
            ])
            ->orderBy('order_index')
            ->get();

        return response()->json([
            'lessons' => LessonResource::collection($lessons),
        ]);
    }

    public function store(LessonRequest $request, CourseSection $section): JsonResponse
    {
        $data = $request->validated();
        $data['section_id'] = $section->id;
        $data['course_id'] = $section->course_id;

        $lesson = Lesson::create($data);

        return response()->json([
            'message' => 'Lesson created successfully.',
            'lesson' => new LessonResource($lesson),
        ], 201);
    }

    public function show(Request $request, Lesson $lesson): JsonResponse
    {
        $lesson->load([
            'course',
            'section',
            'progressRecords' => fn ($query) => $query->where('user_id', $request->user()?->id),
        ]);

        return response()->json([
            'lesson' => new LessonResource($lesson),
        ]);
    }

    public function update(LessonRequest $request, Lesson $lesson): JsonResponse
    {
        $lesson->update($request->validated());
        $lesson->load([
            'course',
            'section',
            'progressRecords' => fn ($query) => $query->where('user_id', $request->user()?->id),
        ]);

        return response()->json([
            'message' => 'Lesson updated successfully.',
            'lesson' => new LessonResource($lesson),
        ]);
    }

    public function destroy(Request $request, Lesson $lesson): JsonResponse
    {
        $user = $request->user();
        if (
            ! $lesson->course->isTaughtBy($user)
            && ! $user->isSuperAdmin()
            && ! ($user->hasPermission('lessons.manage') && ! $user->hasRole(Role::TEACHER))
        ) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $lesson->delete();

        return response()->json([
            'message' => 'Lesson deleted successfully.',
        ]);
    }

    public function access(Request $request, Lesson $lesson): JsonResponse
    {
        $user = $request->user();

        if (! $lesson->isAccessibleBy($user)) {
            return response()->json([
                'message' => 'Forbidden: You must be enrolled in this course to access this lesson content.',
            ], 403);
        }

        return response()->json([
            'lesson_id' => $lesson->id,
            'title' => $lesson->title,
            'type' => $lesson->type,
            'content' => $lesson->content,
            'stream_url' => $lesson->video_url,
            'attachment_url' => $lesson->attachment_path,
            'attachment_name' => $lesson->attachment_name,
            'is_free_preview' => $lesson->is_free_preview,
        ]);
    }
}
