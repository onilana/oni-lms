<?php

namespace App\Policies;

use App\Models\Assignment;
use App\Models\Course;
use App\Models\Role;
use App\Models\User;

class AssignmentPolicy
{
    public function view(User $user, Assignment $assignment): bool
    {
        return $assignment->status === 'published'
            || $this->manageCourse($user, $assignment->course);
    }

    public function delete(User $user, Assignment $assignment): bool
    {
        return $assignment->course->isTaughtBy($user)
            || $user->isSuperAdmin()
            || $user->hasPermission('assignments.delete');
    }

    public function manageCourse(User $user, Course $course): bool
    {
        return $course->isTaughtBy($user)
            || $user->isSuperAdmin()
            || ($user->hasPermission('assignments.manage') && ! $user->hasRole(Role::TEACHER));
    }
}
