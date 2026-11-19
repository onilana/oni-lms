<?php

namespace App\Http\Controllers\Api\V1\Assignment;

use App\Http\Requests\Assignment\GradeSubmissionRequest;
use App\Http\Requests\Assignment\SubmitAssignmentRequest;
use App\Http\Resources\Assignment\AssignmentSubmissionResource;
use App\Models\Assignment;
use App\Models\AssignmentSubmission;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AssignmentSubmissionController
{
    public function index(Request $request, Assignment $assignment): JsonResponse
    {
        $user = $request->user();

        // Enforce instructor/admin access
        if (! $assignment->course->isTaughtBy($user) && ! $user->isSuperAdmin() && ! $user->hasPermission('assignments.grade')) {
            return response()->json(['message' => 'Forbidden: You do not have permission to review submissions.'], 403);
        }

        $submissions = AssignmentSubmission::where('assignment_id', $assignment->id)
            ->with(['user', 'grader'])
            ->orderBy('submitted_at', 'desc')
            ->get();

        return response()->json([
            'submissions' => AssignmentSubmissionResource::collection($submissions),
        ]);
    }

    public function mySubmission(Request $request, Assignment $assignment): JsonResponse
    {
        $user = $request->user();
        $submission = AssignmentSubmission::where('assignment_id', $assignment->id)
            ->where('user_id', $user->id)
            ->with(['user', 'grader'])
            ->first();

        if (! $submission) {
            return response()->json([
                'submission' => null,
            ]);
        }

        return response()->json([
            'submission' => new AssignmentSubmissionResource($submission),
        ]);
    }

    public function submit(SubmitAssignmentRequest $request, Assignment $assignment): JsonResponse
    {
        $user = $request->user();

        if ($assignment->status === 'closed') {
            return response()->json(['message' => 'Submissions for this assignment are closed.'], 403);
        }

        $validated = $request->validated();
        $isLate = $assignment->isPastDue();

        $submission = AssignmentSubmission::updateOrCreate([
            'assignment_id' => $assignment->id,
            'user_id' => $user->id,
        ], [
            'submission_text' => $validated['submission_text'] ?? null,
            'attachment_path' => $validated['attachment_path'] ?? null,
            'attachment_name' => $validated['attachment_name'] ?? null,
            'submitted_at' => now(),
            'status' => 'submitted',
            'is_late' => $isLate,
        ]);

        $submission->load(['user', 'grader']);

        return response()->json([
            'message' => $isLate ? 'Assignment submitted (Flagged as Late).' : 'Assignment submitted successfully.',
            'submission' => new AssignmentSubmissionResource($submission),
        ], 201);
    }

    public function grade(GradeSubmissionRequest $request, AssignmentSubmission $submission): JsonResponse
    {
        $user = $request->user();
        $validated = $request->validated();

        $submission->update([
            'score' => $validated['score'],
            'feedback' => $validated['feedback'] ?? null,
            'status' => $validated['status'] ?? 'graded',
            'graded_by_id' => $user->id,
            'graded_at' => now(),
        ]);

        $submission->load(['user', 'grader']);

        return response()->json([
            'message' => 'Submission graded successfully.',
            'submission' => new AssignmentSubmissionResource($submission),
        ]);
    }
}
