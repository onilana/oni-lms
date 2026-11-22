<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiDocumentChunk extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'document_id',
        'chunk_index',
        'content',
        'source_reference',
    ];

    public function document(): BelongsTo
    {
        return $this->belongsTo(AiDocument::class, 'document_id');
    }
}
