<?php

namespace App\Http\Resources\Course;

use App\Http\Resources\UserResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CourseInstructorResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'role' => $this->role,
            'user' => new UserResource($this->whenLoaded('user')),
            'academic_session_id' => $this->academic_session_id,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
