<?php

namespace App\Http\Resources\Exam;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ExamAttemptResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'exam_id' => $this->exam_id,
            'user_id' => $this->user_id,
            'attempt_number' => $this->attempt_number,
            'started_at' => $this->started_at?->toIso8601String(),
            'expires_at' => $this->expires_at?->toIso8601String(),
            'submitted_at' => $this->submitted_at?->toIso8601String(),
            'status' => $this->status,
            'time_remaining_seconds' => $this->timeRemainingSeconds(),
            'score' => $this->score !== null ? (float)$this->score : null,
            'percentage' => $this->percentage !== null ? (float)$this->percentage : null,
            'is_passed' => $this->is_passed,
            'answers_snapshot' => $this->answers_snapshot,
            'created_at' => $this->created_at?->toIso8601String(),
            'answers' => $this->whenLoaded('answers'),
        ];
    }
}
