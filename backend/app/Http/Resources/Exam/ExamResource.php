<?php

namespace App\Http\Resources\Exam;

use App\Models\ExamAttempt;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ExamResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $user = $request->user();
        $myActiveAttempt = null;
        $myLatestAttempt = null;

        if ($user) {
            $myActiveAttempt = ExamAttempt::where('exam_id', $this->id)
                ->where('user_id', $user->id)
                ->where('status', 'in_progress')
                ->latest()
                ->first();

            $myLatestAttempt = ExamAttempt::where('exam_id', $this->id)
                ->where('user_id', $user->id)
                ->latest()
                ->first();
        }

        return [
            'id' => $this->id,
            'course_id' => $this->course_id,
            'title' => $this->title,
            'description' => $this->description,
            'duration_minutes' => $this->duration_minutes,
            'total_marks' => (float)$this->total_marks,
            'passing_percentage' => (float)$this->passing_percentage,
            'start_time' => $this->start_time?->toIso8601String(),
            'end_time' => $this->end_time?->toIso8601String(),
            'is_open' => $this->isOpen(),
            'shuffle_questions' => $this->shuffle_questions,
            'max_attempts' => $this->max_attempts,
            'is_published' => $this->is_published,
            'questions_count' => $this->questions()->count(),
            'questions' => QuestionResource::collection($this->whenLoaded('questions')),
            'my_active_attempt' => $myActiveAttempt ? new ExamAttemptResource($myActiveAttempt) : null,
            'my_latest_attempt' => $myLatestAttempt ? new ExamAttemptResource($myLatestAttempt) : null,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
