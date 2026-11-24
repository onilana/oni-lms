<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

/**
 * @property string $id
 * @property string $name
 */
class Role extends Model
{
    use HasFactory, HasUuids;

    public const SUPER_ADMIN = 'super_admin';
    public const COLLEGE_ADMIN = 'college_admin';
    public const DEPT_ADMIN = 'dept_admin';
    public const HOD = 'hod';
    public const TEACHER = 'teacher';
    public const STUDENT = 'student';
    public const SUPPORT_STAFF = 'support_staff';

    protected $fillable = [
        'name',
        'label',
        'description',
    ];

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class);
    }

    public function permissions(): BelongsToMany
    {
        return $this->belongsToMany(Permission::class);
    }
}
