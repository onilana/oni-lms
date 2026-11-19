<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Requests\Exam\SaveAttemptProgressRequest;
use App\Http\Requests\Exam\SubmitExamAttemptRequest;
use App\Http\Resources\Exam\ExamAttemptResource;
use App\Http\Resources\Exam\QuestionResource;
use App\Models\Exam;
use App\Models\ExamAttempt;
use App\Models\Question;
use App\Models\Role;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ExamAttemptController
{
    public function start(Request $request, Exam $exam): JsonResponse
    {
        $user = $request->user();

        return DB::transaction(function () use ($exam, $user): JsonResponse {
            $exam = Exam::query()->whereKey($exam->id)->lockForUpdate()->with('questions')->firstOrFail();
            $isStaff = $exam->course->isTaughtBy($user)
                || $user->isSuperAdmin()
                || ($user->hasPermission('exams.manage') && ! $user->hasRole(Role::TEACHER));

            if (! $isStaff && ! $exam->course->hasStudent($user)) {
                return response()->json(['message' => 'You must be enrolled in this course to take this examination.'], 403);
            }

            if (! $exam->isOpen() && ! $isStaff) {
                return response()->json(['message' => 'This examination is currently not open.'], 422);
            }

            $activeAttempt = ExamAttempt::query()
                ->where('exam_id', $exam->id)
                ->where('user_id', $user->id)
                ->where('status', 'in_progress')
                ->lockForUpdate()
                ->first();

            if ($activeAttempt) {
                if ($activeAttempt->isExpired()) {
                    $activeAttempt->evaluateAndFinalize();
                } else {
                    return response()->json([
                        'message' => 'Resuming in-progress attempt',
                        'attempt' => new ExamAttemptResource($activeAttempt),
                        'questions' => QuestionResource::collection(
                            $exam->shuffle_questions ? $exam->questions->shuffle() : $exam->questions
                        ),
                    ]);
                }
            }

            $completedAttempts = ExamAttempt::query()
                ->where('exam_id', $exam->id)
                ->where('user_id', $user->id)
                ->whereIn('status', ['submitted', 'evaluated', 'timed_out'])
                ->count();

            if ($completedAttempts >= $exam->max_attempts && ! $isStaff) {
                return response()->json([
                    'message' => 'You have reached the maximum number of attempts for this exam.',
                    'max_attempts' => $exam->max_attempts,
                ], 422);
            }

            $now = now();
            $attemptNumber = (int) ExamAttempt::query()
                ->where('exam_id', $exam->id)
                ->where('user_id', $user->id)
                ->max('attempt_number') + 1;
            $gradingSnapshot = [
                'passing_percentage' => (float) $exam->passing_percentage,
                'questions' => $exam->questions->mapWithKeys(
                    fn (Question $question): array => [
                        $question->id => [
                            'question_type' => $question->question_type,
                            'correct_answers' => $question->correct_answers,
                            'points' => (float) ($question->pivot->points ?? $question->points ?? 1),
                        ],
                    ]
                )->all(),
            ];
            $attempt = ExamAttempt::create([
                'exam_id' => $exam->id,
                'user_id' => $user->id,
                'attempt_number' => $attemptNumber,
                'started_at' => $now,
                'expires_at' => $now->copy()->addMinutes($exam->duration_minutes),
                'status' => 'in_progress',
                'answers_snapshot' => [],
                'grading_snapshot' => $gradingSnapshot,
            ]);

            $questions = $exam->shuffle_questions ? $exam->questions->shuffle() : $exam->questions;

            return response()->json([
                'message' => 'Exam attempt started successfully',
                'attempt' => new ExamAttemptResource($attempt),
                'questions' => QuestionResource::collection($questions),
            ], 201);
        });
    }

    public function saveProgress(SaveAttemptProgressRequest $request, ExamAttempt $attempt): JsonResponse
    {
        $incomingAnswers = $request->validated('answers') ?? [];

        return DB::transaction(function () use ($attempt, $incomingAnswers): JsonResponse {
            $attempt = ExamAttempt::query()->whereKey($attempt->id)->lockForUpdate()->firstOrFail();

            if ($attempt->status !== 'in_progress') {
                return response()->json(['message' => 'This exam attempt is no longer in progress.'], 409);
            }

            if ($attempt->isExpired()) {
                $attempt->evaluateAndFinalize();

                return response()->json([
                    'message' => 'Exam time has expired. Your attempt has been automatically evaluated.',
                    'is_expired' => true,
                    'attempt' => new ExamAttemptResource($attempt->fresh()),
                ], 410);
            }

            $mergedSnapshot = array_merge($attempt->answers_snapshot ?? [], $incomingAnswers);
            $attempt->update(['answers_snapshot' => $mergedSnapshot]);

            return response()->json([
                'message' => 'Attempt progress autosaved',
                'time_remaining_seconds' => $attempt->timeRemainingSeconds(),
            ]);
        });
    }

    public function submit(SubmitExamAttemptRequest $request, ExamAttempt $attempt): JsonResponse
    {
        $submittedAnswers = $request->validated('answers');

        return DB::transaction(function () use ($attempt, $submittedAnswers): JsonResponse {
            $attempt = ExamAttempt::query()->whereKey($attempt->id)->lockForUpdate()->firstOrFail();

            if ($attempt->status === 'evaluated') {
                return response()->json([
                    'message' => 'Exam attempt is already submitted and evaluated',
                    'data' => new ExamAttemptResource($attempt),
                ]);
            }

            if (! in_array($attempt->status, ['in_progress', 'submitted', 'timed_out'], true)) {
                return response()->json(['message' => 'This exam attempt is no longer in progress.'], 409);
            }

            $expired = $attempt->isExpired() || $attempt->status === 'timed_out';
            if ($expired || $attempt->status === 'submitted') {
                $attempt->evaluateAndFinalize();

                $response = [
                    'message' => $expired
                        ? 'Exam time has expired. Your attempt has been automatically evaluated.'
                        : 'Exam attempt submitted and evaluated successfully',
                    'data' => new ExamAttemptResource($attempt->fresh(['answers'])),
                ];

                if ($expired) {
                    $response['is_expired'] = true;
                }

                return response()->json($response, $expired ? 410 : 200);
            }

            $attempt->evaluateAndFinalize($submittedAnswers);

            return response()->json([
                'message' => 'Exam attempt submitted and evaluated successfully',
                'data' => new ExamAttemptResource($attempt->fresh(['answers'])),
            ]);
        });
    }

    public function show(Request $request, ExamAttempt $attempt): JsonResponse
    {
        $user = $request->user();
        $exam = $attempt->exam;

        $isOwner = $attempt->user_id === $user->id;
        $isStaff = $exam->course->isTaughtBy($user)
            || $user->isSuperAdmin()
            || ($user->hasPermission('exams.manage') && ! $user->hasRole(Role::TEACHER));

        if (!$isOwner && !$isStaff) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return response()->json([
            'attempt' => new ExamAttemptResource($attempt->load('answers')),
            'exam' => $exam->title,
        ]);
    }
}
