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
class Programme extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'department_id',
        'level',
        'name',
        'code',
        'duration_years',
        'total_semesters',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'duration_years' => 'integer',
            'total_semesters' => 'integer',
        ];
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function departments(): HasMany
    {
        return $this->hasMany(Department::class, 'programme_id');
    }

    public function batches(): HasMany
    {
        return $this->hasMany(Batch::class);
    }

    public function students(): HasMany
    {
        return $this->hasMany(StudentProfile::class);
    }
}
