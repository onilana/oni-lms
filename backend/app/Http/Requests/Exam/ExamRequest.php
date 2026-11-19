<?php

namespace App\Http\Requests\Exam;

use Illuminate\Foundation\Http\FormRequest;

class ExamRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        if (!$user) {
            return false;
        }

        $course = $this->route('course') ?? $this->route('exam')?->course;
        if ($course && ($course->isTaughtBy($user) || $user->hasPermission('exams.manage') || $user->isSuperAdmin())) {
            return true;
        }

        return false;
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'duration_minutes' => ['required', 'integer', 'min:1', 'max:600'],
            'total_marks' => ['sometimes', 'numeric', 'min:1', 'max:1000'],
            'passing_percentage' => ['sometimes', 'numeric', 'min:0', 'max:100'],
            'start_time' => ['nullable', 'date'],
            'end_time' => ['nullable', 'date', 'after_or_equal:start_time'],
            'shuffle_questions' => ['sometimes', 'boolean'],
            'max_attempts' => ['sometimes', 'integer', 'min:1', 'max:10'],
            'is_published' => ['sometimes', 'boolean'],
        ];
    }
}
