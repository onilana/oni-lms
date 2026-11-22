<?php

namespace App\Http\Controllers\Api\V1\Communication;

use App\Http\Requests\Announcement\StoreAnnouncementRequest;
use App\Http\Resources\AnnouncementResource;
use App\Models\Announcement;
use App\Models\Course;
use App\Models\InAppNotification;
use App\Models\Role;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class AnnouncementController
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $user = $request->user();

        $query = Announcement::with(['author', 'course', 'department'])
            ->forUser($user)
            ->orderBy('is_pinned', 'desc')
            ->orderBy('published_at', 'desc');

        if ($request->has('course_id')) {
            $query->where('course_id', $request->input('course_id'));
        }

        return AnnouncementResource::collection($query->get());
    }

    public function store(StoreAnnouncementRequest $request): JsonResponse
    {
        $user = $request->user();
        $validated = $request->validated();

        // Authorization: course announcement requires teacher or admin; campus requires college/super admin
        if (!empty($validated['course_id'])) {
            $course = Course::findOrFail($validated['course_id']);
            if (!$user->hasRole([Role::SUPER_ADMIN, Role::COLLEGE_ADMIN, Role::DEPT_ADMIN]) && !$course->isTaughtBy($user)) {
                return response()->json(['message' => 'Unauthorized to post announcements for this course.'], 403);
            }
        } else {
            if (!$user->hasRole([Role::SUPER_ADMIN, Role::COLLEGE_ADMIN])) {
                return response()->json(['message' => 'Only administrators can broadcast campus-wide announcements.'], 403);
            }
        }

        $announcement = Announcement::create([
            'author_id' => $user->id,
            'course_id' => $validated['course_id'] ?? null,
            'department_id' => $validated['department_id'] ?? null,
            'title' => $validated['title'],
            'content' => $validated['content'],
            'priority' => $validated['priority'] ?? Announcement::PRIORITY_NORMAL,
            'is_pinned' => $validated['is_pinned'] ?? false,
            'published_at' => now(),
        ]);

        // Broadcast notifications to relevant students
        if (!empty($validated['course_id'])) {
            $course = Course::find($validated['course_id']);
            $students = $course->enrolledStudents()->wherePivot('status', 'active')->get();
            foreach ($students as $student) {
                InAppNotification::create([
                    'user_id' => $student->id,
                    'type' => 'announcement',
                    'title' => 'New Course Notice: ' . $course->code,
                    'message' => $announcement->title,
                    'action_url' => "/courses/{$course->id}/announcements",
                    'data' => ['announcement_id' => $announcement->id],
                ]);
            }
        }

        return response()->json([
            'message' => 'Announcement published successfully.',
            'data' => new AnnouncementResource($announcement->load(['author', 'course', 'department'])),
        ], 201);
    }

    public function show(Announcement $announcement, Request $request): JsonResponse
    {
        return response()->json([
            'data' => new AnnouncementResource($announcement->load(['author', 'course', 'department'])),
        ]);
    }

    public function destroy(Announcement $announcement, Request $request): JsonResponse
    {
        $user = $request->user();
        if ($announcement->author_id !== $user->id && !$user->hasRole([Role::SUPER_ADMIN, Role::COLLEGE_ADMIN])) {
            return response()->json(['message' => 'Unauthorized to delete this announcement.'], 403);
        }

        $announcement->delete();

        return response()->json(['message' => 'Announcement deleted.']);
    }
}
