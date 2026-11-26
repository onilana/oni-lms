<?php

namespace App\Http\Controllers\Api\V1\Assignment;

use App\Http\Requests\Assignment\AssignmentRequest;
use App\Http\Resources\Assignment\AssignmentResource;
use App\Models\Assignment;
use App\Models\Course;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class AssignmentController
{
    public function index(Request $request, ?Course $course = null): JsonResponse
    {
        $user = $request->user();
        $query = Assignment::query()
            ->with(['course.department'])
            ->withCount('submissions');

        $submissionConstraint = fn ($submissions) => $submissions
            ->where('user_id', $user?->id)
            ->with('grader');
        $query->with(['submissions' => $submissionConstraint]);

        if ($course) {
            $query->where('course_id', $course->id);
        }

        $hasGlobalManagement = $user && (
            $user->isSuperAdmin()
            || ($user->hasPermission('assignments.manage') && ! $user->hasRole('teacher'))
        );

        if (! $hasGlobalManagement) {
            $query->where(function ($query) use ($user): void {
                $query->where('status', 'published');
                if ($user) {
                    $query->orWhereHas('course.teacherUsers', fn ($instructors) => $instructors->where('users.id', $user->id));
                }
            });
        }

        $assignments = $query->orderBy('due_date')->get();

        return response()->json([
            'assignments' => AssignmentResource::collection($assignments),
        ]);
    }

    public function store(AssignmentRequest $request, Course $course): JsonResponse
    {
        $data = $request->validated();
        $data['course_id'] = $course->id;
        $data['created_by_id'] = $request->user()->id;

        $assignment = Assignment::create($data);
        $assignment->load([
            'course.department',
            'submissions' => fn ($submissions) => $submissions
                ->where('user_id', $request->user()?->id)
                ->with('grader'),
        ]);

        return response()->json([
            'message' => 'Assignment created successfully.',
            'assignment' => new AssignmentResource($assignment),
        ], 201);
    }

    public function show(Request $request, Assignment $assignment): JsonResponse
    {
        if (! Gate::allows('view', $assignment)) {
            abort(404);
        }

        $assignment->load([
            'course.department',
            'section',
            'submissions' => fn ($submissions) => $submissions
                ->where('user_id', $request->user()?->id)
                ->with('grader'),
        ])->loadCount('submissions');

        return response()->json([
            'assignment' => new AssignmentResource($assignment),
        ]);
    }

    public function update(AssignmentRequest $request, Assignment $assignment): JsonResponse
    {
        $assignment->update($request->validated());
        $assignment->load([
            'course.department',
            'section',
            'submissions' => fn ($submissions) => $submissions
                ->where('user_id', $request->user()?->id)
                ->with('grader'),
        ])->loadCount('submissions');

        return response()->json([
            'message' => 'Assignment updated successfully.',
            'assignment' => new AssignmentResource($assignment),
        ]);
    }

    public function destroy(Request $request, Assignment $assignment): JsonResponse
    {
        if (! Gate::allows('delete', $assignment)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $assignment->delete();

        return response()->json([
            'message' => 'Assignment deleted successfully.',
        ]);
    }
}
