<?php

namespace App\Http\Requests\LiveSession;

use Illuminate\Foundation\Http\FormRequest;

class StoreLiveSessionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => 'required|string|max:255',
            'description' => 'nullable|string|max:2000',
            'provider' => 'nullable|string|in:jitsi,zoom,google_meet,teams,custom',
            'meeting_url' => 'nullable|url|max:1000',
            'meeting_id' => 'nullable|string|max:128',
            'passcode' => 'nullable|string|max:64',
            'scheduled_start_at' => 'required|date',
            'scheduled_end_at' => 'required|date|after:scheduled_start_at',
            'settings' => 'nullable|array',
            'link_attendance' => 'nullable|boolean',
        ];
    }
}
