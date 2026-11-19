<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Question extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'question_bank_id',
        'course_id',
        'question_text',
        'question_type',
        'options',
        'correct_answers',
        'points',
        'explanation',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'options' => 'array',
            'correct_answers' => 'array',
            'points' => 'decimal:2',
        ];
    }

    public function questionBank(): BelongsTo
    {
        return $this->belongsTo(QuestionBank::class);
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function exams(): BelongsToMany
    {
        return $this->belongsToMany(Exam::class, 'exam_questions')
            ->using(ExamQuestion::class)
            ->withPivot('id', 'order_index', 'points')
            ->withTimestamps();
    }

    /**
     * Server-side grading of student response against correct answers.
     */
    public function evaluateResponse(mixed $response): bool
    {
        if ($response === null || $response === '') {
            return false;
        }

        $correct = $this->correct_answers ?? [];

        switch ($this->question_type) {
            case 'mcq_single':
            case 'true_false':
                $studentVal = is_array($response) ? ($response[0] ?? null) : $response;
                $expectedVal = is_array($correct) ? ($correct[0] ?? null) : $correct;
                return (string)$studentVal === (string)$expectedVal;

            case 'mcq_multiple':
                if (!is_array($response) || !is_array($correct)) {
                    return false;
                }
                $r = array_values(array_map('strval', $response));
                $c = array_values(array_map('strval', $correct));
                sort($r);
                sort($c);
                return $r === $c;

            case 'short_answer':
                $studentStr = trim(strtolower((string)(is_array($response) ? ($response[0] ?? '') : $response)));
                foreach ($correct as $ans) {
                    if (trim(strtolower((string)$ans)) === $studentStr) {
                        return true;
                    }
                }
                return false;

            default:
                return false;
        }
    }
}
