<?php

namespace App\Http\Controllers\Api\V1\Assignment;

use App\Http\Requests\Assignment\GradeSubmissionRequest;
use App\Http\Requests\Assignment\SubmitAssignmentRequest;
use App\Http\Resources\Assignment\AssignmentSubmissionResource;
use App\Models\Assignment;
use App\Models\AssignmentSubmission;
use App\Models\AssignmentSubmissionUpload;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class AssignmentSubmissionController
{
    public function index(Request $request, Assignment $assignment): JsonResponse
    {
        $user = $request->user();

        if (! $assignment->canBeGradedBy($user)) {
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

        if ($assignment->status !== 'published') {
            return response()->json(['message' => 'Submissions for this assignment are not open.'], 403);
        }

        $validated = $request->validated();
        $upload = null;
        if (! empty($validated['attachment_path'])) {
            $upload = AssignmentSubmissionUpload::query()
                ->whereKey($validated['attachment_path'])
                ->where('assignment_id', $assignment->id)
                ->where('user_id', $user->id)
                ->firstOrFail();

            if (! Storage::disk('local')->exists($upload->storage_path)) {
                throw ValidationException::withMessages([
                    'attachment_path' => 'The uploaded file is no longer available.',
                ]);
            }
        }

        $isLate = $assignment->isPastDue();

        $submission = AssignmentSubmission::updateOrCreate([
            'assignment_id' => $assignment->id,
            'user_id' => $user->id,
        ], [
            'submission_text' => $validated['submission_text'] ?? null,
            'attachment_path' => $upload?->storage_path,
            'attachment_name' => $upload?->original_name,
            'submitted_at' => now(),
            'status' => 'submitted',
            'is_late' => $isLate,
            'score' => null,
            'feedback' => null,
            'graded_by_id' => null,
            'graded_at' => null,
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
