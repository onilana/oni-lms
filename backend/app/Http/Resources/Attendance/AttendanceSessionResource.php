<?php

namespace App\Http\Resources\Attendance;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AttendanceSessionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $user = $request->user();
        $myRecord = null;

        if ($user) {
            $record = $this->records()->where('student_user_id', $user->id)->first();
            if ($record) {
                $myRecord = [
                    'id' => $record->id,
                    'status' => $record->status,
                    'remarks' => $record->remarks,
                ];
            }
        }

        return [
            'id' => $this->id,
            'course_id' => $this->course_id,
            'session_date' => $this->session_date?->format('Y-m-d'),
            'start_time' => $this->start_time,
            'end_time' => $this->end_time,
            'topic' => $this->topic,
            'room' => $this->room,
            'status' => $this->status,
            'summary' => $this->summary,
            'my_record' => $myRecord,
            'records' => AttendanceRecordResource::collection($this->whenLoaded('records')),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
