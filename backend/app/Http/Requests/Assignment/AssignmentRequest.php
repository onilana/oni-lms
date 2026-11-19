<?php

namespace App\Http\Requests\Assignment;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AssignmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        if (! $user) {
            return false;
        }

        $course = $this->route('course') ?? $this->route('assignment')?->course;
        if ($course && (
            $course->isTaughtBy($user)
            || $user->isSuperAdmin()
            || ($user->hasPermission('assignments.manage') && ! $user->hasRole('teacher'))
        )) {
            return true;
        }

        return false;
    }

    public function rules(): array
    {
        $course = $this->route('course') ?? $this->route('assignment')?->course;
        $sectionExists = Rule::exists('course_sections', 'id');
        if ($course) {
            $sectionExists->where('course_id', $course->id);
        }

        return [
            'title' => ['required', 'string', 'max:255'],
            'section_id' => ['nullable', 'uuid', $sectionExists],
            'description' => ['nullable', 'string'],
            'instructions' => ['nullable', 'string'],
            'due_date' => ['required', 'date'],
            'max_score' => ['required', 'integer', 'min:1', 'max:1000'],
            'submission_type' => ['sometimes', 'string', 'in:text,file,both'],
            'status' => ['sometimes', 'string', 'in:draft,published,closed'],
        ];
    }
}
