<?php

namespace App\Http\Requests\Exam;

use Illuminate\Foundation\Http\FormRequest;

class AttachQuestionsRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        if (!$user) {
            return false;
        }

        $exam = $this->route('exam');
        if ($exam && ($exam->course->isTaughtBy($user) || $user->hasPermission('exams.manage') || $user->isSuperAdmin())) {
            return true;
        }

        return false;
    }

    public function rules(): array
    {
        return [
            'question_ids' => ['required', 'array', 'min:1'],
            'question_ids.*' => ['uuid', 'exists:questions,id'],
        ];
    }
}
