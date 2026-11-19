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
        $assignment = $this->route('assignment');
        $submissionType = $assignment?->submission_type;

        return [
            'submission_text' => match ($submissionType) {
                'text' => ['required', 'string'],
                'file' => ['prohibited'],
                default => ['nullable', 'string', 'required_without:attachment_path'],
            },
            'attachment_path' => match ($submissionType) {
                'text' => ['prohibited'],
                'file' => ['required', 'string', 'max:500'],
                default => ['nullable', 'string', 'max:500', 'required_without:submission_text'],
            },
            'attachment_name' => $submissionType === 'text'
                ? ['prohibited']
                : ['nullable', 'string', 'max:255'],
        ];
    }
}
