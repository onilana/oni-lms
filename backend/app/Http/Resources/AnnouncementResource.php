<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AnnouncementResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'content' => $this->content,
            'priority' => $this->priority,
            'is_pinned' => (bool) $this->is_pinned,
            'published_at' => $this->published_at?->toISOString(),
            'scope' => $this->course_id ? 'course' : ($this->department_id ? 'department' : 'campus'),
            'course' => $this->course ? [
                'id' => $this->course->id,
                'code' => $this->course->code,
                'title' => $this->course->title,
            ] : null,
            'department' => $this->department ? [
                'id' => $this->department->id,
                'code' => $this->department->code,
                'name' => $this->department->name,
            ] : null,
            'author' => [
                'id' => $this->author?->id,
                'name' => $this->author?->name,
            ],
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
