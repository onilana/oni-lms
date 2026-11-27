<?php

namespace App\Http\Requests\Academic;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class DepartmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('academic.manage') || ($this->user()?->isSuperAdmin() ?? false);
    }

    public function rules(): array
    {
        $departmentId = $this->route('department')?->id ?? $this->route('department');

        return [
            'parent_id' => [
                'nullable',
                'uuid',
                'exists:departments,id',
                Rule::notIn($departmentId ? [$departmentId] : []),
            ],
            'programme_id' => ['nullable', 'uuid', 'exists:programmes,id'],
            'name' => ['required', 'string', 'max:255'],
            'code' => [
                'required',
                'string',
                'max:50',
                Rule::unique('departments', 'code')->ignore($departmentId),
            ],
            'description' => ['nullable', 'string'],
            'status' => ['sometimes', 'string', 'in:active,inactive'],
            'head_of_department_id' => ['nullable', 'uuid', 'exists:users,id'],
        ];
    }
}
