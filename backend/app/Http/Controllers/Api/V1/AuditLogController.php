<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\AuditLog;
use App\Models\Role;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditLogController
{
    private function authorizeAdmin(Request $request): void
    {
        $user = $request->user();
        if (!$user || !$user->hasRole([Role::SUPER_ADMIN, Role::COLLEGE_ADMIN])) {
            abort(403, 'Unauthorized. Only administrators can inspect security audit trails.');
        }
    }

    public function index(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $query = AuditLog::with('user:id,name,email')
            ->orderBy('created_at', 'desc');

        if ($request->filled('action')) {
            $query->where('action', 'like', '%' . $request->query('action') . '%');
        }

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->query('user_id'));
        }

        if ($request->filled('search')) {
            $term = $request->query('search');
            $query->where(function ($q) use ($term) {
                $q->where('action', 'like', "%{$term}%")
                  ->orWhere('ip_address', 'like', "%{$term}%")
                  ->orWhereHas('user', fn ($sub) => $sub->where('name', 'like', "%{$term}%")->orWhere('email', 'like', "%{$term}%"));
            });
        }

        $perPage = $request->integer('per_page', 25);
        $logs = $query->paginate($perPage);

        return response()->json($logs);
    }

    public function stats(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $total = AuditLog::count();
        $today = AuditLog::whereDate('created_at', today())->count();

        $byAction = AuditLog::selectRaw('action, count(*) as count')
            ->groupBy('action')
            ->orderByDesc('count')
            ->take(6)
            ->pluck('count', 'action');

        return response()->json([
            'total_events' => $total,
            'today_events' => $today,
            'top_actions' => $byAction,
        ]);
    }
}
