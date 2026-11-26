<?php

namespace App\Http\Controllers\Api\V1\Lesson;

use App\Http\Requests\Lesson\LessonRequest;
use App\Http\Resources\Lesson\LessonResource;
use App\Models\CourseSection;
use App\Models\Lesson;
use App\Models\Role;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;

class LessonController
{
    public function index(Request $request, CourseSection $section): JsonResponse
    {
        if ($section->course) {
            Gate::authorize('viewSection', [Lesson::class, $section->course]);
        }

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
        if (! Gate::allows('delete', $lesson)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $lesson->delete();

        return response()->json([
            'message' => 'Lesson deleted successfully.',
        ]);
    }

    public function access(Request $request, Lesson $lesson): JsonResponse
    {
        if (! Gate::allows('access', $lesson)) {
            return response()->json([
                'message' => 'Forbidden: You must be enrolled in this course to access this lesson content.',
            ], 403);
        }

        $attachmentUrl = $lesson->attachment_path
            ? (str_starts_with($lesson->attachment_path, 'http') ? $lesson->attachment_path : asset(ltrim($lesson->attachment_path, '/')))
            : null;

        return response()->json([
            'lesson_id' => $lesson->id,
            'title' => $lesson->title,
            'type' => $lesson->type,
            'content' => $lesson->content,
            'stream_url' => $lesson->video_url,
            'attachment_url' => $attachmentUrl,
            'attachment_path' => $lesson->attachment_path,
            'attachment_name' => $lesson->attachment_name,
            'is_free_preview' => $lesson->is_free_preview,
        ]);
    }

    public function uploadAttachment(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user || (! $user->isSuperAdmin() && ! $user->hasRole(['teacher', 'hod', 'dept_admin', 'college_admin']) && ! $user->hasPermission('lessons.manage') && ! $user->hasPermission('courses.update'))) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $request->validate([
            'file' => ['required', 'file', 'max:25600'],
        ]);

        $file = $request->file('file');
        $originalName = $file->getClientOriginalName();
        $extension = strtolower($file->getClientOriginalExtension());

        $safeName = Str::slug(pathinfo($originalName, PATHINFO_FILENAME));
        $filename = time() . '_' . ($safeName ?: 'material') . '.' . ($extension ?: 'bin');
        $path = $file->storeAs('lesson-materials', $filename, 'public');

        $relativeUrl = '/storage/' . $path;

        return response()->json([
            'message' => 'Attachment uploaded successfully.',
            'attachment_path' => $relativeUrl,
            'attachment_url' => asset('storage/' . $path),
            'attachment_name' => $originalName,
            'extension' => $extension,
        ], 201);
    }
}
