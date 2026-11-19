<?php

namespace App\Http\Requests\Course;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CourseRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        if (! $user) {
            return false;
        }

        if ($user->hasPermission('courses.create') || $user->hasPermission('courses.update') || $user->isSuperAdmin()) {
            return true;
        }

        return false;
    }

    public function rules(): array
    {
        $courseId = $this->route('course')?->id ?? $this->route('course');
        $departmentId = $this->input('department_id') ?? $this->route('course')?->department_id;

        return [
            'department_id' => ['required', 'uuid', 'exists:departments,id'],
            'programme_id' => ['nullable', 'uuid', 'exists:programmes,id'],
            'code' => [
                'required',
                'string',
                'max:50',
                Rule::unique('courses', 'code')
                    ->where('department_id', $departmentId)
                    ->ignore($courseId),
            ],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'credits' => ['required', 'integer', 'min:1', 'max:12'],
            'level' => ['sometimes', 'string', 'in:Undergraduate,Postgraduate,Diploma,Certificate'],
            'semester_number' => ['nullable', 'integer', 'min:1', 'max:16'],
            'status' => ['sometimes', 'string', 'in:draft,published,archived'],
            'syllabus' => ['nullable', 'string'],
        ];
    }
}
