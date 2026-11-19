<?php

namespace App\Http\Requests\Assignment;

use Illuminate\Foundation\Http\FormRequest;

class GradeSubmissionRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        $submission = $this->route('submission');
        $course = $submission?->assignment?->course;

        if (! $user || ! $course) {
            return false;
        }

        return $course->isTaughtBy($user) || $user->hasPermission('assignments.grade') || $user->isSuperAdmin();
    }

    public function rules(): array
    {
        $submission = $this->route('submission');
        $maxScore = $submission?->assignment?->max_score ?? 100;

        return [
            'score' => ['required', 'integer', 'min:0', 'max:'.$maxScore],
            'feedback' => ['nullable', 'string'],
            'status' => ['sometimes', 'string', 'in:graded,resubmission_requested'],
        ];
    }
}
