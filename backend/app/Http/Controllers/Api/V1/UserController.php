<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Resources\UserResource;
use App\Models\Department;
use App\Models\Programme;
use App\Models\Role;
use App\Models\StudentProfile;
use App\Models\TeacherProfile;
use App\Models\User;
use App\Services\CourseAccessService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class UserController
{
    private function authorizeAdmin(Request $request): void
    {
        $user = $request->user();
        if (!$user) {
            abort(401, 'Unauthenticated');
        }

        if (
            !$user->isSuperAdmin() &&
            !$user->hasRole([Role::COLLEGE_ADMIN, Role::DEPT_ADMIN, Role::HOD, Role::TEACHER]) &&
            !$user->hasPermission('users.manage') &&
            !$user->hasPermission('users.view')
        ) {
            abort(403, 'Unauthorized access to user administration.');
        }
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorizeAdmin($request);
        $currentUser = $request->user();

        $query = User::query()
            ->with([
                'roles.permissions',
                'teacherProfile.department',
                'studentProfile.programme.department',
                'studentProfile.batch',
            ])
            ->withCount(['enrolledCourses', 'taughtCourses'])
            ->orderBy('name');

        // Department-level isolation for HoD, Dept Admin, and Teachers
        if (!$currentUser->isInstitutionAdmin() && $currentUser->hasRole([Role::HOD, Role::DEPT_ADMIN, Role::TEACHER])) {
            $assignedDeptId = $currentUser->getAssignedDepartmentId();
            if ($assignedDeptId) {
                $query->where(function ($q) use ($assignedDeptId) {
                    $q->whereHas('teacherProfile', fn ($tq) => $tq->where('department_id', $assignedDeptId))
                        ->orWhereHas('studentProfile.programme', fn ($sq) => $sq->where('department_id', $assignedDeptId));
                });
            } else {
                // If not assigned to any department, cannot access students or teachers
                $query->whereRaw('1 = 0');
            }
        } elseif ($request->filled('department_id')) {
            $deptId = $request->query('department_id');
            $query->where(function ($q) use ($deptId) {
                $q->whereHas('teacherProfile', fn ($tq) => $tq->where('department_id', $deptId))
                    ->orWhereHas('studentProfile.programme', fn ($sq) => $sq->where('department_id', $deptId));
            });
        }

        if ($request->filled('role')) {
            $roleNames = array_map('trim', explode(',', $request->query('role')));
            $query->whereHas('roles', fn ($q) => $q->whereIn('name', $roleNames));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        if ($request->filled('programme_id')) {
            $progId = $request->query('programme_id');
            $query->whereHas('studentProfile', fn ($sq) => $sq->where('programme_id', $progId));
        }

        if ($request->filled('level')) {
            $level = strtolower($request->query('level'));
            $query->whereHas('studentProfile.programme', function ($pq) use ($level) {
                $pq->where('level', $level);
            });
        }

        if ($request->filled('course_id')) {
            $courseId = $request->query('course_id');
            $query->where(function ($q) use ($courseId) {
                $q->whereHas('enrolledCourses', fn ($cq) => $cq->where('courses.id', $courseId))
                    ->orWhereHas('taughtCourses', fn ($cq) => $cq->where('courses.id', $courseId));
            });
        }

        if ($request->filled('semester')) {
            $sem = $request->integer('semester');
            $query->whereHas('studentProfile', fn ($sq) => $sq->where('current_semester', $sem));
        }

        if ($request->filled('search')) {
            $term = $request->query('search');
            $query->where(function ($q) use ($term) {
                $q->where('name', 'like', "%{$term}%")
                    ->orWhere('username', 'like', "%{$term}%")
                    ->orWhere('email', 'like', "%{$term}%")
                    ->orWhereHas('studentProfile', fn ($sq) => $sq->where('student_id_number', 'like', "%{$term}%"))
                    ->orWhereHas('teacherProfile', fn ($tq) => $tq->where('employee_id_number', 'like', "%{$term}%"));
            });
        }

        $perPage = $request->integer('per_page', 20);
        return UserResource::collection($query->paginate($perPage));
    }

    public function show(Request $request, User $user): JsonResponse
    {
        $this->authorizeAdmin($request);
        $currentUser = $request->user();

        // Enforce department access control for HoD and Teachers
        if (!$currentUser->isInstitutionAdmin() && $currentUser->hasRole([Role::HOD, Role::DEPT_ADMIN, Role::TEACHER])) {
            $assignedDeptId = $currentUser->getAssignedDepartmentId();
            
            // Check if student belongs to this department
            if ($user->studentProfile) {
                $studentDeptId = $user->studentProfile->programme?->department_id;
                if ($studentDeptId !== $assignedDeptId) {
                    abort(403, 'Access denied. You do not have permission to access student records outside your assigned department.');
                }
            } elseif ($user->teacherProfile) {
                $teacherDeptId = $user->teacherProfile->department_id;
                if ($teacherDeptId !== $assignedDeptId) {
                    abort(403, 'Access denied. You do not have permission to access faculty records outside your assigned department.');
                }
            }
        }

        $user->load([
            'roles.permissions',
            'teacherProfile.department',
            'studentProfile.programme.department',
            'studentProfile.batch',
            'enrolledCourses.department',
            'taughtCourses.department',
        ])->loadCount(['enrolledCourses', 'taughtCourses']);

        return response()->json([
            'data' => new UserResource($user),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'username' => 'nullable|string|max:100|unique:users,username',
            'email' => 'required|email|max:255|unique:users,email',
            'password' => 'required|string|min:8',
            'status' => 'sometimes|string|in:active,inactive,suspended',
            'role' => 'required|string|exists:roles,name',
            // Teacher profile fields
            'department_id' => 'nullable|uuid|exists:departments,id',
            'employee_id_number' => 'nullable|string|max:50',
            'designation' => 'nullable|string|max:100',
            'qualification' => 'nullable|string|max:100',
            // Student profile fields
            'programme_id' => 'nullable|uuid|exists:programmes,id',
            'batch_id' => 'nullable|uuid|exists:batches,id',
            'student_id_number' => 'nullable|string|max:50',
            'current_semester' => 'nullable|integer|min:1|max:16',
        ]);

        $user = DB::transaction(function () use ($validated) {
            $username = !empty($validated['username'])
                ? strtolower(trim($validated['username']))
                : User::generateUniqueUsername(
                    $validated['student_id_number'] ?? $validated['employee_id_number'] ?? $validated['email']
                );

            $user = User::create([
                'name' => $validated['name'],
                'username' => $username,
                'email' => $validated['email'],
                'password' => Hash::make($validated['password']),
                'status' => $validated['status'] ?? 'active',
            ]);

            $role = Role::where('name', $validated['role'])->first();
            if ($role) {
                $user->roles()->sync([$role->id]);
            }

            if (in_array($validated['role'], [Role::TEACHER, Role::HOD, Role::DEPT_ADMIN]) || !empty($validated['department_id'])) {
                TeacherProfile::create([
                    'user_id' => $user->id,
                    'department_id' => $validated['department_id'] ?? null,
                    'employee_id_number' => $validated['employee_id_number'] ?? ('FAC-' . date('Y') . '-' . strtoupper(Str::random(5))),
                    'designation' => $validated['designation'] ?? ($validated['role'] === Role::HOD ? 'Head of Department' : 'Faculty Member'),
                    'qualification' => $validated['qualification'] ?? null,
                    'status' => $validated['status'] ?? 'active',
                ]);
            } elseif ($validated['role'] === Role::STUDENT) {
                $progId = $validated['programme_id'] ?? null;
                if (!$progId && !empty($validated['department_id'])) {
                    $progId = Programme::where('department_id', $validated['department_id'])->value('id');
                }
                StudentProfile::create([
                    'user_id' => $user->id,
                    'programme_id' => $progId,
                    'batch_id' => $validated['batch_id'] ?? null,
                    'student_id_number' => $validated['student_id_number'] ?? ('STU-' . date('Y') . '-' . strtoupper(Str::random(5))),
                    'current_semester' => $validated['current_semester'] ?? 1,
                    'admission_date' => now()->toDateString(),
                    'status' => $validated['status'] ?? 'active',
                ]);
            }

            return $user;
        });

        // Automatically grant access to courses under assigned Department/Programme
        CourseAccessService::syncUserAccess($user);

        $user->load([
            'roles.permissions',
            'teacherProfile.department',
            'studentProfile.programme',
            'studentProfile.batch',
        ]);

        return response()->json([
            'message' => 'User created successfully.',
            'data' => new UserResource($user),
        ], 201);
    }

    private function ensureCanModifyTargetUser(Request $request, User $target): void
    {
        if ($target->isSuperAdmin() && !$request->user()?->isSuperAdmin()) {
            abort(403, 'Only a Super Administrator can modify or overwrite a Super Administrator account.');
        }
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $this->authorizeAdmin($request);
        $this->ensureCanModifyTargetUser($request, $user);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'username' => ['sometimes', 'nullable', 'string', 'max:100', Rule::unique('users', 'username')->ignore($user->id)],
            'email' => ['sometimes', 'required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'status' => 'sometimes|string|in:active,inactive,suspended',
            'role' => 'sometimes|string|exists:roles,name',
            // Teacher fields
            'department_id' => 'nullable|uuid|exists:departments,id',
            'employee_id_number' => 'nullable|string|max:50',
            'designation' => 'nullable|string|max:100',
            'qualification' => 'nullable|string|max:100',
            // Student fields
            'programme_id' => 'nullable|uuid|exists:programmes,id',
            'batch_id' => 'nullable|uuid|exists:batches,id',
            'student_id_number' => 'nullable|string|max:50',
            'current_semester' => 'nullable|integer|min:1|max:16',
        ]);

        DB::transaction(function () use ($user, $validated) {
            $userUpdate = [];
            if (isset($validated['name'])) $userUpdate['name'] = $validated['name'];
            if (!empty($validated['username'])) {
                $userUpdate['username'] = strtolower(trim($validated['username']));
            } elseif (empty($user->username)) {
                $userUpdate['username'] = User::generateUniqueUsername($user->email, $user->id);
            }
            if (isset($validated['email'])) $userUpdate['email'] = $validated['email'];
            if (isset($validated['status'])) $userUpdate['status'] = $validated['status'];

            if (!empty($userUpdate)) {
                $user->update($userUpdate);
            }

            if (isset($validated['role'])) {
                $role = Role::where('name', $validated['role'])->first();
                if ($role) {
                    $user->roles()->sync([$role->id]);
                }
            }

            $effectiveRole = $validated['role'] ?? $user->roles()->value('name');
            $isFacultyRole = in_array($effectiveRole, [Role::TEACHER, Role::HOD, Role::DEPT_ADMIN], true);
            $isStudentRole = $effectiveRole === Role::STUDENT;

            // Sync or update teacher profile only for faculty roles or existing teacher profiles
            if ($user->teacherProfile || ($isFacultyRole && !empty($validated['department_id']))) {
                $teacherProfile = $user->teacherProfile ?? new TeacherProfile([
                    'user_id' => $user->id,
                    'employee_id_number' => 'FAC-' . date('Y') . '-' . strtoupper(Str::random(5)),
                ]);
                if (!empty($validated['department_id'])) {
                    $teacherProfile->department_id = $validated['department_id'];
                } elseif (!$teacherProfile->department_id) {
                    $teacherProfile->department_id = Department::value('id');
                }
                if (!empty($validated['employee_id_number'])) {
                    $teacherProfile->employee_id_number = $validated['employee_id_number'];
                } elseif (!$teacherProfile->employee_id_number) {
                    $teacherProfile->employee_id_number = 'FAC-' . date('Y') . '-' . strtoupper(Str::random(5));
                }
                if (array_key_exists('designation', $validated) && $validated['designation'] !== null) {
                    $teacherProfile->designation = $validated['designation'];
                } elseif (!$teacherProfile->designation) {
                    $teacherProfile->designation = $effectiveRole === Role::HOD ? 'Head of Department' : 'Faculty Member';
                }
                if (array_key_exists('qualification', $validated)) {
                    $teacherProfile->qualification = $validated['qualification'];
                }
                if (isset($validated['status'])) {
                    $teacherProfile->status = $validated['status'];
                }
                if ($teacherProfile->department_id) {
                    $teacherProfile->save();
                }
            }

            // Sync or update student profile for student role or existing student profiles
            if ($user->studentProfile || $isStudentRole || !empty($validated['programme_id']) || !empty($validated['student_id_number'])) {
                $studentProfile = $user->studentProfile ?? new StudentProfile([
                    'user_id' => $user->id,
                    'student_id_number' => !empty($validated['student_id_number'])
                        ? $validated['student_id_number']
                        : ('STU-' . date('Y') . '-' . strtoupper(substr(str_replace('-', '', $user->id), 0, 8))),
                    'admission_date' => now()->toDateString(),
                    'current_semester' => $validated['current_semester'] ?? 1,
                ]);
                if (array_key_exists('programme_id', $validated)) {
                    $studentProfile->programme_id = $validated['programme_id'];
                }
                if (array_key_exists('batch_id', $validated)) {
                    $studentProfile->batch_id = $validated['batch_id'];
                }
                if (!empty($validated['student_id_number'])) {
                    $studentProfile->student_id_number = $validated['student_id_number'];
                } elseif (!$studentProfile->student_id_number) {
                    $studentProfile->student_id_number = 'STU-' . date('Y') . '-' . strtoupper(substr(str_replace('-', '', $user->id), 0, 8));
                }
                if (!empty($validated['current_semester'])) {
                    $studentProfile->current_semester = $validated['current_semester'];
                } elseif (!$studentProfile->current_semester) {
                    $studentProfile->current_semester = 1;
                }
                if (isset($validated['status'])) {
                    $studentProfile->status = $validated['status'];
                }
                $studentProfile->save();
            }
        });

        // Re-synchronize course access whenever programme or department changes
        CourseAccessService::syncUserAccess($user);

        $user->load([
            'roles.permissions',
            'teacherProfile.department',
            'studentProfile.programme',
            'studentProfile.batch',
        ])->loadCount(['enrolledCourses', 'taughtCourses']);

        return response()->json([
            'message' => 'User updated successfully.',
            'data' => new UserResource($user),
        ]);
    }

    public function resetPassword(Request $request, User $user): JsonResponse
    {
        $this->authorizeAdmin($request);
        $this->ensureCanModifyTargetUser($request, $user);

        $validated = $request->validate([
            'password' => 'required|string|min:8',
        ]);

        $user->update([
            'password' => Hash::make($validated['password']),
        ]);

        return response()->json([
            'message' => 'Password reset successfully for ' . $user->name . '.',
        ]);
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        $this->authorizeAdmin($request);
        $this->ensureCanModifyTargetUser($request, $user);

        if ($user->id === $request->user()->id) {
            return response()->json(['message' => 'You cannot delete your own account.'], 400);
        }

        $user->delete();

        return response()->json([
            'message' => 'User account removed successfully.',
        ]);
    }

    public function bulkEnroll(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $overwrite = filter_var($request->input('overwrite', false), FILTER_VALIDATE_BOOLEAN);
        if ($overwrite && !$request->user()->isSuperAdmin()) {
            abort(403, 'Only a Super Administrator has overwrite authority during bulk enrollment.');
        }

        $defaultRole = $request->input('default_role', Role::STUDENT);
        $usersData = [];

        if ($request->hasFile('file')) {
            $file = $request->file('file');
            $content = file_get_contents($file->getRealPath());
            $lines = explode("\n", trim($content));
            $header = null;
            foreach ($lines as $line) {
                $trimmed = trim($line);
                if (empty($trimmed)) continue;
                $row = str_getcsv($trimmed);
                if (!$header) {
                    $header = array_map('trim', array_map('strtolower', $row));
                    continue;
                }
                if (count($row) >= 2 && !empty($row[0])) {
                    $item = [];
                    foreach ($header as $i => $col) {
                        $item[$col] = $row[$i] ?? null;
                    }
                    $usersData[] = $item;
                }
            }
        } elseif ($request->has('users') && is_array($request->input('users'))) {
            $usersData = $request->input('users');
        } elseif ($request->has('students') && is_array($request->input('students'))) {
            $usersData = $request->input('students');
        } else {
            return response()->json(['message' => 'Please provide a CSV file or users array.'], 422);
        }

        $imported = 0;
        $updated = 0;
        $errors = [];
        $breakdown = [
            Role::COLLEGE_ADMIN => 0,
            Role::HOD => 0,
            Role::TEACHER => 0,
            Role::STUDENT => 0,
        ];

        $rolesMap = Role::all()->keyBy('name');

        foreach ($usersData as $index => $row) {
            $name = $row['name'] ?? null;
            $email = $row['email'] ?? null;
            $roleName = strtolower(trim($row['role'] ?? $defaultRole));

            // Map common role aliases
            if (in_array($roleName, ['admin', 'school_admin', 'college_admin', 'school admin'])) {
                $roleName = Role::COLLEGE_ADMIN;
            } elseif (in_array($roleName, ['hod', 'head of department', 'dept_head'])) {
                $roleName = Role::HOD;
            } elseif (in_array($roleName, ['teacher', 'professor', 'faculty', 'instructor', 'lecturer'])) {
                $roleName = Role::TEACHER;
            } else {
                $roleName = Role::STUDENT;
            }

            if (empty($name) || empty($email)) {
                $errors[] = "Row " . ($index + 1) . ": Name and Email are required.";
                continue;
            }

            $existingUser = User::where('email', $email)->first();
            if ($existingUser && !$overwrite) {
                $errors[] = "Row " . ($index + 1) . ": Email {$email} already exists.";
                continue;
            }

            $password = $row['password'] ?? ($roleName === Role::STUDENT ? 'Student@2026!' : 'Staff@2026!');
            $rowUsername = !empty($row['username']) ? strtolower(trim((string) $row['username'])) : null;

            if ($existingUser) {
                $userUpdates = [
                    'name' => $name,
                    'status' => $row['status'] ?? $existingUser->status ?? 'active',
                ];
                if ($rowUsername) {
                    $userUpdates['username'] = User::generateUniqueUsername($rowUsername, $existingUser->id);
                } elseif (empty($existingUser->username)) {
                    $userUpdates['username'] = User::generateUniqueUsername($email, $existingUser->id);
                }
                if (!empty($row['password'])) {
                    $userUpdates['password'] = Hash::make($row['password']);
                }
                $existingUser->update($userUpdates);
                $user = $existingUser;
                $updated++;
            } else {
                $usernameSeed = $rowUsername ?? $row['student_id_number'] ?? $row['student_id'] ?? $row['employee_id_number'] ?? $row['employee_id'] ?? $email;
                $user = User::create([
                    'name' => $name,
                    'username' => User::generateUniqueUsername((string) $usernameSeed),
                    'email' => $email,
                    'password' => Hash::make($password),
                    'status' => $row['status'] ?? 'active',
                    'email_verified_at' => now(),
                ]);
            }

            $roleModel = $rolesMap->get($roleName);
            if ($roleModel) {
                if ($existingUser) {
                    $user->roles()->sync([$roleModel->id]);
                } else {
                    $user->roles()->syncWithoutDetaching([$roleModel->id]);
                }
            }

            // Create or update appropriate profile
            if ($roleName === Role::STUDENT) {
                $studentIdNum = $row['student_id_number'] ?? $row['student_id'] ?? $user->studentProfile?->student_id_number ?? ('STU-' . date('Y') . '-' . strtoupper(Str::random(5)));
                $progId = $row['programme_id'] ?? null;
                if (!$progId && !empty($row['programme'])) {
                    $progId = Programme::where('code', $row['programme'])->orWhere('name', 'like', "%{$row['programme']}%")->value('id');
                }
                if (!$progId && !empty($row['department_id'])) {
                    $progId = Programme::where('department_id', $row['department_id'])->value('id');
                }
                if (!$progId && !empty($row['department'])) {
                    $dId = Department::where('code', $row['department'])->orWhere('name', 'like', "%{$row['department']}%")->value('id');
                    if ($dId) {
                        $progId = Programme::where('department_id', $dId)->value('id');
                    }
                }

                StudentProfile::updateOrCreate(
                    ['user_id' => $user->id],
                    [
                        'student_id_number' => $studentIdNum,
                        'programme_id' => $progId ?? $user->studentProfile?->programme_id,
                        'batch_id' => $row['batch_id'] ?? $user->studentProfile?->batch_id,
                        'admission_date' => $row['admission_date'] ?? $user->studentProfile?->admission_date ?? now(),
                        'current_semester' => $row['current_semester'] ?? $user->studentProfile?->current_semester ?? 1,
                        'phone' => $row['phone'] ?? $user->studentProfile?->phone,
                        'status' => $row['status'] ?? 'active',
                    ]
                );
            } elseif ($roleName === Role::TEACHER || $roleName === Role::HOD) {
                $deptId = $row['department_id'] ?? null;
                if (!$deptId && !empty($row['department'])) {
                    $deptId = Department::where('code', $row['department'])->orWhere('name', 'like', "%{$row['department']}%")->value('id');
                }
                if (!$deptId && !empty($row['programme_id'])) {
                    $deptId = Programme::where('id', $row['programme_id'])->value('department_id');
                }
                if (!$deptId) {
                    $deptId = $user->teacherProfile?->department_id ?? Department::value('id');
                }
                $empIdNum = $row['employee_id_number'] ?? $row['employee_id'] ?? $user->teacherProfile?->employee_id_number ?? ('FAC-' . date('Y') . '-' . strtoupper(Str::random(5)));
                TeacherProfile::updateOrCreate(
                    ['user_id' => $user->id],
                    [
                        'department_id' => $deptId,
                        'employee_id_number' => $empIdNum,
                        'designation' => $row['designation'] ?? $user->teacherProfile?->designation ?? ($roleName === Role::HOD ? 'Head of Department' : ($row['academic_designation'] ?? 'Professor')),
                        'qualification' => $row['qualification'] ?? $user->teacherProfile?->qualification ?? ($row['highest_qualification'] ?? 'Ph.D.'),
                        'status' => $row['status'] ?? 'active',
                    ]
                );
            }

            // Automatically grant access to all courses in the assigned Department/Programme
            CourseAccessService::syncUserAccess($user);

            if (isset($breakdown[$roleName])) {
                $breakdown[$roleName]++;
            }
            $imported++;
        }

        return response()->json([
            'message' => "Successfully enrolled {$imported} user(s) in bulk" . ($updated > 0 ? " ({$updated} overwritten)" : '') . '.',
            'imported_count' => $imported,
            'updated_count' => $updated,
            'breakdown' => $breakdown,
            'errors' => $errors,
        ]);
    }

    public function importStudents(Request $request): JsonResponse
    {
        return $this->bulkEnroll($request);
    }
}
