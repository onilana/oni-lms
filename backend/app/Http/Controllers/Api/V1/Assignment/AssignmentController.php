<?php

namespace App\Http\Controllers\Api\V1\Assignment;

use App\Http\Requests\Assignment\AssignmentRequest;
use App\Http\Resources\Assignment\AssignmentResource;
use App\Models\Assignment;
use App\Models\Course;
use App\Models\Role;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AssignmentController
{
    public function index(Request $request, ?Course $course = null): JsonResponse
    {
        $user = $request->user();
        $query = Assignment::query()
            ->with(['course.department'])
            ->withCount('submissions');

        if ($course) {
            $query->where('course_id', $course->id);
        }

        $isStaff = $user?->hasRole([Role::SUPER_ADMIN, Role::COLLEGE_ADMIN, Role::DEPT_ADMIN, Role::TEACHER]);

        // If student or guest, only return published assignments
        if (! $isStaff) {
            $query->where('status', 'published');
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
        $assignment->load('course.department');

        return response()->json([
            'message' => 'Assignment created successfully.',
            'assignment' => new AssignmentResource($assignment),
        ], 201);
    }

    public function show(Assignment $assignment): JsonResponse
    {
        $assignment->load(['course.department', 'section'])->loadCount('submissions');

        return response()->json([
            'assignment' => new AssignmentResource($assignment),
        ]);
    }

    public function update(AssignmentRequest $request, Assignment $assignment): JsonResponse
    {
        $assignment->update($request->validated());
        $assignment->load(['course.department', 'section'])->loadCount('submissions');

        return response()->json([
            'message' => 'Assignment updated successfully.',
            'assignment' => new AssignmentResource($assignment),
        ]);
    }

    public function destroy(Assignment $assignment): JsonResponse
    {
        $assignment->delete();

        return response()->json([
            'message' => 'Assignment deleted successfully.',
        ]);
    }
}
