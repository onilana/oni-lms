<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Requests\Exam\SaveAttemptProgressRequest;
use App\Http\Requests\Exam\SubmitExamAttemptRequest;
use App\Http\Resources\Exam\ExamAttemptResource;
use App\Http\Resources\Exam\QuestionResource;
use App\Models\Exam;
use App\Models\ExamAttempt;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExamAttemptController
{
    public function start(Request $request, Exam $exam): JsonResponse
    {
        $user = $request->user();

        // 1. Check permissions / enrollment
        $isStaff = $exam->course->isTaughtBy($user) || $user->hasPermission('exams.manage') || $user->isSuperAdmin();
        $isEnrolled = $exam->course->hasStudent($user);

        if (!$isStaff && !$isEnrolled) {
            return response()->json(['message' => 'You must be enrolled in this course to take this examination.'], 403);
        }

        // 2. Check if exam is open
        if (!$exam->isOpen() && !$isStaff) {
            return response()->json(['message' => 'This examination is currently not open.'], 422);
        }

        // 3. Check for existing in_progress attempt
        $activeAttempt = ExamAttempt::where('exam_id', $exam->id)
            ->where('user_id', $user->id)
            ->where('status', 'in_progress')
            ->first();

        if ($activeAttempt) {
            if ($activeAttempt->isExpired()) {
                // Auto finalize expired attempt
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

        // 4. Check attempts count
        $completedAttempts = ExamAttempt::where('exam_id', $exam->id)
            ->where('user_id', $user->id)
            ->whereIn('status', ['submitted', 'evaluated', 'timed_out'])
            ->count();

        if ($completedAttempts >= $exam->max_attempts && !$isStaff) {
            return response()->json([
                'message' => 'You have reached the maximum number of attempts for this exam.',
                'max_attempts' => $exam->max_attempts,
            ], 422);
        }

        // 5. Create fresh attempt
        $now = now();
        $expiresAt = $now->copy()->addMinutes($exam->duration_minutes);

        $attempt = ExamAttempt::create([
            'exam_id' => $exam->id,
            'user_id' => $user->id,
            'attempt_number' => $completedAttempts + 1,
            'started_at' => $now,
            'expires_at' => $expiresAt,
            'status' => 'in_progress',
            'answers_snapshot' => [],
        ]);

        $questions = $exam->shuffle_questions ? $exam->questions->shuffle() : $exam->questions;

        return response()->json([
            'message' => 'Exam attempt started successfully',
            'attempt' => new ExamAttemptResource($attempt),
            'questions' => QuestionResource::collection($questions),
        ], 201);
    }

    public function saveProgress(SaveAttemptProgressRequest $request, ExamAttempt $attempt): JsonResponse
    {
        // Server authoritative timer check
        if ($attempt->isExpired()) {
            $attempt->evaluateAndFinalize();
            return response()->json([
                'message' => 'Exam time has expired. Your attempt has been automatically evaluated.',
                'is_expired' => true,
                'attempt' => new ExamAttemptResource($attempt->fresh()),
            ], 410);
        }

        $incomingAnswers = $request->validated('answers') ?? [];
        $existingSnapshot = $attempt->answers_snapshot ?? [];
        $mergedSnapshot = array_merge($existingSnapshot, $incomingAnswers);

        $attempt->update([
            'answers_snapshot' => $mergedSnapshot,
        ]);

        return response()->json([
            'message' => 'Attempt progress autosaved',
            'time_remaining_seconds' => $attempt->timeRemainingSeconds(),
        ]);
    }

    public function submit(SubmitExamAttemptRequest $request, ExamAttempt $attempt): JsonResponse
    {
        // Idempotent submission: if already evaluated, return current status
        if ($attempt->status === 'evaluated') {
            return response()->json([
                'message' => 'Exam attempt is already submitted and evaluated',
                'data' => new ExamAttemptResource($attempt),
            ]);
        }

        $submittedAnswers = $request->validated('answers');
        $attempt->evaluateAndFinalize($submittedAnswers);

        return response()->json([
            'message' => 'Exam attempt submitted and evaluated successfully',
            'data' => new ExamAttemptResource($attempt->fresh(['answers'])),
        ]);
    }

    public function show(Request $request, ExamAttempt $attempt): JsonResponse
    {
        $user = $request->user();
        $exam = $attempt->exam;

        $isOwner = $attempt->user_id === $user->id;
        $isStaff = $exam->course->isTaughtBy($user) || $user->hasPermission('exams.manage') || $user->isSuperAdmin();

        if (!$isOwner && !$isStaff) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return response()->json([
            'attempt' => new ExamAttemptResource($attempt->load('answers')),
            'exam' => $exam->title,
        ]);
    }
}
