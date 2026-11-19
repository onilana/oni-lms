<?php

namespace App\Http\Controllers\Api\V1\Academic;

use App\Http\Requests\Academic\BatchRequest;
use App\Http\Resources\Academic\BatchResource;
use App\Models\Batch;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BatchController
{
    public function index(Request $request): JsonResponse
    {
        $query = Batch::query()
            ->with(['programme', 'academicSession'])
            ->withCount('students');

        if ($request->filled('programme_id')) {
            $query->where('programme_id', $request->query('programme_id'));
        }

        if ($request->filled('academic_session_id')) {
            $query->where('academic_session_id', $request->query('academic_session_id'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        $batches = $query->orderBy('name')->get();

        return response()->json([
            'batches' => BatchResource::collection($batches),
        ]);
    }

    public function store(BatchRequest $request): JsonResponse
    {
        $batch = Batch::create($request->validated());
        $batch->load(['programme', 'academicSession']);

        return response()->json([
            'message' => 'Batch created successfully.',
            'batch' => new BatchResource($batch),
        ], 201);
    }

    public function show(Batch $batch): JsonResponse
    {
        $batch->load(['programme', 'academicSession', 'students.user'])
            ->loadCount('students');

        return response()->json([
            'batch' => new BatchResource($batch),
        ]);
    }

    public function update(BatchRequest $request, Batch $batch): JsonResponse
    {
        $batch->update($request->validated());
        $batch->load(['programme', 'academicSession']);

        return response()->json([
            'message' => 'Batch updated successfully.',
            'batch' => new BatchResource($batch),
        ]);
    }

    public function destroy(Batch $batch): JsonResponse
    {
        $batch->delete();

        return response()->json([
            'message' => 'Batch deleted successfully.',
        ]);
    }
}
