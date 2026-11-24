<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property string $id
 * @property string $name
 * @property string $code
 */
class Department extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'parent_id',
        'name',
        'code',
        'description',
        'status',
        'head_of_department_id',
    ];

    public function parent(): BelongsTo
    {
        return $this->belongsTo(Department::class, 'parent_id');
    }

    public function subDepartments(): HasMany
    {
        return $this->hasMany(Department::class, 'parent_id');
    }

    public function headOfDepartment(): BelongsTo
    {
        return $this->belongsTo(User::class, 'head_of_department_id');
    }

    public function programmes(): HasMany
    {
        return $this->hasMany(Programme::class);
    }

    public function teachers(): HasMany
    {
        return $this->hasMany(TeacherProfile::class);
    }

    public function courses(): HasMany
    {
        return $this->hasMany(Course::class);
    }
}
