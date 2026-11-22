<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AiConversation extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'user_id',
        'course_id',
        'title',
        'status',
        'tokens_used',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    public function messages(): HasMany
    {
        return $this->hasMany(AiMessage::class, 'conversation_id')->orderBy('created_at', 'asc');
    }

    public function canAccess(User $user): bool
    {
        if ($user->hasRole([Role::SUPER_ADMIN, Role::COLLEGE_ADMIN])) {
            return true;
        }

        return $this->user_id === $user->id;
    }
}
