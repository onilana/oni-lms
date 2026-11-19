<?php

namespace App\Http\Requests\Lesson;

use Illuminate\Foundation\Http\FormRequest;

class CourseSectionRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        if (! $user) {
            return false;
        }

        $section = $this->route('section');
        $course = $section?->course ?? $this->route('course');
        if ($course && (
            $course->isTaughtBy($user)
            || $user->isSuperAdmin()
            || ($user->hasPermission('lessons.manage') && ! $user->hasRole('teacher'))
        )) {
            return true;
        }

        return false;
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'order_index' => ['sometimes', 'integer', 'min:0'],
            'status' => ['sometimes', 'string', 'in:draft,published'],
        ];
    }
}
