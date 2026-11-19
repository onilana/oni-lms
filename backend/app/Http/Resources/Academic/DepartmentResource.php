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
