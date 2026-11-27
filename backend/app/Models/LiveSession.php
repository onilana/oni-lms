<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

/**
 * @property string $id
 * @property string $title
 */
class LiveSession extends Model
{
    use HasFactory, HasUuids;

    public const PROVIDER_JITSI = 'jitsi';
    public const PROVIDER_ZOOM = 'zoom';
    public const PROVIDER_GOOGLE_MEET = 'google_meet';
    public const PROVIDER_TEAMS = 'teams';
    public const PROVIDER_CUSTOM = 'custom';

    public const STATUS_SCHEDULED = 'scheduled';
    public const STATUS_LIVE = 'live';
    public const STATUS_COMPLETED = 'completed';
    public const STATUS_CANCELLED = 'cancelled';

    protected $fillable = [
        'course_id',
        'academic_session_id',
        'instructor_id',
        'attendance_session_id',
        'title',
        'description',
        'provider',
        'meeting_url',
        'meeting_id',
        'passcode',
        'scheduled_start_at',
        'scheduled_end_at',
        'actual_started_at',
        'actual_ended_at',
        'status',
        'recording_url',
        'settings',
    ];

    protected function casts(): array
    {
        return [
            'scheduled_start_at' => 'datetime',
            'scheduled_end_at' => 'datetime',
            'actual_started_at' => 'datetime',
            'actual_ended_at' => 'datetime',
            'settings' => 'array',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (LiveSession $session) {
            // Default provider is Jitsi if not provided
            if (empty($session->provider)) {
                $session->provider = self::PROVIDER_JITSI;
            }
            // Auto-generate Jitsi Meet URL if empty
            if (empty($session->meeting_url) && $session->provider === self::PROVIDER_JITSI) {
                $safeCourse = $session->course?->code ? Str::slug($session->course->code) : 'class';
                $session->meeting_url = 'https://meet.jit.si/EDU-CARE-' . $safeCourse . '-' . Str::random(10);
            }
        });
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    public function instructor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'instructor_id');
    }

    public function academicSession(): BelongsTo
    {
        return $this->belongsTo(AcademicSession::class);
    }

    public function attendanceSession(): BelongsTo
    {
        return $this->belongsTo(AttendanceSession::class);
    }

    public function scopeScheduled(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_SCHEDULED);
    }

    public function scopeLive(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_LIVE);
    }

    public function scopeUpcoming(Builder $query): Builder
    {
        return $query->whereIn('status', [self::STATUS_SCHEDULED, self::STATUS_LIVE])
            ->where('scheduled_end_at', '>=', now())
            ->orderBy('scheduled_start_at', 'asc');
    }

    public function isJoinable(): bool
    {
        if ($this->status === self::STATUS_LIVE) {
            return true;
        }

        if ($this->status === self::STATUS_SCHEDULED) {
            // Allow joining 15 minutes before scheduled start time
            return now()->between(
                $this->scheduled_start_at->subMinutes(15),
                $this->scheduled_end_at
            );
        }

        return false;
    }

    public function canAccess(User $user): bool
    {
        if ($user->hasRole([Role::SUPER_ADMIN, Role::COLLEGE_ADMIN, Role::DEPT_ADMIN])) {
            return true;
        }

        if ($this->instructor_id === $user->id) {
            return true;
        }

        if ($this->course->isTaughtBy($user)) {
            return true;
        }

        return $this->course->hasStudent($user);
    }
}
