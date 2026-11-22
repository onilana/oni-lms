<?php

namespace App\Http\Resources;

use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LiveSessionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $user = $request->user();
        $isInstructorOrAdmin = $user && (
            $this->instructor_id === $user->id ||
            $user->hasRole([Role::SUPER_ADMIN, Role::COLLEGE_ADMIN, Role::DEPT_ADMIN, Role::TEACHER])
        );

        $canAccess = $user && $this->canAccess($user);
        $isJoinable = $this->isJoinable();

        return [
            'id' => $this->id,
            'title' => $this->title,
            'description' => $this->description,
            'provider' => $this->provider,
            'status' => $this->status,
            'scheduled_start_at' => $this->scheduled_start_at?->toISOString(),
            'scheduled_end_at' => $this->scheduled_end_at?->toISOString(),
            'actual_started_at' => $this->actual_started_at?->toISOString(),
            'actual_ended_at' => $this->actual_ended_at?->toISOString(),
            'recording_url' => $this->recording_url,
            'settings' => $this->settings,
            'is_joinable' => $isJoinable,
            'can_access' => $canAccess,
            // Reveal meeting URL and passcode only to authorized users when joinable, or always to instructors/admins
            'meeting_url' => ($isInstructorOrAdmin || ($canAccess && $isJoinable)) ? $this->meeting_url : null,
            'meeting_id' => ($isInstructorOrAdmin || ($canAccess && $isJoinable)) ? $this->meeting_id : null,
            'passcode' => ($isInstructorOrAdmin || ($canAccess && $isJoinable)) ? $this->passcode : null,
            'course' => [
                'id' => $this->course?->id,
                'code' => $this->course?->code,
                'title' => $this->course?->title,
            ],
            'instructor' => [
                'id' => $this->instructor?->id,
                'name' => $this->instructor?->name,
                'email' => $this->instructor?->email,
            ],
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
