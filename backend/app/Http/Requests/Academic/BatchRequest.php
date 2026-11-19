<?php

namespace App\Http\Requests\Academic;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class BatchRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('academic.manage') ?? false;
    }

    public function rules(): array
    {
        $batchId = $this->route('batch')?->id ?? $this->route('batch');
        $programmeId = $this->input('programme_id') ?? $this->route('batch')?->programme_id;

        return [
            'programme_id' => ['required', 'uuid', 'exists:programmes,id'],
            'academic_session_id' => ['required', 'uuid', 'exists:academic_sessions,id'],
            'name' => ['required', 'string', 'max:255'],
            'code' => [
                'required',
                'string',
                'max:50',
                Rule::unique('batches', 'code')
                    ->where('programme_id', $programmeId)
                    ->ignore($batchId),
            ],
            'max_capacity' => ['nullable', 'integer', 'min:1', 'max:1000'],
            'status' => ['sometimes', 'string', 'in:active,completed,archived'],
        ];
    }
}
