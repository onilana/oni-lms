<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

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
        if ($this->status === 'evaluated' || $this->status === 'submitted') {
            return;
        }

        $exam = $this->exam()->with('questions')->first();
        if (!$exam) {
            return;
        }

        // Merge submitted answers snapshot if provided
        $responses = $submittedAnswers ?? ($this->answers_snapshot ?? []);

        $totalScore = 0.0;
        $maxPossibleMarks = 0.0;

        foreach ($exam->questions as $question) {
            $questionPoints = (float)($question->pivot->points ?? $question->points ?? 1.0);
            $maxPossibleMarks += $questionPoints;

            $studentResponse = $responses[$question->id] ?? null;
            $isCorrect = $question->evaluateResponse($studentResponse);
            $awarded = $isCorrect ? $questionPoints : 0.0;
            $totalScore += $awarded;

            ExamAttemptAnswer::updateOrCreate(
                [
                    'exam_attempt_id' => $this->id,
                    'question_id' => $question->id,
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
        $isPassed = $percentage >= (float)$exam->passing_percentage;

        $this->update([
            'status' => 'evaluated',
            'submitted_at' => now(),
            'score' => round($totalScore, 2),
            'percentage' => round($percentage, 2),
            'is_passed' => $isPassed,
            'answers_snapshot' => $responses,
        ]);
    }
}
