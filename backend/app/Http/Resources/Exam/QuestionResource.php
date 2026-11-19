<?php

namespace App\Http\Resources\Exam;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class QuestionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $user = $request->user();
        $isTeacherOrAdmin = $user && ($user->hasRole('teacher') || $user->hasRole('super_admin') || $user->hasPermission('exams.manage'));

        // Check if student has finished and evaluated their attempt
        $includeSolutions = $isTeacherOrAdmin;

        return [
            'id' => $this->id,
            'question_bank_id' => $this->question_bank_id,
            'course_id' => $this->course_id,
            'question_text' => $this->question_text,
            'question_type' => $this->question_type,
            'options' => $this->options,
            'points' => (float)$this->points,
            'pivot_points' => $this->whenPivotLoaded('exam_questions', function () {
                return (float)($this->pivot->points ?? $this->points);
            }),
            'order_index' => $this->whenPivotLoaded('exam_questions', function () {
                return $this->pivot->order_index;
            }),
            'correct_answers' => $this->when($includeSolutions, $this->correct_answers),
            'explanation' => $this->when($includeSolutions, $this->explanation),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
