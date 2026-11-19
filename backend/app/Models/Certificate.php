<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class Certificate extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'certificate_code',
        'user_id',
        'course_id',
        'academic_session_id',
        'issued_by_id',
        'issued_at',
        'title',
        'grade',
        'final_score',
        'attendance_percentage',
        'lessons_completed_count',
        'metadata',
        'is_revoked',
        'revoked_at',
        'revoked_by_id',
        'revocation_reason',
    ];

    protected function casts(): array
    {
        return [
            'issued_at' => 'datetime',
            'revoked_at' => 'datetime',
            'final_score' => 'decimal:2',
            'attendance_percentage' => 'decimal:2',
            'lessons_completed_count' => 'integer',
            'metadata' => 'array',
            'is_revoked' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Certificate $certificate) {
            if (empty($certificate->certificate_code)) {
                $certificate->certificate_code = self::generateUniqueCode();
            }
            if (empty($certificate->issued_at)) {
                $certificate->issued_at = now();
            }
        });
    }

    public static function generateUniqueCode(): string
    {
        do {
            $year = date('Y');
            $part1 = strtoupper(Str::random(4));
            $part2 = strtoupper(Str::random(4));
            $code = "ONI-{$year}-{$part1}-{$part2}";
        } while (self::where('certificate_code', $code)->exists());

        return $code;
    }

    public function scopeValid(Builder $query): Builder
    {
        return $query->where('is_revoked', false);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    public function academicSession(): BelongsTo
    {
        return $this->belongsTo(AcademicSession::class);
    }

    public function issuedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'issued_by_id');
    }

    public function revokedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'revoked_by_id');
    }

    public function revoke(User $actor, string $reason): void
    {
        $this->update([
            'is_revoked' => true,
            'revoked_at' => now(),
            'revoked_by_id' => $actor->id,
            'revocation_reason' => $reason,
        ]);
    }
}
