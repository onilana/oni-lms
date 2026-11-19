<?php

namespace App\Http\Resources\Assignment;

use App\Http\Resources\UserResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AssignmentSubmissionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'assignment_id' => $this->assignment_id,
            'user' => new UserResource($this->whenLoaded('user')),
            'submission_text' => $this->submission_text,
            'attachment_path' => $this->attachment_path
                ? route('api.v1.submissions.attachment', ['submission' => $this->id])
                : null,
            'attachment_name' => $this->attachment_name,
            'submitted_at' => $this->submitted_at?->toIso8601String(),
            'status' => $this->status,
            'is_late' => (bool) $this->is_late,
            'score' => $this->score,
            'feedback' => $this->feedback,
            'grader' => new UserResource($this->whenLoaded('grader')),
            'graded_at' => $this->graded_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
