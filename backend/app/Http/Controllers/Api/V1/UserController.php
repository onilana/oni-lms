<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Resources\UserResource;
use App\Models\Role;
use App\Models\StudentProfile;
use App\Models\TeacherProfile;
use App\Models\Department;
use App\Models\User;
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
            !$user->hasRole([Role::COLLEGE_ADMIN, Role::DEPT_ADMIN]) &&
            !$user->hasPermission('users.manage') &&
            !$user->hasPermission('users.view')
        ) {
            abort(403, 'Unauthorized access to user administration.');
        }
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorizeAdmin($request);

        $query = User::query()
            ->with([
                'roles.permissions',
                'teacherProfile.department',
                'studentProfile.programme',
                'studentProfile.batch',
            ])
            ->withCount(['enrolledCourses', 'taughtCourses'])
            ->orderBy('name');

        if ($request->filled('role')) {
            $roleName = $request->query('role');
            $query->whereHas('roles', fn ($q) => $q->where('name', $roleName));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        if ($request->filled('department_id')) {
            $deptId = $request->query('department_id');
            $query->whereHas('teacherProfile', fn ($q) => $q->where('department_id', $deptId));
        }

        if ($request->filled('search')) {
            $term = $request->query('search');
            $query->where(function ($q) use ($term) {
                $q->where('name', 'like', "%{$term}%")
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

        $user->load([
            'roles.permissions',
            'teacherProfile.department',
            'studentProfile.programme',
            'studentProfile.batch',
            'enrolledCourses',
            'taughtCourses',
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
            $user = User::create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'password' => Hash::make($validated['password']),
                'status' => $validated['status'] ?? 'active',
            ]);

            $role = Role::where('name', $validated['role'])->first();
            if ($role) {
                $user->roles()->sync([$role->id]);
            }

            if ($validated['role'] === Role::TEACHER || !empty($validated['department_id'])) {
                TeacherProfile::create([
                    'user_id' => $user->id,
                    'department_id' => $validated['department_id'] ?? null,
                    'employee_id_number' => $validated['employee_id_number'] ?? null,
                    'designation' => $validated['designation'] ?? 'Faculty Member',
                    'qualification' => $validated['qualification'] ?? null,
                    'status' => $validated['status'] ?? 'active',
                ]);
            } elseif ($validated['role'] === Role::STUDENT) {
                StudentProfile::create([
                    'user_id' => $user->id,
                    'programme_id' => $validated['programme_id'] ?? null,
                    'batch_id' => $validated['batch_id'] ?? null,
                    'student_id_number' => $validated['student_id_number'] ?? null,
                    'current_semester' => $validated['current_semester'] ?? 1,
                    'admission_date' => now()->toDateString(),
                    'status' => $validated['status'] ?? 'active',
                ]);
            }

            return $user;
        });

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

    public function update(Request $request, User $user): JsonResponse
    {
        $this->authorizeAdmin($request);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
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

            // Sync or update profile if relevant
            if ($user->teacherProfile || array_key_exists('department_id', $validated)) {
                $teacherProfile = $user->teacherProfile ?? new TeacherProfile(['user_id' => $user->id]);
                if (array_key_exists('department_id', $validated)) $teacherProfile->department_id = $validated['department_id'];
                if (array_key_exists('employee_id_number', $validated)) $teacherProfile->employee_id_number = $validated['employee_id_number'];
                if (array_key_exists('designation', $validated)) $teacherProfile->designation = $validated['designation'];
                if (array_key_exists('qualification', $validated)) $teacherProfile->qualification = $validated['qualification'];
                if (isset($validated['status'])) $teacherProfile->status = $validated['status'];
                $teacherProfile->save();
            }

            if ($user->studentProfile || array_key_exists('programme_id', $validated) || array_key_exists('student_id_number', $validated)) {
                $studentProfile = $user->studentProfile ?? new StudentProfile([
                    'user_id' => $user->id,
                    'student_id_number' => $validated['student_id_number'] ?? ('STU-' . strtoupper(substr(str_replace('-', '', $user->id), 0, 8))),
                    'admission_date' => now()->toDateString(),
                ]);
                if (array_key_exists('programme_id', $validated)) $studentProfile->programme_id = $validated['programme_id'];
                if (array_key_exists('batch_id', $validated)) $studentProfile->batch_id = $validated['batch_id'];
                if (array_key_exists('student_id_number', $validated)) $studentProfile->student_id_number = $validated['student_id_number'];
                if (array_key_exists('current_semester', $validated)) $studentProfile->current_semester = $validated['current_semester'];
                if (isset($validated['status'])) $studentProfile->status = $validated['status'];
                $studentProfile->save();
            }
        });

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

            if (User::where('email', $email)->exists()) {
                $errors[] = "Row " . ($index + 1) . ": Email {$email} already exists.";
                continue;
            }

            $password = $row['password'] ?? ($roleName === Role::STUDENT ? 'Student@2026!' : 'Staff@2026!');
            $phone = $row['phone'] ?? null;

            $user = User::create([
                'name' => $name,
                'email' => $email,
                'password' => Hash::make($password),
                'phone' => $phone,
                'status' => 'active',
                'email_verified_at' => now(),
            ]);

            $roleModel = $rolesMap->get($roleName);
            if ($roleModel) {
                $user->roles()->syncWithoutDetaching([$roleModel->id]);
            }

            // Create appropriate profile
            if ($roleName === Role::STUDENT) {
                $studentIdNum = $row['student_id_number'] ?? $row['student_id'] ?? ('STU-' . date('Y') . '-' . strtoupper(Str::random(5)));
                StudentProfile::create([
                    'user_id' => $user->id,
                    'student_id_number' => $studentIdNum,
                    'programme_id' => $row['programme_id'] ?? null,
                    'batch_id' => $row['batch_id'] ?? null,
                    'admission_date' => $row['admission_date'] ?? now(),
                    'current_semester' => $row['current_semester'] ?? 1,
                    'status' => 'active',
                ]);
            } elseif ($roleName === Role::TEACHER || $roleName === Role::HOD) {
                $deptId = $row['department_id'] ?? null;
                if (!$deptId) {
                    $deptId = Department::value('id');
                }
                $empIdNum = $row['employee_id_number'] ?? $row['employee_id'] ?? ('FAC-' . date('Y') . '-' . strtoupper(Str::random(5)));
                TeacherProfile::create([
                    'user_id' => $user->id,
                    'department_id' => $deptId,
                    'employee_id_number' => $empIdNum,
                    'designation' => $row['designation'] ?? ($roleName === Role::HOD ? 'Head of Department' : ($row['academic_designation'] ?? 'Professor')),
                    'qualification' => $row['qualification'] ?? ($row['highest_qualification'] ?? 'Ph.D.'),
                    'status' => 'active',
                ]);
            }

            if (isset($breakdown[$roleName])) {
                $breakdown[$roleName]++;
            }
            $imported++;
        }

        return response()->json([
            'message' => "Successfully enrolled {$imported} user(s) in bulk.",
            'imported_count' => $imported,
            'breakdown' => $breakdown,
            'errors' => $errors,
        ]);
    }

    public function importStudents(Request $request): JsonResponse
    {
        return $this->bulkEnroll($request);
    }
}
