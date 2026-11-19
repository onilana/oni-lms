<?php

namespace App\Http\Controllers\Api\V1\Lesson;

use App\Http\Requests\Lesson\LessonProgressRequest;
use App\Http\Resources\Lesson\CourseProgressResource;
use App\Models\Course;
use App\Models\Lesson;
use App\Models\LessonProgress;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LessonProgressController
{
    public function updateProgress(LessonProgressRequest $request, Lesson $lesson): JsonResponse
    {
        $user = $request->user();
        $validated = $request->validated();

        $isCompleted = $validated['is_completed'];
        $lastPosition = $validated['last_position_seconds'] ?? 0;

        $progress = LessonProgress::updateOrCreate([
            'lesson_id' => $lesson->id,
            'user_id' => $user->id,
        ], [
            'course_id' => $lesson->course_id,
            'is_completed' => $isCompleted,
            'completed_at' => $isCompleted ? now() : null,
            'last_position_seconds' => $lastPosition,
        ]);

        $courseProgress = $lesson->course->calculateProgressFor($user);

        return response()->json([
            'message' => $isCompleted ? 'Lesson marked as completed.' : 'Lesson progress updated.',
            'progress' => [
                'is_completed' => (bool) $progress->is_completed,
                'completed_at' => $progress->completed_at?->toIso8601String(),
                'last_position_seconds' => $progress->last_position_seconds,
            ],
            'course_progress' => new CourseProgressResource(array_merge(
                ['course_id' => $lesson->course_id],
                $courseProgress
            )),
        ]);
    }

    public function courseProgress(Request $request, Course $course): JsonResponse
    {
        $user = $request->user();
        $progress = $course->calculateProgressFor($user);

        return response()->json([
            'progress' => new CourseProgressResource(array_merge(
                ['course_id' => $course->id],
                $progress
            )),
        ]);
    }
}
