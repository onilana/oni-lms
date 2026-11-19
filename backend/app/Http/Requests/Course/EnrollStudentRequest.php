<?php

namespace App\Http\Requests\Course;

use Illuminate\Foundation\Http\FormRequest;

class EnrollStudentRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        if (! $user) {
            return false;
        }

        // Student self-enrolling or Admin/Teacher enrolling someone
        if ($this->has('user_id') && $this->input('user_id') !== $user->id) {
            return $user->hasPermission('courses.enroll') || $user->isSuperAdmin();
        }

        return true;
    }

    public function rules(): array
    {
        return [
            'user_id' => ['nullable', 'uuid', 'exists:users,id'],
            'academic_session_id' => ['required', 'uuid', 'exists:academic_sessions,id'],
            'semester_id' => ['nullable', 'uuid', 'exists:semesters,id'],
            'status' => ['sometimes', 'string', 'in:enrolled,completed,dropped'],
        ];
    }
}
