<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'status' => $this->status,
            'email_verified_at' => $this->email_verified_at?->toIso8601String(),
            'last_login_at' => $this->last_login_at?->toIso8601String(),
            'roles' => RoleResource::collection($this->whenLoaded('roles')),
            'teacher_profile' => $this->whenLoaded('teacherProfile', function () {
                if (!$this->teacherProfile) return null;
                return [
                    'id' => $this->teacherProfile->id,
                    'department_id' => $this->teacherProfile->department_id,
                    'department_name' => $this->teacherProfile->department?->name,
                    'department_code' => $this->teacherProfile->department?->code,
                    'employee_id_number' => $this->teacherProfile->employee_id_number,
                    'designation' => $this->teacherProfile->designation,
                    'qualification' => $this->teacherProfile->qualification,
                ];
            }),
            'student_profile' => $this->whenLoaded('studentProfile', function () {
                if (!$this->studentProfile) return null;
                return [
                    'id' => $this->studentProfile->id,
                    'programme_id' => $this->studentProfile->programme_id,
                    'programme_name' => $this->studentProfile->programme?->name,
                    'programme_code' => $this->studentProfile->programme?->code,
                    'department_id' => $this->studentProfile->programme?->department_id,
                    'department_name' => $this->studentProfile->programme?->department?->name,
                    'department_code' => $this->studentProfile->programme?->department?->code,
                    'batch_id' => $this->studentProfile->batch_id,
                    'batch_name' => $this->studentProfile->batch?->name,
                    'student_id_number' => $this->studentProfile->student_id_number,
                    'current_semester' => $this->studentProfile->current_semester,
                    'date_of_birth' => $this->studentProfile->date_of_birth ? (is_string($this->studentProfile->date_of_birth) ? substr($this->studentProfile->date_of_birth, 0, 10) : $this->studentProfile->date_of_birth->toDateString()) : null,
                    'gender' => $this->studentProfile->gender,
                    'class_roll_no' => $this->studentProfile->class_roll_no,
                    'phone' => $this->studentProfile->phone,
                    'father_name' => $this->studentProfile->father_name,
                    'mother_name' => $this->studentProfile->mother_name,
                    'address' => $this->studentProfile->address,
                    'status' => $this->studentProfile->status,
                    'admission_date' => $this->studentProfile->admission_date ? (is_string($this->studentProfile->admission_date) ? substr($this->studentProfile->admission_date, 0, 10) : $this->studentProfile->admission_date->toDateString()) : null,
                ];
            }),
            'enrolled_courses_count' => $this->enrolled_courses_count ?? 0,
            'taught_courses_count' => $this->taught_courses_count ?? 0,
            'permissions' => $this->whenLoaded('roles', function () {
                if ($this->isSuperAdmin()) {
                    return ['*'];
                }

                return $this->roles
                    ->flatMap(fn ($role) => $role->permissions)
                    ->pluck('name')
                    ->unique()
                    ->values();
            }),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
