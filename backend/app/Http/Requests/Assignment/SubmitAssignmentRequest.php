<?php

namespace App\Http\Requests\Assignment;

use Illuminate\Foundation\Http\FormRequest;

class SubmitAssignmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        $assignment = $this->route('assignment');

        if (! $user || ! $assignment) {
            return false;
        }

        // Student must be enrolled in the course or admin
        return $assignment->course->hasStudent($user) || $user->isSuperAdmin();
    }

    public function rules(): array
    {
        return [
            'submission_text' => ['nullable', 'string'],
            'attachment_path' => ['nullable', 'string', 'max:500'],
            'attachment_name' => ['nullable', 'string', 'max:255'],
        ];
    }
}
