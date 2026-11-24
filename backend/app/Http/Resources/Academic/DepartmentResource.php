<?php

namespace App\Http\Resources\Academic;

use App\Http\Resources\UserResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DepartmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'parent_id' => $this->parent_id,
            'parent' => $this->relationLoaded('parent') && $this->parent ? [
                'id' => $this->parent->id,
                'name' => $this->parent->name,
                'code' => $this->parent->code,
            ] : null,
            'sub_departments' => $this->relationLoaded('subDepartments') && $this->subDepartments ? $this->subDepartments->map(fn ($sub) => [
                'id' => $sub->id,
                'name' => $sub->name,
                'code' => $sub->code,
                'status' => $sub->status,
            ]) : [],
            'name' => $this->name,
            'code' => $this->code,
            'description' => $this->description,
            'status' => $this->status,
            'head_of_department' => new UserResource($this->whenLoaded('headOfDepartment')),
            'programmes_count' => $this->whenCounted('programmes'),
            'teachers_count' => $this->whenCounted('teachers'),
            'programmes' => ProgrammeResource::collection($this->whenLoaded('programmes')),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
