<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;

class ExamAttempt extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'exam_id',
        'user_id',
        'attempt_number',
        'started_at',
        'expires_at',
        'submitted_at',
        'status',
        'score',
        'percentage',
        'is_passed',
        'answers_snapshot',
        'grading_snapshot',
    ];

    protected function casts(): array
    {
        return [
            'attempt_number' => 'integer',
            'started_at' => 'datetime',
            'expires_at' => 'datetime',
            'submitted_at' => 'datetime',
            'score' => 'decimal:2',
            'percentage' => 'decimal:2',
            'is_passed' => 'boolean',
            'answers_snapshot' => 'array',
            'grading_snapshot' => 'array',
        ];
    }

    public function exam(): BelongsTo
    {
        return $this->belongsTo(Exam::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function answers(): HasMany
    {
        return $this->hasMany(ExamAttemptAnswer::class);
    }

    public function isExpired(): bool
    {
        return now()->gt($this->expires_at);
    }

    public function timeRemainingSeconds(): int
    {
        if ($this->status !== 'in_progress') {
            return 0;
        }

        $diff = now()->diffInSeconds($this->expires_at, false);
        return max(0, (int)$diff);
    }

    /**
     * Server-side authoritative evaluation and scoring of the attempt.
     */
    public function evaluateAndFinalize(?array $submittedAnswers = null): void
    {
        DB::transaction(function () use ($submittedAnswers): void {
            $attempt = static::query()->whereKey($this->getKey())->lockForUpdate()->first();
            if (! $attempt || $attempt->status === 'evaluated') {
                return;
            }

            if (! in_array($attempt->status, ['in_progress', 'submitted', 'timed_out'], true)) {
                return;
            }

            $responses = $attempt->answers_snapshot ?? [];
            if (! $attempt->isExpired() && $submittedAnswers !== null) {
                $responses = array_merge($responses, $submittedAnswers);
            }
            $gradingSnapshot = $attempt->grading_snapshot;
            $questions = $gradingSnapshot['questions'] ?? null;

            if (! is_array($questions)) {
                $exam = $attempt->exam()->with('questions')->first();
                if (! $exam) {
                    return;
                }

                $questions = $exam->questions->mapWithKeys(
                    fn (Question $question): array => [
                        $question->id => [
                            'question_type' => $question->question_type,
                            'correct_answers' => $question->correct_answers,
                            'points' => (float) ($question->pivot->points ?? $question->points ?? 1),
                        ],
                    ]
                )->all();
                $passingPercentage = (float) $exam->passing_percentage;
            } else {
                $passingPercentage = (float) ($gradingSnapshot['passing_percentage'] ?? $attempt->exam->passing_percentage);
            }

            $totalScore = 0.0;
            $maxPossibleMarks = 0.0;

            foreach ($questions as $questionId => $questionData) {
                $questionPoints = (float) ($questionData['points'] ?? 1.0);
                $maxPossibleMarks += $questionPoints;
                $studentResponse = $responses[$questionId] ?? null;
                $question = new Question;
                $question->forceFill([
                    'question_type' => $questionData['question_type'],
                    'correct_answers' => $questionData['correct_answers'],
                ]);
                $isCorrect = $question->evaluateResponse($studentResponse);
                $awarded = $isCorrect ? $questionPoints : 0.0;
                $totalScore += $awarded;

                ExamAttemptAnswer::updateOrCreate(
                    [
                        'exam_attempt_id' => $attempt->id,
                        'question_id' => $questionId,
                    ],
                    [
                        'student_response' => $studentResponse,
                        'is_correct' => $isCorrect,
                        'score_awarded' => $awarded,
                        'graded_at' => now(),
                    ]
                );
            }

            $percentage = $maxPossibleMarks > 0 ? ($totalScore / $maxPossibleMarks) * 100 : 0.0;
            $attempt->update([
                'status' => 'evaluated',
                'submitted_at' => $attempt->submitted_at ?? now(),
                'score' => round($totalScore, 2),
                'percentage' => round($percentage, 2),
                'is_passed' => $percentage >= $passingPercentage,
                'answers_snapshot' => $responses,
            ]);
        });

        $this->refresh();
    }
}
