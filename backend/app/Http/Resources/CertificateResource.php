<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CertificateResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'certificate_code' => $this->certificate_code,
            'title' => $this->title,
            'grade' => $this->grade,
            'final_score' => $this->final_score !== null ? (float) $this->final_score : null,
            'attendance_percentage' => $this->attendance_percentage !== null ? (float) $this->attendance_percentage : null,
            'lessons_completed_count' => $this->lessons_completed_count,
            'issued_at' => $this->issued_at?->toISOString(),
            'is_revoked' => (bool) $this->is_revoked,
            'revoked_at' => $this->revoked_at?->toISOString(),
            'revocation_reason' => $this->revocation_reason,
            'student' => [
                'id' => $this->user?->id,
                'name' => $this->user?->name,
                'email' => $this->user?->email,
            ],
            'course' => [
                'id' => $this->course?->id,
                'code' => $this->course?->code,
                'title' => $this->course?->title,
                'credits' => $this->course?->credits,
            ],
            'issuer' => $this->issuedBy ? [
                'id' => $this->issuedBy->id,
                'name' => $this->issuedBy->name,
            ] : null,
            'metadata' => $this->metadata,
            'verification_url' => url("/api/v1/certificates/verify/{$this->certificate_code}"),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
