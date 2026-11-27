<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Str;
use Laravel\Sanctum\HasApiTokens;

/**
 * @property string $id
 * @property string $name
 * @property string $email
 */
class User extends Authenticatable
{
    use HasApiTokens, HasFactory, HasUuids, Notifiable;

    protected $fillable = [
        'name',
        'username',
        'email',
        'password',
        'status',
        'must_change_password',
        'last_login_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'must_change_password' => 'boolean',
            'password' => 'hashed',
        ];
    }

    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class);
    }

    public function teacherProfile(): HasOne
    {
        return $this->hasOne(TeacherProfile::class);
    }

    public function studentProfile(): HasOne
    {
        return $this->hasOne(StudentProfile::class);
    }

    public function taughtCourses(): BelongsToMany
    {
        return $this->belongsToMany(Course::class, 'course_instructors')
            ->withPivot(['id', 'role', 'academic_session_id'])
            ->withTimestamps();
    }

    public function enrolledCourses(): BelongsToMany
    {
        return $this->belongsToMany(Course::class, 'course_enrolments')
            ->withPivot(['id', 'academic_session_id', 'semester_id', 'status', 'enrolled_at', 'final_grade'])
            ->withTimestamps();
    }

    public function assignmentSubmissions(): HasMany
    {
        return $this->hasMany(AssignmentSubmission::class);
    }

    public function attendanceRecords(): HasMany
    {
        return $this->hasMany(AttendanceRecord::class, 'student_user_id');
    }

    public function isSuperAdmin(): bool
    {
        return $this->hasRole(Role::SUPER_ADMIN);
    }

    public static function generateUniqueUsername(string $seed, ?string $ignoreUserId = null): string
    {
        $base = strtolower(trim($seed));
        if (str_contains($base, '@')) {
            $base = Str::before($base, '@');
        }
        $base = preg_replace('/[^a-z0-9._-]+/', '_', $base) ?? 'user';
        $base = trim($base, '._-');
        if ($base === '') {
            $base = 'user';
        }
        $base = substr($base, 0, 80);

        $candidate = $base;
        $counter = 1;
        while (static::query()
            ->whereRaw('LOWER(username) = ?', [$candidate])
            ->when($ignoreUserId, fn ($q) => $q->where('id', '!=', $ignoreUserId))
            ->exists()
        ) {
            $candidate = substr($base, 0, 72) . '_' . $counter;
            $counter++;
        }

        return $candidate;
    }

    public function isInstitutionAdmin(): bool
    {
        return $this->hasRole([Role::SUPER_ADMIN, Role::COLLEGE_ADMIN]);
    }

    public function getAssignedDepartmentId(): ?string
    {
        if ($this->teacherProfile && $this->teacherProfile->department_id) {
            return $this->teacherProfile->department_id;
        }

        return Department::where('head_of_department_id', $this->id)->value('id');
    }

    public function hasRole(string|array $roles): bool
    {
        $roleList = is_array($roles) ? $roles : func_get_args();

        return $this->roles->pluck('name')->intersect($roleList)->isNotEmpty();
    }

    public function hasPermission(string $permission): bool
    {
        if ($this->isSuperAdmin()) {
            return true;
        }

        return $this->roles
            ->flatMap(fn (Role $role) => $role->permissions)
            ->pluck('name')
            ->contains($permission);
    }

    public function certificates(): HasMany
    {
        return $this->hasMany(Certificate::class);
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(InAppNotification::class)->orderBy('created_at', 'desc');
    }

    public function taughtLiveSessions(): HasMany
    {
        return $this->hasMany(LiveSession::class, 'instructor_id');
    }

    public function announcements(): HasMany
    {
        return $this->hasMany(Announcement::class, 'author_id');
    }
}
