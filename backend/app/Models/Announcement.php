<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Announcement extends Model
{
    use HasFactory, HasUuids;

    public const PRIORITY_LOW = 'low';
    public const PRIORITY_NORMAL = 'normal';
    public const PRIORITY_HIGH = 'high';
    public const PRIORITY_URGENT = 'urgent';

    protected $fillable = [
        'author_id',
        'course_id',
        'department_id',
        'title',
        'content',
        'priority',
        'is_pinned',
        'published_at',
    ];

    protected function casts(): array
    {
        return [
            'is_pinned' => 'boolean',
            'published_at' => 'datetime',
        ];
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function scopePinned(Builder $query): Builder
    {
        return $query->where('is_pinned', true);
    }

    public function scopeForUser(Builder $query, User $user): Builder
    {
        if ($user->hasRole([Role::SUPER_ADMIN, Role::COLLEGE_ADMIN])) {
            return $query;
        }

        // Campus-wide announcements (course_id is null) OR course-specific for enrolled/taught courses
        return $query->where(function ($q) use ($user) {
            $q->whereNull('course_id')
              ->orWhereIn('course_id', function ($sub) use ($user) {
                  $sub->select('course_id')
                      ->from('course_enrolments')
                      ->where('user_id', $user->id)
                      ->where('status', 'active');
              })
              ->orWhereIn('course_id', function ($sub) use ($user) {
                  $sub->select('course_id')
                      ->from('course_instructors')
                      ->where('user_id', $user->id);
              });
        });
    }
}
