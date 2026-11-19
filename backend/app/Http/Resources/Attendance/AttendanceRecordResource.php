<?php

namespace App\Http\Resources\Attendance;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AttendanceRecordResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'attendance_session_id' => $this->attendance_session_id,
            'student_user_id' => $this->student_user_id,
            'student_name' => $this->student?->name,
            'student_email' => $this->student?->email,
            'status' => $this->status,
            'remarks' => $this->remarks,
            'marked_by' => $this->markedBy?->name,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
