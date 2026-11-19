<?php

namespace App\Http\Resources\Lesson;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CourseProgressResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'course_id' => $this->resource['course_id'],
            'total_lessons' => $this->resource['total_lessons'],
            'completed_lessons' => $this->resource['completed_lessons'],
            'percentage' => $this->resource['percentage'],
        ];
    }
}
