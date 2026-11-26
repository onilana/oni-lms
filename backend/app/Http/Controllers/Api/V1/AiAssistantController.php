<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\AiConversation;
use App\Models\AiDocument;
use App\Models\Course;
use App\Models\Role;
use App\Services\AiAssistantService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AiAssistantController
{
    public function indexConversations(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = AiConversation::with(['course:id,code,title'])
            ->where('user_id', $user->id)
            ->orderBy('updated_at', 'desc');

        if ($request->has('course_id')) {
            $query->where('course_id', $request->input('course_id'));
        }

        $conversations = $query->get();

        return response()->json([
            'data' => $conversations,
        ]);
    }

    public function storeConversation(Request $request, AiAssistantService $service): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'course_id' => 'required|uuid|exists:courses,id',
            'title' => 'nullable|string|max:255',
        ]);

        $course = Course::findOrFail($validated['course_id']);

        if (!$service->canAccessCourseAi($user, $course)) {
            return response()->json([
                'message' => 'Access denied. You must be enrolled in or instruct this course to use the AI Assistant.',
            ], 403);
        }

        $conversation = $service->createConversation($user, $course, $validated['title'] ?? null);

        return response()->json([
            'message' => 'AI study session initialized.',
            'data' => $conversation->load(['course:id,code,title', 'messages']),
        ], 201);
    }

    public function showConversation(AiConversation $conversation, Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$conversation->canAccess($user)) {
            return response()->json(['message' => 'Unauthorized access to this conversation.'], 403);
        }

        return response()->json([
            'data' => $conversation->load(['course:id,code,title', 'messages']),
        ]);
    }

    public function sendMessage(AiConversation $conversation, Request $request, AiAssistantService $service): JsonResponse
    {
        $user = $request->user();

        if (!$conversation->canAccess($user)) {
            return response()->json(['message' => 'Unauthorized access to this conversation.'], 403);
        }

        $validated = $request->validate([
            'message' => 'required|string|max:3000',
        ]);

        $assistantMessage = $service->sendMessage($conversation, $user, $validated['message']);

        return response()->json([
            'message' => 'AI response generated.',
            'data' => $assistantMessage,
        ]);
    }

    public function indexDocument(Request $request, AiAssistantService $service): JsonResponse
    {
        $user = $request->user();

        if (!$user->hasRole([Role::SUPER_ADMIN, Role::COLLEGE_ADMIN, Role::TEACHER])) {
            return response()->json(['message' => 'Only instructors and administrators can index documents.'], 403);
        }

        $validated = $request->validate([
            'course_id' => 'required|uuid|exists:courses,id',
        ]);

        $course = Course::findOrFail($validated['course_id']);
        $service->ensureCourseIndexed($course);

        $docCount = AiDocument::where('course_id', $course->id)->count();

        return response()->json([
            'message' => 'Course syllabus and lesson modules indexed for permission-aware AI retrieval.',
            'indexed_documents_count' => $docCount,
        ]);
    }

    public function usageStats(Request $request): JsonResponse
    {
        $user = $request->user();

        $totalTokens = AiConversation::where('user_id', $user->id)->sum('tokens_used');
        $conversationsCount = AiConversation::where('user_id', $user->id)->count();

        return response()->json([
            'data' => [
                'total_conversations' => $conversationsCount,
                'total_tokens_consumed' => (int) $totalTokens,
                'model_name' => 'oni-rag-tutor-v1',
                'quota_limit' => 500000,
                'remaining_quota' => max(0, 500000 - (int) $totalTokens),
            ],
        ]);
    }
}
