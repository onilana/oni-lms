<?php

namespace App\Http\Resources\Assignment;

use App\Http\Resources\Course\CourseResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AssignmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $user = $request->user();
        $mySubmission = null;

        if ($user) {
            $sub = $this->relationLoaded('submissions')
                ? $this->submissions->first(fn ($submission) =>
                    $submission->assignment_id === $this->id && $submission->user_id === $user->id
                )
                : null;

            if ($sub) {
                $mySubmission = new AssignmentSubmissionResource($sub);
            }
        }

        return [
            'id' => $this->id,
            'course_id' => $this->course_id,
            'course' => new CourseResource($this->whenLoaded('course')),
            'section_id' => $this->section_id,
            'title' => $this->title,
            'description' => $this->description,
            'instructions' => $this->instructions,
            'due_date' => $this->due_date?->toIso8601String(),
            'is_past_due' => $this->isPastDue(),
            'max_score' => $this->max_score,
            'submission_type' => $this->submission_type,
            'status' => $this->status,
            'submissions_count' => $this->whenCounted('submissions'),
            'my_submission' => $mySubmission,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
