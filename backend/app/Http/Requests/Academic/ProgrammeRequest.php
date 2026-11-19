<?php

namespace App\Http\Requests\Academic;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProgrammeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('academic.manage') ?? false;
    }

    public function rules(): array
    {
        $programmeId = $this->route('programme')?->id ?? $this->route('programme');
        $departmentId = $this->input('department_id') ?? $this->route('programme')?->department_id;

        return [
            'department_id' => ['required', 'uuid', 'exists:departments,id'],
            'name' => ['required', 'string', 'max:255'],
            'code' => [
                'required',
                'string',
                'max:50',
                Rule::unique('programmes', 'code')
                    ->where('department_id', $departmentId)
                    ->ignore($programmeId),
            ],
            'duration_years' => ['required', 'integer', 'min:1', 'max:8'],
            'total_semesters' => ['required', 'integer', 'min:1', 'max:16'],
            'status' => ['sometimes', 'string', 'in:active,inactive'],
        ];
    }
}
