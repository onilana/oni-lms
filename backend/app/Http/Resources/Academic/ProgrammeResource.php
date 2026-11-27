<?php

namespace App\Http\Resources\Academic;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProgrammeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'level' => $this->level ?? 'ug',
            'department_id' => $this->department_id,
            'department_name' => $this->department?->name,
            'name' => $this->name,
            'code' => $this->code,
            'duration_years' => $this->duration_years,
            'total_semesters' => $this->total_semesters,
            'status' => $this->status,
            'departments_count' => $this->whenCounted('departments'),
            'batches_count' => $this->whenCounted('batches'),
            'students_count' => $this->whenCounted('students'),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
