<?php

namespace App\Http\Controllers\Api\V1\Academic;

use App\Http\Requests\Academic\DepartmentRequest;
use App\Http\Resources\Academic\DepartmentResource;
use App\Models\Department;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DepartmentController
{
    public function index(Request $request): JsonResponse
    {
        $query = Department::query()
            ->withCount(['programmes', 'teachers'])
            ->with(['headOfDepartment', 'parent', 'subDepartments']);

        if ($request->has('status')) {
            $query->where('status', $request->query('status'));
        }

        $departments = $query->orderBy('name')->get();

        return response()->json([
            'departments' => DepartmentResource::collection($departments),
        ]);
    }

    public function store(DepartmentRequest $request): JsonResponse
    {
        $department = Department::create($request->validated());
        $department->load(['headOfDepartment', 'parent', 'subDepartments']);

        return response()->json([
            'message' => 'Department created successfully.',
            'department' => new DepartmentResource($department),
        ], 201);
    }

    public function show(Department $department): JsonResponse
    {
        $department->load(['headOfDepartment', 'programmes', 'parent', 'subDepartments'])
            ->loadCount(['programmes', 'teachers']);

        return response()->json([
            'department' => new DepartmentResource($department),
        ]);
    }

    public function update(DepartmentRequest $request, Department $department): JsonResponse
    {
        $department->update($request->validated());
        $department->load(['headOfDepartment', 'parent', 'subDepartments']);

        return response()->json([
            'message' => 'Department updated successfully.',
            'department' => new DepartmentResource($department),
        ]);
    }

    public function destroy(Department $department): JsonResponse
    {
        $department->delete();

        return response()->json([
            'message' => 'Department deleted successfully.',
        ]);
    }
}
