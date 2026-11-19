<?php

namespace App\Http\Requests\Exam;

use Illuminate\Foundation\Http\FormRequest;

class SaveAttemptProgressRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        if (!$user) {
            return false;
        }

        $attempt = $this->route('attempt');
        return $attempt && $attempt->user_id === $user->id && $attempt->status === 'in_progress';
    }

    public function rules(): array
    {
        return [
            'answers' => ['required', 'array'],
        ];
    }
}
