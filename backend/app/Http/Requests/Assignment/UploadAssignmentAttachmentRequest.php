<?php

namespace App\Http\Requests\Assignment;

use Illuminate\Foundation\Http\FormRequest;

class UploadAssignmentAttachmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        $assignment = $this->route('assignment');

        if (! $user || ! $assignment || $assignment->status !== 'published') {
            return false;
        }

        if (! in_array($assignment->submission_type, ['file', 'both'], true)) {
            return false;
        }

        return $assignment->course->hasStudent($user) || $user->isSuperAdmin();
    }

    public function rules(): array
    {
        return [
            'file' => ['required', 'file', 'max:10240'],
        ];
    }
}
