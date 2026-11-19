<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Lesson extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'course_id',
        'section_id',
        'title',
        'type',
        'content',
        'video_url',
        'video_duration_seconds',
        'attachment_path',
        'attachment_name',
        'order_index',
        'is_free_preview',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'order_index' => 'integer',
            'video_duration_seconds' => 'integer',
            'is_free_preview' => 'boolean',
        ];
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    public function section(): BelongsTo
    {
        return $this->belongsTo(CourseSection::class, 'section_id');
    }

    public function progressRecords(): HasMany
    {
        return $this->hasMany(LessonProgress::class);
    }

    public function isAccessibleBy(?User $user): bool
    {
        if ($user && ($user->isSuperAdmin() || $this->course->isTaughtBy($user))) {
            return true;
        }

        if ($this->status !== 'published') {
            return false;
        }

        if ($this->is_free_preview) {
            return true;
        }

        return $user !== null && $this->course->hasStudent($user);
    }
}
