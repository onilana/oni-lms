<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Role;
use App\Models\User;
use App\Services\AuditService;
use Database\Seeders\RoleAndPermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuditAndBackupTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $student;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleAndPermissionSeeder::class);

        $this->admin = User::where('email', 'admin@onilms.edu')->first();
        $this->student = User::where('email', 'student@onilms.edu')->first();

        AuditService::log('user.login', $this->student, 'User', $this->student->id);
        AuditService::log('exam.published', $this->admin, 'Exam', 'sample-exam-id');
    }

    public function test_all_seven_specification_roles_exist_and_seed_properly(): void
    {
        $expectedRoles = [
            Role::SUPER_ADMIN,
            Role::COLLEGE_ADMIN,
            Role::DEPT_ADMIN,
            Role::HOD,
            Role::TEACHER,
            Role::STUDENT,
            Role::SUPPORT_STAFF,
        ];

        foreach ($expectedRoles as $roleName) {
            $this->assertDatabaseHas('roles', ['name' => $roleName]);
        }
    }

    public function test_admin_can_retrieve_audit_logs_and_stats(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/audit-logs');

        $response->assertStatus(200)
            ->assertJsonPath('total', 2);

        $statsResponse = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/audit-logs/stats');

        $statsResponse->assertStatus(200)
            ->assertJsonPath('total_events', 2);
    }

    public function test_student_cannot_retrieve_audit_logs(): void
    {
        $response = $this->actingAs($this->student, 'sanctum')
            ->getJson('/api/v1/audit-logs');

        $response->assertStatus(403);
    }

    public function test_admin_can_create_and_list_backups(): void
    {
        $createResponse = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/backups');

        $createResponse->assertStatus(201)
            ->assertJsonPath('message', 'Database snapshot created successfully.')
            ->assertJsonStructure(['backup' => ['filename', 'size_bytes', 'sha256']]);

        $listResponse = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/backups');

        $listResponse->assertStatus(200)
            ->assertJsonStructure(['database_engine', 'automated_schedule', 'data']);
    }

    public function test_student_cannot_manage_backups(): void
    {
        $response = $this->actingAs($this->student, 'sanctum')
            ->postJson('/api/v1/backups');

        $response->assertStatus(403);
    }
}
