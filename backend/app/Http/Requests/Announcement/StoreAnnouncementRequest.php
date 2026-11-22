<?php

namespace App\Http\Requests\Announcement;

use Illuminate\Foundation\Http\FormRequest;

class StoreAnnouncementRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => 'required|string|max:255',
            'content' => 'required|string|max:10000',
            'course_id' => 'nullable|uuid|exists:courses,id',
            'department_id' => 'nullable|uuid|exists:departments,id',
            'priority' => 'nullable|string|in:low,normal,high,urgent',
            'is_pinned' => 'nullable|boolean',
        ];
    }
}
