<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\RoleAndPermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class UserManagementTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $teacher;
    private User $student;
    private Department $dept;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleAndPermissionSeeder::class);

        $superAdminRole = Role::where('name', Role::SUPER_ADMIN)->firstOrFail();
        $teacherRole = Role::where('name', Role::TEACHER)->firstOrFail();
        $studentRole = Role::where('name', Role::STUDENT)->firstOrFail();

        $this->admin = User::create([
            'name' => 'Dr. Super Administrator',
            'email' => 'superadmin@oni-test.edu',
            'password' => Hash::make('Password@123'),
            'status' => 'active',
        ]);
        $this->admin->roles()->sync([$superAdminRole->id]);

        $this->teacher = User::create([
            'name' => 'Prof. Charles Xavier',
            'email' => 'prof.xavier@oni-test.edu',
            'password' => Hash::make('Password@123'),
            'status' => 'active',
        ]);
        $this->teacher->roles()->sync([$teacherRole->id]);

        $this->student = User::create([
            'name' => 'Jean Grey',
            'email' => 'jean.grey@oni-test.edu',
            'password' => Hash::make('Password@123'),
            'status' => 'active',
        ]);
        $this->student->roles()->sync([$studentRole->id]);

        $this->dept = Department::create([
            'name' => 'Department of Computer Science',
            'code' => 'CS',
            'status' => 'active',
        ]);
    }

    public function test_admin_can_list_users(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/users');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'name', 'email', 'status', 'roles'],
                ],
            ]);
    }

    public function test_admin_can_filter_users_by_role_and_search(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/users?role=student&search=Jean');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.email', 'jean.grey@oni-test.edu');
    }

    public function test_admin_can_create_student_and_teacher(): void
    {
        // 1. Create Teacher
        $teacherRes = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/users', [
                'name' => 'Dr. Hank McCoy',
                'email' => 'beast@oni-test.edu',
                'password' => 'XavierSecret@2026',
                'role' => 'teacher',
                'department_id' => $this->dept->id,
                'employee_id_number' => 'FAC-009',
                'designation' => 'Associate Professor',
            ]);

        $teacherRes->assertStatus(201)
            ->assertJsonPath('data.name', 'Dr. Hank McCoy')
            ->assertJsonPath('data.teacher_profile.employee_id_number', 'FAC-009');

        $this->assertDatabaseHas('users', ['email' => 'beast@oni-test.edu']);
        $this->assertDatabaseHas('teacher_profiles', ['employee_id_number' => 'FAC-009']);

        // 2. Create Student
        $studentRes = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/users', [
                'name' => 'Scott Summers',
                'email' => 'cyclops@oni-test.edu',
                'password' => 'XavierSecret@2026',
                'role' => 'student',
                'student_id_number' => 'STU-2026-001',
                'current_semester' => 2,
            ]);

        $studentRes->assertStatus(201)
            ->assertJsonPath('data.name', 'Scott Summers')
            ->assertJsonPath('data.student_profile.student_id_number', 'STU-2026-001');

        $this->assertDatabaseHas('users', ['email' => 'cyclops@oni-test.edu']);
        $this->assertDatabaseHas('student_profiles', ['student_id_number' => 'STU-2026-001']);
    }

    public function test_admin_can_update_user_and_status(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/v1/users/{$this->student->id}", [
                'name' => 'Jean Grey-Summers',
                'status' => 'suspended',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.name', 'Jean Grey-Summers')
            ->assertJsonPath('data.status', 'suspended');

        $this->assertDatabaseHas('users', [
            'id' => $this->student->id,
            'name' => 'Jean Grey-Summers',
            'status' => 'suspended',
        ]);
    }

    public function test_admin_can_reset_user_password(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/v1/users/{$this->student->id}/reset-password", [
                'password' => 'NewStrongPassword@2026!',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('message', 'Password reset successfully for ' . $this->student->name . '.');

        $this->student->refresh();
        $this->assertTrue(Hash::check('NewStrongPassword@2026!', $this->student->password));
    }

    public function test_admin_cannot_delete_self(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->deleteJson("/api/v1/users/{$this->admin->id}");

        $response->assertStatus(400);
    }

    public function test_student_cannot_access_user_directory(): void
    {
        $response = $this->actingAs($this->student, 'sanctum')
            ->getJson('/api/v1/users');

        $response->assertStatus(403);
    }

    public function test_admin_can_bulk_import_students(): void
    {
        $payload = [
            'students' => [
                [
                    'name' => 'Alice Walker',
                    'email' => 'alice.walker@oni-test.edu',
                    'student_id_number' => 'STU-2026-001',
                    'phone' => '+15550199',
                ],
                [
                    'name' => 'Brian Kernighan',
                    'email' => 'brian.k@oni-test.edu',
                    'student_id_number' => 'STU-2026-002',
                    'phone' => '+15550200',
                ],
            ],
        ];

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/students/import', $payload);

        $response->assertStatus(200)
            ->assertJsonPath('imported_count', 2);

        $this->assertDatabaseHas('users', ['email' => 'alice.walker@oni-test.edu']);
        $this->assertDatabaseHas('users', ['email' => 'brian.k@oni-test.edu']);
        $this->assertDatabaseHas('student_profiles', ['student_id_number' => 'STU-2026-001']);
    }
}
