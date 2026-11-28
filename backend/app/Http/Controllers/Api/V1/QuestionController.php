<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Requests\Exam\QuestionRequest;
use App\Http\Resources\Exam\QuestionResource;
use App\Models\Course;
use App\Models\Question;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class QuestionController
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $user = $request->user();
        if (! $user || ($user->hasRole(Role::STUDENT) && ! $user->hasPermission('question_banks.manage'))) {
            abort(403, 'Students cannot browse question banks.');
        }

        $query = Question::query();

        if ($request->filled('course_id')) {
            $course = Course::find($request->query('course_id'));
            if ($course && ! $this->canAccessCourseQuestions($user, $course)) {
                abort(403, 'Unauthorized access to this course question bank.');
            }
            $query->where('course_id', $request->query('course_id'));
        } elseif (! $user->isInstitutionAdmin() && ! $user->hasPermission('question_banks.manage')) {
            if ($user->hasRole([Role::HOD, Role::DEPT_ADMIN])) {
                $deptId = $user->getAssignedDepartmentId();
                $query->whereHas('course', fn ($cq) => $cq->where('department_id', $deptId));
            } elseif ($user->hasRole(Role::TEACHER)) {
                $query->whereHas('course.instructors', fn ($iq) => $iq->where('user_id', $user->id));
            } else {
                abort(403, 'Unauthorized access to question banks.');
            }
        }

        if ($request->filled('question_bank_id')) {
            $query->where('question_bank_id', $request->query('question_bank_id'));
        }

        $questions = $query->with('course')->latest()->get();

        return QuestionResource::collection($questions);
    }

    public function show(Request $request, Question $question): QuestionResource
    {
        $user = $request->user();
        if (! $user || ! $this->canManageQuestion($question, $user)) {
            abort(403, 'Unauthorized access to this question.');
        }

        $question->load('course');
        return new QuestionResource($question);
    }

    private function canAccessCourseQuestions(User $user, Course $course): bool
    {
        if ($user->isInstitutionAdmin() || $user->hasPermission('question_banks.manage')) {
            return true;
        }

        if ($user->hasRole([Role::HOD, Role::DEPT_ADMIN])) {
            return $course->department_id === $user->getAssignedDepartmentId();
        }

        return $course->isTaughtBy($user);
    }

    public function store(QuestionRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['created_by'] = $request->user()->id;

        $question = Question::create($data);

        return response()->json([
            'message' => 'Question created successfully',
            'data' => new QuestionResource($question),
        ], 201);
    }

    public function update(QuestionRequest $request, Question $question): JsonResponse
    {
        $question->update($request->validated());

        return response()->json([
            'message' => 'Question updated successfully',
            'data' => new QuestionResource($question),
        ]);
    }

    public function destroy(Request $request, Question $question): JsonResponse
    {
        $user = $request->user();
        if (! $this->canManageQuestion($question, $user)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        if ($question->exams()->whereHas('attempts')->exists()) {
            return response()->json(['message' => 'Questions used by exam attempts cannot be deleted.'], 409);
        }

        $question->delete();

        return response()->json([
            'message' => 'Question deleted successfully',
        ]);
    }

    private function canManageQuestion(Question $question, User $user): bool
    {
        if ($user->isSuperAdmin() || $user->hasPermission('question_banks.manage')) {
            return true;
        }

        return $question->course !== null && $question->course->isTaughtBy($user);
    }
}
