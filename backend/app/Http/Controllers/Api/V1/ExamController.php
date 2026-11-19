<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Requests\Exam\AttachQuestionsRequest;
use App\Http\Requests\Exam\ExamRequest;
use App\Http\Resources\Exam\ExamResource;
use App\Models\Course;
use App\Models\Exam;
use App\Models\ExamQuestion;
use App\Models\Question;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ExamController
{
    public function index(Request $request, Course $course): AnonymousResourceCollection
    {
        $user = $request->user();
        $isTeacherOrAdmin = $user && ($course->isTaughtBy($user) || $user->hasPermission('exams.manage') || $user->isSuperAdmin());

        $query = $course->exams();
        if (!$isTeacherOrAdmin) {
            $query->where('is_published', true);
        }

        $exams = $query->with('questions')->get();

        return ExamResource::collection($exams);
    }

    public function show(Request $request, Exam $exam): ExamResource
    {
        $exam->load('questions');
        return new ExamResource($exam);
    }

    public function store(ExamRequest $request, Course $course): JsonResponse
    {
        $data = $request->validated();
        $data['course_id'] = $course->id;
        $data['created_by'] = $request->user()->id;

        $exam = Exam::create($data);

        return response()->json([
            'message' => 'Exam created successfully',
            'data' => new ExamResource($exam),
        ], 201);
    }

    public function update(ExamRequest $request, Exam $exam): JsonResponse
    {
        $exam->update($request->validated());

        return response()->json([
            'message' => 'Exam updated successfully',
            'data' => new ExamResource($exam->fresh(['questions'])),
        ]);
    }

    public function destroy(Request $request, Exam $exam): JsonResponse
    {
        $user = $request->user();
        if (!$exam->course->isTaughtBy($user) && !$user->hasPermission('exams.manage') && !$user->isSuperAdmin()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $exam->delete();

        return response()->json([
            'message' => 'Exam deleted successfully',
        ]);
    }

    public function attachQuestions(AttachQuestionsRequest $request, Exam $exam): JsonResponse
    {
        $questionIds = $request->validated('question_ids');
        $currentMaxOrder = $exam->questions()->max('order_index') ?? 0;

        foreach ($questionIds as $idx => $qId) {
            if (!$exam->questions()->where('questions.id', $qId)->exists()) {
                ExamQuestion::create([
                    'exam_id' => $exam->id,
                    'question_id' => $qId,
                    'order_index' => $currentMaxOrder + $idx + 1,
                ]);
            }
        }

        return response()->json([
            'message' => 'Questions attached to exam successfully',
            'data' => new ExamResource($exam->fresh(['questions'])),
        ]);
    }
}
