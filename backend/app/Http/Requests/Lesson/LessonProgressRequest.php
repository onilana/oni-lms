<?php

namespace App\Http\Requests\Lesson;

use Illuminate\Foundation\Http\FormRequest;

class LessonProgressRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'is_completed' => ['required', 'boolean'],
            'last_position_seconds' => ['sometimes', 'integer', 'min:0'],
        ];
    }
}
