<?php

namespace App\Http\Controllers\Api\V1\Academic;

use App\Http\Requests\Academic\ProgrammeRequest;
use App\Http\Resources\Academic\ProgrammeResource;
use App\Models\Programme;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProgrammeController
{
    public function index(Request $request): JsonResponse
    {
        $query = Programme::query()
            ->with('department')
            ->withCount(['batches', 'students', 'departments']);

        if ($request->filled('level')) {
            $query->where('level', strtolower($request->query('level')));
        }

        if ($request->filled('department_id')) {
            $query->where('department_id', $request->query('department_id'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        $programmes = $query->orderBy('name')->get();

        return response()->json([
            'programmes' => ProgrammeResource::collection($programmes),
        ]);
    }

    public function store(ProgrammeRequest $request): JsonResponse
    {
        $programme = Programme::create($request->validated());
        $programme->load('department');

        return response()->json([
            'message' => 'Programme created successfully.',
            'programme' => new ProgrammeResource($programme),
        ], 201);
    }

    public function show(Programme $programme): JsonResponse
    {
        $programme->load(['department', 'batches'])
            ->loadCount(['batches', 'students']);

        return response()->json([
            'programme' => new ProgrammeResource($programme),
        ]);
    }

    public function update(ProgrammeRequest $request, Programme $programme): JsonResponse
    {
        $programme->update($request->validated());
        $programme->load('department');

        return response()->json([
            'message' => 'Programme updated successfully.',
            'programme' => new ProgrammeResource($programme),
        ]);
    }

    public function destroy(Programme $programme): JsonResponse
    {
        $programme->delete();

        return response()->json([
            'message' => 'Programme deleted successfully.',
        ]);
    }
}
