<?php

namespace Tests\Feature;

use App\Models\AcademicSession;
use App\Models\Department;
use App\Models\Programme;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\AcademicSeeder;
use Database\Seeders\RoleAndPermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AcademicStructureTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private string $adminToken;
    private User $student;
    private string $studentToken;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleAndPermissionSeeder::class);
        $this->seed(AcademicSeeder::class);

        $this->admin = User::where('email', 'admin@onilms.edu')->first();
        $this->adminToken = $this->admin->createToken('admin-token')->plainTextToken;

        $studentRole = Role::where('name', Role::STUDENT)->first();
        $this->student = User::create([
            'name' => 'John Student',
            'email' => 'john@student.onilms.edu',
            'password' => Hash::make('Secret123!'),
            'status' => 'active',
        ]);
        $this->student->roles()->attach($studentRole->id);
        $this->studentToken = $this->student->createToken('student-token')->plainTextToken;
    }

    public function test_authenticated_user_can_list_departments(): void
    {
        $response = $this->withHeader('Authorization', 'Bearer '.$this->studentToken)
            ->getJson('/api/v1/academic/departments');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'departments' => [
                    '*' => [
                        'id',
                        'name',
                        'code',
                        'status',
                        'programmes_count',
                        'teachers_count',
                    ],
                ],
            ]);

        $this->assertCount(Department::count(), $response->json('departments'));
        $this->assertGreaterThanOrEqual(15, count($response->json('departments')));
    }

    public function test_admin_can_create_department(): void
    {
        $response = $this->withHeader('Authorization', 'Bearer '.$this->adminToken)
            ->postJson('/api/v1/academic/departments', [
                'name' => 'Department of Mechanical Engineering',
                'code' => 'MECH',
                'description' => 'Thermodynamics, mechanics, and design.',
                'status' => 'active',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('department.code', 'MECH')
            ->assertJsonPath('department.name', 'Department of Mechanical Engineering');

        $this->assertDatabaseHas('departments', ['code' => 'MECH']);
    }

    public function test_department_creation_requires_unique_code(): void
    {
        $response = $this->withHeader('Authorization', 'Bearer '.$this->adminToken)
            ->postJson('/api/v1/academic/departments', [
                'name' => 'Duplicate Computer Science',
                'code' => 'CSE', // Already seeded
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['code']);
    }

    public function test_admin_can_create_programme_under_department(): void
    {
        $cse = Department::where('code', 'CSE')->first();

        $response = $this->withHeader('Authorization', 'Bearer '.$this->adminToken)
            ->postJson('/api/v1/academic/programmes', [
                'department_id' => $cse->id,
                'name' => 'Master of Computer Applications',
                'code' => 'MCA',
                'duration_years' => 2,
                'total_semesters' => 4,
                'status' => 'active',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('programme.code', 'MCA')
            ->assertJsonPath('programme.total_semesters', 4);

        $this->assertDatabaseHas('programmes', ['code' => 'MCA', 'department_id' => $cse->id]);
    }

    public function test_admin_can_create_academic_session_and_toggle_current(): void
    {
        $response = $this->withHeader('Authorization', 'Bearer '.$this->adminToken)
            ->postJson('/api/v1/academic/sessions', [
                'name' => '2027-2028',
                'start_date' => '2027-08-01',
                'end_date' => '2028-05-31',
                'is_current' => true,
                'status' => 'active',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('session.is_current', true);

        // Previous current session (2026-2027) must now be false
        $prev = AcademicSession::where('name', '2026-2027')->first();
        $this->assertFalse($prev->is_current);
    }

    public function test_admin_can_create_semester_under_session(): void
    {
        $session = AcademicSession::where('name', '2026-2027')->first();

        $response = $this->withHeader('Authorization', 'Bearer '.$this->adminToken)
            ->postJson('/api/v1/academic/semesters', [
                'academic_session_id' => $session->id,
                'name' => 'Summer Intensive (Sem 3)',
                'semester_number' => 3,
                'start_date' => '2027-06-01',
                'end_date' => '2027-07-31',
                'is_active' => false,
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('semester.semester_number', 3);
    }

    public function test_admin_can_create_batch(): void
    {
        $programme = Programme::where('code', 'BTECH-CSE')->first();
        $session = AcademicSession::where('name', '2026-2027')->first();

        $response = $this->withHeader('Authorization', 'Bearer '.$this->adminToken)
            ->postJson('/api/v1/academic/batches', [
                'programme_id' => $programme->id,
                'academic_session_id' => $session->id,
                'name' => 'B.Tech CSE Honours — 2026',
                'code' => 'CSE-HONS-2026',
                'max_capacity' => 60,
                'status' => 'active',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('batch.code', 'CSE-HONS-2026');
    }

    public function test_student_without_academic_manage_cannot_create_department(): void
    {
        $response = $this->withHeader('Authorization', 'Bearer '.$this->studentToken)
            ->postJson('/api/v1/academic/departments', [
                'name' => 'Unauthorized Department',
                'code' => 'UNAUTH',
            ]);

        $response->assertStatus(403);
    }

    public function test_unauthenticated_request_is_rejected(): void
    {
        $response = $this->getJson('/api/v1/academic/departments');

        $response->assertStatus(401);
    }
}
