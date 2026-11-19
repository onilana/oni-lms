<?php

namespace App\Http\Requests\Assignment;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class SubmitAssignmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        $assignment = $this->route('assignment');

        if (! $user || ! $assignment) {
            return false;
        }

        // Student must be enrolled in the course or a super-admin.
        return $assignment->course->hasStudent($user) || $user->isSuperAdmin();
    }

    public function rules(): array
    {
        $assignment = $this->route('assignment');
        $submissionType = $assignment?->submission_type;
        $referenceExists = Rule::exists('assignment_submission_uploads', 'id')
            ->where('assignment_id', $assignment?->id)
            ->where('user_id', $this->user()?->id);

        return [
            'submission_text' => match ($submissionType) {
                'text' => ['required', 'string'],
                'file' => ['prohibited'],
                default => ['nullable', 'string', 'required_without:attachment_path'],
            },
            'attachment_path' => match ($submissionType) {
                'text' => ['prohibited'],
                'file' => ['required', 'uuid', $referenceExists],
                default => ['nullable', 'uuid', $referenceExists, 'required_without:submission_text'],
            },
            'attachment_name' => $submissionType === 'text'
                ? ['prohibited']
                : ['nullable', 'string', 'max:255'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if ($this->filled('attachment_name') && ! $this->filled('attachment_path')) {
                $validator->errors()->add(
                    'attachment_path',
                    'Upload the attachment and provide its returned reference.'
                );
            }
        });
    }
}
