<?php

namespace App\Http\Requests\Attendance;

use Illuminate\Foundation\Http\FormRequest;

class AttendanceSessionRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        if (!$user) {
            return false;
        }

        $course = $this->route('course') ?? $this->route('session')?->course;
        if ($course && ($course->isTaughtBy($user) || $user->hasPermission('attendance.mark') || $user->isSuperAdmin())) {
            return true;
        }

        return false;
    }

    public function rules(): array
    {
        return [
            'session_date' => ['required', 'date'],
            'start_time' => ['nullable', 'string', 'max:20'],
            'end_time' => ['nullable', 'string', 'max:20'],
            'topic' => ['nullable', 'string', 'max:255'],
            'room' => ['nullable', 'string', 'max:100'],
            'status' => ['sometimes', 'string', 'in:scheduled,completed,cancelled'],
        ];
    }
}
