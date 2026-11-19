<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ExamAttemptAnswer extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'exam_attempt_id',
        'question_id',
        'student_response',
        'is_correct',
        'score_awarded',
        'graded_at',
    ];

    protected function casts(): array
    {
        return [
            'student_response' => 'array',
            'is_correct' => 'boolean',
            'score_awarded' => 'decimal:2',
            'graded_at' => 'datetime',
        ];
    }

    public function attempt(): BelongsTo
    {
        return $this->belongsTo(ExamAttempt::class, 'exam_attempt_id');
    }

    public function question(): BelongsTo
    {
        return $this->belongsTo(Question::class);
    }
}
