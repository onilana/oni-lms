<?php

namespace App\Http\Requests\Exam;

use App\Models\Course;
use App\Models\Question;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class QuestionRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        if (!$user) {
            return false;
        }

        $question = $this->route('question');
        if ($question) {
            return $this->canManageQuestion($question, $user);
        }

        if ($this->hasGlobalBankPermission($user)) {
            return true;
        }

        $course = $this->input('course_id') ? Course::find($this->input('course_id')) : null;

        return $course !== null && $course->isTaughtBy($user);
    }

    public function rules(): array
    {
        return [
            'question_bank_id' => ['nullable', 'uuid', 'exists:question_banks,id'],
            'course_id' => ['nullable', 'uuid', 'exists:courses,id'],
            'question_text' => ['required', 'string'],
            'question_type' => ['required', 'string', 'in:mcq_single,mcq_multiple,true_false,short_answer'],
            'options' => ['nullable', 'array'],
            'options.*.id' => ['required_with:options', 'string'],
            'options.*.text' => ['required_with:options', 'string'],
            'correct_answers' => ['required', 'array', 'min:1'],
            'correct_answers.*' => ['required', 'string'],
            'points' => ['sometimes', 'numeric', 'min:0.5', 'max:100'],
            'explanation' => ['nullable', 'string'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $question = $this->route('question');
            $user = $this->user();

            if (
                $question
                && $user
                && ! $this->hasGlobalBankPermission($user)
                && $this->exists('course_id')
                && $this->input('course_id') !== $question->course_id
            ) {
                $validator->errors()->add('course_id', 'The question course cannot be changed without global question-bank permission.');
            }

            if ($this->input('question_type') === 'mcq_single') {
                $options = $this->input('options', $question?->options ?? []);
                $answers = $this->input('correct_answers', []);
                $optionIds = is_array($options)
                    ? array_map('strval', array_column($options, 'id'))
                    : [];

                if (! is_array($answers) || count($answers) !== 1 || ! in_array((string) ($answers[0] ?? ''), $optionIds, true)) {
                    $validator->errors()->add(
                        'correct_answers',
                        'A single-choice correct answer must reference one of the question options.'
                    );
                }
            }
        });
    }

    private function canManageQuestion(Question $question, User $user): bool
    {
        if ($this->hasGlobalBankPermission($user)) {
            return true;
        }

        return $question->course !== null && $question->course->isTaughtBy($user);
    }

    private function hasGlobalBankPermission(User $user): bool
    {
        return $user->isSuperAdmin() || $user->hasPermission('question_banks.manage');
    }
}
