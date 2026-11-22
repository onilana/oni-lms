<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\Role;
use App\Services\AuditService;
use App\Services\WordPressIntegrationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WordPressIntegrationController
{
    public function status(Request $request, WordPressIntegrationService $service): JsonResponse
    {
        $user = $request->user();
        if (!$user->hasRole([Role::SUPER_ADMIN, Role::COLLEGE_ADMIN, Role::DEPT_ADMIN])) {
            return response()->json(['message' => 'Unauthorized to view WordPress integration status.'], 403);
        }

        return response()->json([
            'data' => $service->getConnectionStatus(),
        ]);
    }

    public function catalogue(Request $request, WordPressIntegrationService $service): JsonResponse
    {
        // Public endpoint for WordPress oni_lana theme to fetch published courses
        $courses = $service->getPublicCourseCatalogue();

        return response()->json([
            'source' => 'ONI Learning Management System',
            'count' => count($courses),
            'data' => $courses,
        ]);
    }

    public function syncNotices(Request $request, WordPressIntegrationService $service): JsonResponse
    {
        $user = $request->user();
        if (!$user->hasRole([Role::SUPER_ADMIN, Role::COLLEGE_ADMIN])) {
            return response()->json(['message' => 'Only administrators can sync notices from WordPress.'], 403);
        }

        $mockItems = $request->input('notices', []);
        $result = $service->syncNoticesFromWordPress($mockItems);

        AuditService::log(
            action: 'wordpress.notices_synced',
            user: $user,
            auditableType: 'Announcement',
            newValues: ['synced_count' => $result['synced_count']],
            request: $request
        );

        return response()->json([
            'message' => $result['message'],
            'data' => $result,
        ]);
    }

    public function ssoHandshake(Request $request, WordPressIntegrationService $service): JsonResponse
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'name' => 'required|string|max:255',
            'token' => 'nullable|string',
        ]);

        try {
            $result = $service->handleSsoHandshake(
                email: $validated['email'],
                name: $validated['name'],
                token: $validated['token'] ?? null
            );

            return response()->json($result);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 401);
        }
    }

    public function snippets(Request $request, WordPressIntegrationService $service): JsonResponse
    {
        $user = $request->user();
        if (!$user->hasRole([Role::SUPER_ADMIN, Role::COLLEGE_ADMIN, Role::DEPT_ADMIN])) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        return response()->json([
            'theme_slug' => config('wordpress.theme_slug', 'oni_lana'),
            'snippets' => $service->getWordPressCodeSnippets(),
        ]);
    }
}
