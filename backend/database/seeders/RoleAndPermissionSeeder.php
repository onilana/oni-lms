<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class RoleAndPermissionSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Roles
        $rolesData = [
            Role::SUPER_ADMIN => [
                'label' => 'Super Administrator',
                'description' => 'Full system access and global platform administration',
            ],
            Role::COLLEGE_ADMIN => [
                'label' => 'College Administrator',
                'description' => 'Manages college-level academic affairs, departments, and staff',
            ],
            Role::DEPT_ADMIN => [
                'label' => 'Department Administrator',
                'description' => 'Manages departmental programmes, teachers, batches, and courses',
            ],
            Role::HOD => [
                'label' => 'Head of Department',
                'description' => 'Department academic oversight, curriculum approval, and teacher allocation',
            ],
            Role::TEACHER => [
                'label' => 'Teacher',
                'description' => 'Course instructor: creates lessons, assignments, exams, and grades submissions',
            ],
            Role::STUDENT => [
                'label' => 'Student',
                'description' => 'Enrolled learner: accesses learning materials, completes assessments, views grades',
            ],
            Role::SUPPORT_STAFF => [
                'label' => 'Support Staff',
                'description' => 'Restricted technical and operational support across campus',
            ],
        ];

        $roles = [];
        foreach ($rolesData as $name => $meta) {
            $roles[$name] = Role::firstOrCreate(
                ['name' => $name],
                [
                    'label' => $meta['label'],
                    'description' => $meta['description'],
                ]
            );
        }

        // 2. Permissions
        $permissionsData = [
            // User management
            ['name' => 'users.view', 'label' => 'View Users', 'group' => 'users'],
            ['name' => 'users.create', 'label' => 'Create Users', 'group' => 'users'],
            ['name' => 'users.update', 'label' => 'Update Users', 'group' => 'users'],
            ['name' => 'users.delete', 'label' => 'Delete Users', 'group' => 'users'],

            // Academic structure
            ['name' => 'academic.manage', 'label' => 'Manage Academic Entities', 'group' => 'academic'],
            ['name' => 'academic.view', 'label' => 'View Academic Entities', 'group' => 'academic'],

            // Courses
            ['name' => 'courses.view', 'label' => 'View Courses', 'group' => 'courses'],
            ['name' => 'courses.create', 'label' => 'Create Courses', 'group' => 'courses'],
            ['name' => 'courses.update', 'label' => 'Update Courses', 'group' => 'courses'],
            ['name' => 'courses.delete', 'label' => 'Delete Courses', 'group' => 'courses'],
            ['name' => 'courses.enroll', 'label' => 'Enroll Students in Courses', 'group' => 'courses'],

            // Content & Lessons
            ['name' => 'lessons.view', 'label' => 'View Lessons', 'group' => 'lessons'],
            ['name' => 'lessons.manage', 'label' => 'Create and Manage Lessons', 'group' => 'lessons'],

            // Assignments
            ['name' => 'assignments.view', 'label' => 'View Assignments', 'group' => 'assignments'],
            ['name' => 'assignments.manage', 'label' => 'Create and Edit Assignments', 'group' => 'assignments'],
            ['name' => 'assignments.delete', 'label' => 'Delete Assignments Across Courses', 'group' => 'assignments'],
            ['name' => 'assignments.submit', 'label' => 'Submit Assignment Responses', 'group' => 'assignments'],
            ['name' => 'assignments.grade', 'label' => 'Grade Assignment Submissions', 'group' => 'assignments'],

            // Exams
            ['name' => 'exams.view', 'label' => 'View Exams', 'group' => 'exams'],
            ['name' => 'exams.manage', 'label' => 'Create and Manage Exams', 'group' => 'exams'],
            ['name' => 'exams.attempt', 'label' => 'Take Exam Attempts', 'group' => 'exams'],
            ['name' => 'exams.grade', 'label' => 'Evaluate and Grade Exams', 'group' => 'exams'],
            ['name' => 'question_banks.manage', 'label' => 'Manage Shared Question Banks', 'group' => 'exams'],

            // Attendance
            ['name' => 'attendance.view', 'label' => 'View Attendance', 'group' => 'attendance'],
            ['name' => 'attendance.mark', 'label' => 'Mark and Update Attendance', 'group' => 'attendance'],

            // Certificates
            ['name' => 'certificates.view', 'label' => 'View Certificates', 'group' => 'certificates'],
            ['name' => 'certificates.manage', 'label' => 'Issue and Manage Certificates', 'group' => 'certificates'],
            ['name' => 'certificates.claim', 'label' => 'Claim Course Certificates', 'group' => 'certificates'],
            ['name' => 'certificates.revoke', 'label' => 'Revoke Issued Certificates', 'group' => 'certificates'],
        ];

        $permissionModels = [];
        foreach ($permissionsData as $perm) {
            $permissionModels[$perm['name']] = Permission::firstOrCreate(
                ['name' => $perm['name']],
                ['label' => $perm['label'], 'group' => $perm['group']]
            );
        }

        // 3. Attach permissions to roles
        // Teacher permissions
        $teacherPerms = [
            'academic.view', 'courses.view', 'courses.create', 'courses.update',
            'lessons.view', 'lessons.manage',
            'assignments.view', 'assignments.manage', 'assignments.grade',
            'exams.view', 'exams.manage', 'exams.grade',
            'attendance.view', 'attendance.mark',
            'certificates.view', 'certificates.manage',
        ];
        $roles[Role::TEACHER]->permissions()->sync(
            collect($teacherPerms)->map(fn ($p) => $permissionModels[$p]->id)
        );

        // Student permissions
        $studentPerms = [
            'academic.view', 'courses.view',
            'lessons.view',
            'assignments.view', 'assignments.submit',
            'exams.view', 'exams.attempt',
            'attendance.view',
            'certificates.view', 'certificates.claim',
        ];
        $roles[Role::STUDENT]->permissions()->sync(
            collect($studentPerms)->map(fn ($p) => $permissionModels[$p]->id)
        );

        // Dept Admin permissions
        $deptAdminPerms = array_merge($teacherPerms, [
            'users.view', 'users.create', 'courses.create', 'courses.enroll',
        ]);
        $roles[Role::DEPT_ADMIN]->permissions()->sync(
            collect($deptAdminPerms)->map(fn ($p) => $permissionModels[$p]->id)
        );

        // HOD permissions (Department academic oversight)
        $hodPerms = array_merge($deptAdminPerms, [
            'courses.update', 'academic.manage',
        ]);
        $roles[Role::HOD]->permissions()->sync(
            collect($hodPerms)->map(fn ($p) => $permissionModels[$p]->id)
        );

        // Support Staff permissions
        $supportPerms = [
            'users.view', 'academic.view', 'courses.view', 'attendance.view',
        ];
        $roles[Role::SUPPORT_STAFF]->permissions()->sync(
            collect($supportPerms)->map(fn ($p) => $permissionModels[$p]->id)
        );

        // College Admin permissions (all permissions)
        $roles[Role::COLLEGE_ADMIN]->permissions()->sync(
            collect($permissionModels)->pluck('id')
        );

        // 4. Default Super Admin User
        $superAdmin = User::firstOrCreate(
            ['email' => 'admin@onilms.edu'],
            [
                'name' => 'Super Administrator',
                'password' => Hash::make(env('INITIAL_ADMIN_PASSWORD', 'OniAdmin@2026!')),
                'status' => 'active',
                'email_verified_at' => now(),
            ]
        );

        if (! $superAdmin->hasRole(Role::SUPER_ADMIN)) {
            $superAdmin->roles()->attach($roles[Role::SUPER_ADMIN]->id);
        }

        // 5. Default Demo Student User
        $demoStudent = User::firstOrCreate(
            ['email' => 'student@onilms.edu'],
            [
                'name' => 'Aarav Sharma',
                'password' => Hash::make(env('INITIAL_STUDENT_PASSWORD', 'OniStudent@2026!')),
                'status' => 'active',
                'email_verified_at' => now(),
            ]
        );

        if (! $demoStudent->hasRole(Role::STUDENT)) {
            $demoStudent->roles()->attach($roles[Role::STUDENT]->id);
        }

        // 6. Default Demo Teacher User
        $demoTeacher = User::firstOrCreate(
            ['email' => 'teacher@onilms.edu'],
            [
                'name' => 'Dr. Priya Ramanathan',
                'password' => Hash::make(env('INITIAL_TEACHER_PASSWORD', 'OniTeacher@2026!')),
                'status' => 'active',
                'email_verified_at' => now(),
            ]
        );

        if (! $demoTeacher->hasRole(Role::TEACHER)) {
            $demoTeacher->roles()->attach($roles[Role::TEACHER]->id);
        }

        // 7. Default Demo HOD / Department Admin User
        $demoHod = User::firstOrCreate(
            ['email' => 'hod@onilms.edu'],
            [
                'name' => 'Prof. Vikram Sengupta',
                'password' => Hash::make(env('INITIAL_HOD_PASSWORD', 'OniHod@2026!')),
                'status' => 'active',
                'email_verified_at' => now(),
            ]
        );

        if (! $demoHod->hasRole(Role::HOD)) {
            $demoHod->roles()->attach($roles[Role::HOD]->id);
        }
    }
}
