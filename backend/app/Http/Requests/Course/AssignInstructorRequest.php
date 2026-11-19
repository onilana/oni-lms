<?php

namespace App\Http\Requests\Course;

use Illuminate\Foundation\Http\FormRequest;

class AssignInstructorRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('courses.update') || $this->user()?->isSuperAdmin();
    }

    public function rules(): array
    {
        return [
            'user_id' => ['required', 'uuid', 'exists:users,id'],
            'role' => ['sometimes', 'string', 'in:lead,assistant,tutor'],
            'academic_session_id' => ['nullable', 'uuid', 'exists:academic_sessions,id'],
        ];
    }
}
