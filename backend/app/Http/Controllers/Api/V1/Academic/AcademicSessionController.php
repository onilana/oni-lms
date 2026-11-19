<?php

namespace App\Http\Controllers\Api\V1\Academic;

use App\Http\Requests\Academic\AcademicSessionRequest;
use App\Http\Resources\Academic\AcademicSessionResource;
use App\Models\AcademicSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AcademicSessionController
{
    public function index(Request $request): JsonResponse
    {
        $query = AcademicSession::query()
            ->with('semesters')
            ->orderByDesc('start_date');

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        $sessions = $query->get();

        return response()->json([
            'sessions' => AcademicSessionResource::collection($sessions),
        ]);
    }

    public function store(AcademicSessionRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $isCurrent = $validated['is_current'] ?? false;
        unset($validated['is_current']);

        $session = AcademicSession::create($validated);

        if ($isCurrent) {
            $session->makeCurrent();
        }

        return response()->json([
            'message' => 'Academic session created successfully.',
            'session' => new AcademicSessionResource($session),
        ], 201);
    }

    public function show(AcademicSession $session): JsonResponse
    {
        $session->load('semesters');

        return response()->json([
            'session' => new AcademicSessionResource($session),
        ]);
    }

    public function update(AcademicSessionRequest $request, AcademicSession $session): JsonResponse
    {
        $validated = $request->validated();
        $isCurrent = $validated['is_current'] ?? null;
        unset($validated['is_current']);

        $session->update($validated);

        if ($isCurrent === true) {
            $session->makeCurrent();
        } elseif ($isCurrent === false && $session->is_current) {
            $session->update(['is_current' => false]);
        }

        return response()->json([
            'message' => 'Academic session updated successfully.',
            'session' => new AcademicSessionResource($session->fresh('semesters')),
        ]);
    }

    public function makeCurrent(AcademicSession $session): JsonResponse
    {
        $session->makeCurrent();

        return response()->json([
            'message' => 'Academic session marked as current.',
            'session' => new AcademicSessionResource($session),
        ]);
    }

    public function destroy(AcademicSession $session): JsonResponse
    {
        $session->delete();

        return response()->json([
            'message' => 'Academic session deleted successfully.',
        ]);
    }
}
