<?php

namespace App\Policies;

use App\Models\Course;
use App\Models\Exam;
use App\Models\Role;
use App\Models\User;

class ExamPolicy
{
    public function view(User $user, Exam $exam): bool
    {
        return $exam->is_published || $this->manageCourse($user, $exam->course);
    }

    public function delete(User $user, Exam $exam): bool
    {
        return $this->manageCourse($user, $exam->course);
    }

    public function manageCourse(User $user, Course $course): bool
    {
        return $course->isTaughtBy($user)
            || $user->isSuperAdmin()
            || ($user->hasPermission('exams.manage') && ! $user->hasRole(Role::TEACHER));
    }
}
