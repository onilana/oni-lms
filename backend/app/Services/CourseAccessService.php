<?php

namespace App\Services;

use App\Models\AcademicSession;
use App\Models\Course;
use App\Models\CourseEnrolment;
use App\Models\CourseInstructor;
use App\Models\Department;
use App\Models\Programme;
use App\Models\Role;
use App\Models\User;

class CourseAccessService
{
    /**
     * Synchronizes all course enrolments and instructor assignments for a user
     * based on their assigned Department and Programme.
     */
    public static function syncUserAccess(User $user): void
    {
        $activeSession = AcademicSession::where('is_current', true)->first()
            ?? AcademicSession::latest()->first();

        if (! $activeSession) {
            $activeSession = AcademicSession::firstOrCreate(
                ['name' => '2026-2027'],
                [
                    'start_date' => '2026-08-01',
                    'end_date' => '2027-05-31',
                    'is_current' => true,
                    'status' => 'active',
                ]
            );
        }

        // 1. STUDENT SYNCHRONIZATION
        if ($user->hasRole(Role::STUDENT) || $user->studentProfile()->exists()) {
            $studentProfile = $user->studentProfile;
            if ($studentProfile && $studentProfile->programme_id) {
                $programme = Programme::find($studentProfile->programme_id);
                if ($programme) {
                    $deptId = $programme->department_id;

                    // All courses under this programme OR general department courses
                    $courses = Course::where(function ($q) use ($programme, $deptId) {
                        $q->where('programme_id', $programme->id)
                            ->orWhere(function ($sub) use ($deptId) {
                                $sub->where('department_id', $deptId)
                                    ->whereNull('programme_id');
                            });
                    })
                    ->where('status', '!=', 'archived')
                    ->get();

                    foreach ($courses as $course) {
                        CourseEnrolment::firstOrCreate([
                            'course_id' => $course->id,
                            'user_id' => $user->id,
                            'academic_session_id' => $activeSession->id,
                        ], [
                            'status' => 'enrolled',
                            'enrolled_at' => now(),
                        ]);
                    }

                    // Remove enrolment from other departments if student was transferred
                    CourseEnrolment::where('user_id', $user->id)
                        ->whereHas('course', function ($q) use ($deptId) {
                            $q->where('department_id', '!=', $deptId);
                        })
                        ->delete();
                }
            }
        }

        // 2. TEACHER / PROFESSOR SYNCHRONIZATION
        if ($user->hasRole([Role::TEACHER, Role::HOD, Role::DEPT_ADMIN]) || $user->teacherProfile()->exists()) {
            $teacherProfile = $user->teacherProfile;
            $deptId = $teacherProfile?->department_id ?? $user->getAssignedDepartmentId();

            if ($deptId) {
                // If HoD, update department's head_of_department_id
                if ($user->hasRole([Role::HOD, Role::DEPT_ADMIN])) {
                    Department::where('id', $deptId)->update(['head_of_department_id' => $user->id]);
                }

                // Assign teacher to all courses in this department
                $courses = Course::where('department_id', $deptId)
                    ->where('status', '!=', 'archived')
                    ->get();

                foreach ($courses as $course) {
                    CourseInstructor::firstOrCreate([
                        'course_id' => $course->id,
                        'user_id' => $user->id,
                        'academic_session_id' => $activeSession->id,
                    ], [
                        'role' => $user->hasRole(Role::HOD) ? 'lead' : 'instructor',
                    ]);
                }

                // If teacher changed department, remove them from previous department courses
                CourseInstructor::where('user_id', $user->id)
                    ->whereHas('course', function ($q) use ($deptId) {
                        $q->where('department_id', '!=', $deptId);
                    })
                    ->delete();
            }
        }
    }
}
