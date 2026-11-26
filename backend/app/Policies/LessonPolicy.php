<?php

namespace App\Policies;

use App\Models\Course;
use App\Models\Lesson;
use App\Models\Role;
use App\Models\User;

class LessonPolicy
{
    public function viewSection(User $user, Course $course): bool
    {
        if ($user->isInstitutionAdmin()) {
            return true;
        }

        if ($user->hasRole([Role::HOD, Role::DEPT_ADMIN, Role::TEACHER])) {
            $assignedDeptId = $user->getAssignedDepartmentId();

            return $course->department_id === $assignedDeptId || $course->isTaughtBy($user);
        }

        return $course->status === 'published'
            || $course->enrolments()->where('user_id', $user->id)->exists();
    }

    public function delete(User $user, Lesson $lesson): bool
    {
        return $lesson->course->isTaughtBy($user)
            || $user->isSuperAdmin()
            || ($user->hasPermission('lessons.manage') && ! $user->hasRole(Role::TEACHER));
    }

    public function access(User $user, Lesson $lesson): bool
    {
        return $lesson->isAccessibleBy($user);
    }
}
