<?php

namespace App\Http\Requests\Academic;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AcademicSessionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('academic.manage') ?? false;
    }

    public function rules(): array
    {
        $sessionId = $this->route('session')?->id ?? $this->route('session');

        return [
            'name' => [
                'required',
                'string',
                'max:100',
                Rule::unique('academic_sessions', 'name')->ignore($sessionId),
            ],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after:start_date'],
            'is_current' => ['sometimes', 'boolean'],
            'status' => ['sometimes', 'string', 'in:active,archived'],
        ];
    }
}
