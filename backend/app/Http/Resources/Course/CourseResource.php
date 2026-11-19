<?php

namespace App\Http\Resources\Course;

use App\Http\Resources\Academic\DepartmentResource;
use App\Http\Resources\Academic\ProgrammeResource;
use App\Http\Resources\UserResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CourseResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $user = $request->user();
        $isEnrolled = false;
        if ($user) {
            $isEnrolled = $this->enrolments->contains('user_id', $user->id);
        }

        return [
            'id' => $this->id,
            'department_id' => $this->department_id,
            'department' => new DepartmentResource($this->whenLoaded('department')),
            'programme_id' => $this->programme_id,
            'programme' => new ProgrammeResource($this->whenLoaded('programme')),
            'code' => $this->code,
            'title' => $this->title,
            'description' => $this->description,
            'credits' => $this->credits,
            'level' => $this->level,
            'semester_number' => $this->semester_number,
            'status' => $this->status,
            'syllabus' => $this->syllabus,
            'creator' => new UserResource($this->whenLoaded('creator')),
            'instructors' => CourseInstructorResource::collection($this->whenLoaded('instructors')),
            'enrolments_count' => $this->whenCounted('enrolments'),
            'is_enrolled' => $isEnrolled,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
