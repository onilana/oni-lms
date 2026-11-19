<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Requests\Exam\QuestionRequest;
use App\Http\Resources\Exam\QuestionResource;
use App\Models\Question;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class QuestionController
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Question::query();

        if ($request->filled('course_id')) {
            $query->where('course_id', $request->query('course_id'));
        }

        if ($request->filled('question_bank_id')) {
            $query->where('question_bank_id', $request->query('question_bank_id'));
        }

        $questions = $query->latest()->get();

        return QuestionResource::collection($questions);
    }

    public function show(Question $question): QuestionResource
    {
        return new QuestionResource($question);
    }

    public function store(QuestionRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['created_by'] = $request->user()->id;

        $question = Question::create($data);

        return response()->json([
            'message' => 'Question created successfully',
            'data' => new QuestionResource($question),
        ], 201);
    }

    public function update(QuestionRequest $request, Question $question): JsonResponse
    {
        $question->update($request->validated());

        return response()->json([
            'message' => 'Question updated successfully',
            'data' => new QuestionResource($question),
        ]);
    }

    public function destroy(Request $request, Question $question): JsonResponse
    {
        $user = $request->user();
        if (!$user->hasPermission('exams.manage') && !$user->hasRole('teacher') && !$user->isSuperAdmin()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $question->delete();

        return response()->json([
            'message' => 'Question deleted successfully',
        ]);
    }
}
