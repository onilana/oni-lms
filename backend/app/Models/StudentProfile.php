<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property string $id
 * @property string $user_id
 * @property string $student_id_number
 * @property ?string $date_of_birth
 * @property ?string $gender
 * @property ?string $class_roll_no
 * @property ?string $phone
 * @property ?string $father_name
 * @property ?string $mother_name
 * @property ?string $address
 */
class StudentProfile extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'user_id',
        'programme_id',
        'batch_id',
        'student_id_number',
        'admission_date',
        'current_semester',
        'status',
        'date_of_birth',
        'gender',
        'class_roll_no',
        'phone',
        'father_name',
        'mother_name',
        'address',
    ];

    protected function casts(): array
    {
        return [
            'admission_date' => 'date',
            'date_of_birth' => 'date',
            'current_semester' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function programme(): BelongsTo
    {
        return $this->belongsTo(Programme::class);
    }

    public function batch(): BelongsTo
    {
        return $this->belongsTo(Batch::class);
    }
}
