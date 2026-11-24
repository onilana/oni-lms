<?php

namespace App\Http\Requests\Academic;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SemesterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('academic.manage') || ($this->user()?->isSuperAdmin() ?? false);
    }

    public function rules(): array
    {
        $semesterId = $this->route('semester')?->id ?? $this->route('semester');
        $sessionId = $this->input('academic_session_id') ?? $this->route('semester')?->academic_session_id;

        return [
            'academic_session_id' => ['required', 'uuid', 'exists:academic_sessions,id'],
            'name' => ['required', 'string', 'max:100'],
            'semester_number' => [
                'required',
                'integer',
                'min:1',
                'max:16',
                Rule::unique('semesters', 'semester_number')
                    ->where('academic_session_id', $sessionId)
                    ->ignore($semesterId),
            ],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
