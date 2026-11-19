<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Course extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'department_id',
        'programme_id',
        'code',
        'title',
        'description',
        'credits',
        'level',
        'semester_number',
        'status',
        'syllabus',
        'created_by_id',
    ];

    protected function casts(): array
    {
        return [
            'credits' => 'integer',
            'semester_number' => 'integer',
        ];
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function programme(): BelongsTo
    {
        return $this->belongsTo(Programme::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }

    public function instructors(): HasMany
    {
        return $this->hasMany(CourseInstructor::class);
    }

    public function teacherUsers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'course_instructors')
            ->withPivot(['id', 'role', 'academic_session_id'])
            ->withTimestamps();
    }

    public function enrolments(): HasMany
    {
        return $this->hasMany(CourseEnrolment::class);
    }

    public function enrolledStudents(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'course_enrolments')
            ->withPivot(['id', 'academic_session_id', 'semester_id', 'status', 'enrolled_at', 'final_grade'])
            ->withTimestamps();
    }

    public function isTaughtBy(User $user): bool
    {
        return $this->teacherUsers()->where('users.id', $user->id)->exists();
    }

    public function hasStudent(User $user, ?string $academicSessionId = null): bool
    {
        $query = $this->enrolments()->where('user_id', $user->id);
        if ($academicSessionId) {
            $query->where('academic_session_id', $academicSessionId);
        }

        return $query->exists();
    }
}
