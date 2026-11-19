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

    public function sections(): HasMany
    {
        return $this->hasMany(CourseSection::class)->orderBy('order_index');
    }

    public function lessons(): HasMany
    {
        return $this->hasMany(Lesson::class)->orderBy('order_index');
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(Assignment::class)->orderBy('due_date');
    }

    public function exams(): HasMany
    {
        return $this->hasMany(Exam::class)->orderBy('created_at', 'desc');
    }

    public function questions(): HasMany
    {
        return $this->hasMany(Question::class)->orderBy('created_at', 'desc');
    }

    public function calculateProgressFor(User $user): array
    {
        $totalLessons = $this->lessons()->where('status', 'published')->count();
        if ($totalLessons === 0) {
            return [
                'total_lessons' => 0,
                'completed_lessons' => 0,
                'percentage' => 0,
            ];
        }

        $completedLessons = LessonProgress::where('course_id', $this->id)
            ->where('user_id', $user->id)
            ->where('is_completed', true)
            ->whereHas('lesson', fn ($query) => $query->where('status', 'published'))
            ->count();

        $percentage = (int) round(($completedLessons / $totalLessons) * 100);

        return [
            'total_lessons' => $totalLessons,
            'completed_lessons' => $completedLessons,
            'percentage' => min(100, $percentage),
        ];
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
