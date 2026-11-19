<?php

namespace App\Http\Requests\Lesson;

use Illuminate\Foundation\Http\FormRequest;

class LessonRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        if (! $user) {
            return false;
        }

        $section = $this->route('section');
        $lesson = $this->route('lesson');
        $course = $section?->course ?? $lesson?->course;

        if ($course && ($course->isTaughtBy($user) || $user->hasPermission('lessons.manage') || $user->isSuperAdmin())) {
            return true;
        }

        return false;
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'type' => ['required', 'string', 'in:text,video,pdf,embed'],
            'content' => ['nullable', 'string'],
            'video_url' => ['nullable', 'string', 'max:500'],
            'video_duration_seconds' => ['nullable', 'integer', 'min:0'],
            'attachment_path' => ['nullable', 'string', 'max:500'],
            'attachment_name' => ['nullable', 'string', 'max:255'],
            'order_index' => ['sometimes', 'integer', 'min:0'],
            'is_free_preview' => ['sometimes', 'boolean'],
            'status' => ['sometimes', 'string', 'in:draft,published'],
        ];
    }
}
