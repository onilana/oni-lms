<?php

namespace App\Http\Requests\Exam;

use App\Models\Question;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class AttachQuestionsRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        if (!$user) {
            return false;
        }

        $exam = $this->route('exam');
        if ($exam && (
            $exam->course->isTaughtBy($user)
            || $user->isSuperAdmin()
            || ($user->hasPermission('exams.manage') && ! $user->hasRole('teacher'))
        )) {
            return true;
        }

        return false;
    }

    public function rules(): array
    {
        return [
            'question_ids' => ['required', 'array', 'min:1'],
            'question_ids.*' => ['uuid', 'exists:questions,id'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $exam = $this->route('exam');
            if (! $exam) {
                return;
            }

            $exam->loadMissing('course.department');
            $questionIds = array_values(array_filter((array) $this->input('question_ids', [])));
            $questions = Question::with('questionBank')
                ->whereIn('id', $questionIds)
                ->get()
                ->keyBy('id');

            foreach ((array) $this->input('question_ids', []) as $index => $questionId) {
                $question = $questions->get($questionId);
                if (! $question) {
                    continue;
                }

                $courseMatches = ! $question->course_id || $question->course_id === $exam->course_id;
                $bankDepartmentId = $question->questionBank?->department_id;
                $departmentMatches = $bankDepartmentId === null
                    || $bankDepartmentId === $exam->course->department_id;

                if (! $courseMatches || ! $departmentMatches) {
                    $validator->errors()->add(
                        "question_ids.{$index}",
                        'The selected question is not available to this exam course.'
                    );
                }
            }
        });
    }
}
