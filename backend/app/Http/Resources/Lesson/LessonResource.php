<?php

namespace App\Http\Resources\Lesson;

use App\Models\LessonProgress;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LessonResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $user = $request->user();
        $isAccessible = $this->isAccessibleBy($user);

        // Fetch user progress record if authenticated
        $progress = null;
        if ($user) {
            $progressRecord = LessonProgress::where('lesson_id', $this->id)
                ->where('user_id', $user->id)
                ->first();

            if ($progressRecord) {
                $progress = [
                    'is_completed' => (bool) $progressRecord->is_completed,
                    'completed_at' => $progressRecord->completed_at?->toIso8601String(),
                    'last_position_seconds' => $progressRecord->last_position_seconds,
                ];
            }
        }

        return [
            'id' => $this->id,
            'course_id' => $this->course_id,
            'section_id' => $this->section_id,
            'title' => $this->title,
            'type' => $this->type,
            'order_index' => $this->order_index,
            'is_free_preview' => (bool) $this->is_free_preview,
            'is_accessible' => $isAccessible,
            'video_duration_seconds' => $this->video_duration_seconds,
            // Only expose content and stream URLs if user has access!
            'content' => $isAccessible ? $this->content : null,
            'video_url' => $isAccessible ? $this->video_url : null,
            'attachment_name' => $isAccessible ? $this->attachment_name : null,
            'attachment_path' => $isAccessible ? $this->attachment_path : null,
            'status' => $this->status,
            'progress' => $progress,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
