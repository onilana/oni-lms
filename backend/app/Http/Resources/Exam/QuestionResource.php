<?php

namespace App\Http\Resources\Exam;

use App\Models\Course;
use App\Models\Exam;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class QuestionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $user = $request->user();
        $includeSolutions = false;
        if ($this->getAttribute('_include_solutions') !== null) {
            $includeSolutions = (bool) $this->getAttribute('_include_solutions');
        } elseif ($user) {
            $includeSolutions = $user->isSuperAdmin() || $user->hasPermission('question_banks.manage');

            if (! $includeSolutions) {
                if ($this->pivot?->exam_id) {
                    $cacheKey = 'exam-solution-course-'.$this->pivot->exam_id;
                    $cache = $request->attributes->get('_edu_care_exam_solution_cache', []);
                    if (! array_key_exists($cacheKey, $cache)) {
                        $cache[$cacheKey] = Exam::query()
                            ->with('course')
                            ->whereKey($this->pivot->exam_id)
                            ->first()?->course;
                        $request->attributes->set('_edu_care_exam_solution_cache', $cache);
                    }
                    $course = $cache[$cacheKey];
                } else {
                    $course = $this->relationLoaded('course')
                        ? $this->course
                        : ($this->course_id ? Course::find($this->course_id) : null);
                }
                $includeSolutions = $course?->isTaughtBy($user) ?? false;
            }
        }

        return [
            'id' => $this->id,
            'question_bank_id' => $this->question_bank_id,
            'course_id' => $this->course_id,
            'question_text' => $this->question_text,
            'question_type' => $this->question_type,
            'options' => $this->options,
            'points' => (float)$this->points,
            'pivot_points' => $this->whenPivotLoaded('exam_questions', function () {
                return (float)($this->pivot->points ?? $this->points);
            }),
            'order_index' => $this->whenPivotLoaded('exam_questions', function () {
                return $this->pivot->order_index;
            }),
            'correct_answers' => $this->when($includeSolutions, $this->correct_answers),
            'explanation' => $this->when($includeSolutions, $this->explanation),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
