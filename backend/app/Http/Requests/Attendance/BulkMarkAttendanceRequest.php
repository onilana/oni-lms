<?php

namespace App\Http\Requests\Attendance;

use Illuminate\Foundation\Http\FormRequest;

class BulkMarkAttendanceRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        if (!$user) {
            return false;
        }

        $session = $this->route('session');
        if ($session && ($session->course->isTaughtBy($user) || $user->hasPermission('attendance.mark') || $user->isSuperAdmin())) {
            return true;
        }

        return false;
    }

    public function rules(): array
    {
        return [
            'records' => ['required', 'array', 'min:1'],
            'records.*.student_user_id' => ['required', 'uuid', 'exists:users,id'],
            'records.*.status' => ['required', 'string', 'in:present,absent,late,excused'],
            'records.*.remarks' => ['nullable', 'string', 'max:255'],
        ];
    }
}
