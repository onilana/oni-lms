<?php

namespace App\Policies;

use App\Models\Course;
use App\Models\Role;
use App\Models\User;

class CoursePolicy
{
    public function view(User $user, Course $course): bool
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

    public function manageEnrolments(User $user, Course $course): bool
    {
        if ($user->isInstitutionAdmin()) {
            return true;
        }

        if ($user->hasRole([Role::HOD, Role::DEPT_ADMIN]) && $course->department_id === $user->getAssignedDepartmentId()) {
            return true;
        }

        return $course->isTaughtBy($user);
    }

    public function update(User $user, Course $course): bool
    {
        if ($user->isInstitutionAdmin()) {
            return true;
        }

        return $user->hasPermission('courses.update')
            && ($course->isTaughtBy($user) || $course->department_id === $user->getAssignedDepartmentId());
    }

    public function delete(User $user, Course $course): bool
    {
        if ($user->isInstitutionAdmin()) {
            return true;
        }

        return $user->hasPermission('courses.delete')
            && $course->department_id === $user->getAssignedDepartmentId();
    }
}
