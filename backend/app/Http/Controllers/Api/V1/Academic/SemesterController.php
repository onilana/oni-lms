<?php

namespace App\Http\Controllers\Api\V1\Academic;

use App\Http\Requests\Academic\SemesterRequest;
use App\Http\Resources\Academic\SemesterResource;
use App\Models\Semester;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SemesterController
{
    public function index(Request $request): JsonResponse
    {
        $query = Semester::query()->with('academicSession');

        if ($request->filled('academic_session_id')) {
            $query->where('academic_session_id', $request->query('academic_session_id'));
        }

        if ($request->filled('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $semesters = $query->orderBy('semester_number')->get();

        return response()->json([
            'semesters' => SemesterResource::collection($semesters),
        ]);
    }

    public function store(SemesterRequest $request): JsonResponse
    {
        $semester = Semester::create($request->validated());
        $semester->load('academicSession');

        return response()->json([
            'message' => 'Semester created successfully.',
            'semester' => new SemesterResource($semester),
        ], 201);
    }

    public function show(Semester $semester): JsonResponse
    {
        $semester->load('academicSession');

        return response()->json([
            'semester' => new SemesterResource($semester),
        ]);
    }

    public function update(SemesterRequest $request, Semester $semester): JsonResponse
    {
        $semester->update($request->validated());
        $semester->load('academicSession');

        return response()->json([
            'message' => 'Semester updated successfully.',
            'semester' => new SemesterResource($semester),
        ]);
    }

    public function toggleActive(Semester $semester): JsonResponse
    {
        $semester->update(['is_active' => ! $semester->is_active]);

        return response()->json([
            'message' => 'Semester active state toggled.',
            'semester' => new SemesterResource($semester),
        ]);
    }

    public function destroy(Semester $semester): JsonResponse
    {
        $semester->delete();

        return response()->json([
            'message' => 'Semester deleted successfully.',
        ]);
    }
}
