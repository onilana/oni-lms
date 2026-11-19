<?php

namespace App\Http\Requests\Exam;

use Illuminate\Foundation\Http\FormRequest;

class QuestionRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        if (!$user) {
            return false;
        }

        return $user->hasPermission('exams.manage') || $user->hasRole('teacher') || $user->isSuperAdmin();
    }

    public function rules(): array
    {
        return [
            'question_bank_id' => ['nullable', 'uuid', 'exists:question_banks,id'],
            'course_id' => ['nullable', 'uuid', 'exists:courses,id'],
            'question_text' => ['required', 'string'],
            'question_type' => ['required', 'string', 'in:mcq_single,mcq_multiple,true_false,short_answer'],
            'options' => ['nullable', 'array'],
            'options.*.id' => ['required_with:options', 'string'],
            'options.*.text' => ['required_with:options', 'string'],
            'correct_answers' => ['required', 'array', 'min:1'],
            'points' => ['sometimes', 'numeric', 'min:0.5', 'max:100'],
            'explanation' => ['nullable', 'string'],
        ];
    }
}
