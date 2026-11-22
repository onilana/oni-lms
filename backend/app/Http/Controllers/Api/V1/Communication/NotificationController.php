<?php

namespace App\Http\Controllers\Api\V1\Communication;

use App\Http\Resources\InAppNotificationResource;
use App\Models\InAppNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $notifications = InAppNotification::where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->limit(50)
            ->get();

        $unreadCount = InAppNotification::where('user_id', $user->id)
            ->unread()
            ->count();

        return response()->json([
            'unread_count' => $unreadCount,
            'data' => InAppNotificationResource::collection($notifications),
        ]);
    }

    public function markAsRead(InAppNotification $notification, Request $request): JsonResponse
    {
        $user = $request->user();
        if ($notification->user_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $notification->markAsRead();

        return response()->json([
            'message' => 'Notification marked as read.',
            'data' => new InAppNotificationResource($notification),
        ]);
    }

    public function markAllAsRead(Request $request): JsonResponse
    {
        $user = $request->user();

        InAppNotification::where('user_id', $user->id)
            ->unread()
            ->update([
                'is_read' => true,
                'read_at' => now(),
            ]);

        return response()->json([
            'message' => 'All notifications marked as read.',
        ]);
    }
}
