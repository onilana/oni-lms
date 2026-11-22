<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Database\Seeders\AcademicSeeder;
use Database\Seeders\CourseSeeder;
use Database\Seeders\RoleAndPermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    private User $student;
    private User $teacher;
    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleAndPermissionSeeder::class);
        $this->seed(AcademicSeeder::class);
        $this->seed(CourseSeeder::class);

        $this->student = User::where('email', 'student@onilms.edu')->firstOrFail();
        $this->teacher = User::where('email', 'teacher@onilms.edu')->firstOrFail();
        $this->admin = User::where('email', 'admin@onilms.edu')->firstOrFail();
    }

    public function test_student_can_fetch_student_dashboard(): void
    {
        $response = $this->actingAs($this->student)
            ->getJson('/api/v1/dashboard/student');

        $response->assertStatus(200)
            ->assertJsonPath('student.name', 'Aarav Sharma')
            ->assertJsonPath('student.email', 'student@onilms.edu')
            ->assertJsonStructure([
                'student' => [
                    'name',
                    'email',
                    'student_id',
                    'department',
                    'programme',
                    'batch',
                    'current_semester',
                    'academic_session',
                ],
                'metrics' => [
                    'enrolled_courses_count',
                    'completed_lessons_count',
                    'total_lessons_count',
                    'overall_progress_percentage',
                    'pending_assignments_count',
                    'attendance_percentage',
                ],
                'enrolled_courses',
                'upcoming_deadlines',
                'exams',
                'recent_grades',
            ]);
    }

    public function test_teacher_can_fetch_teacher_dashboard(): void
    {
        $response = $this->actingAs($this->teacher)
            ->getJson('/api/v1/dashboard/teacher');

        $response->assertStatus(200)
            ->assertJsonPath('teacher.name', 'Dr. Priya Ramanathan')
            ->assertJsonPath('teacher.email', 'teacher@onilms.edu')
            ->assertJsonStructure([
                'teacher' => [
                    'name',
                    'email',
                    'employee_id',
                    'department',
                    'designation',
                    'qualification',
                    'status',
                ],
                'metrics' => [
                    'active_courses_count',
                    'total_students_count',
                    'pending_evaluations_count',
                    'upcoming_live_sessions_count',
                    'total_assignments_count',
                    'total_exams_count',
                    'average_attendance_percentage',
                ],
                'teaching_courses',
                'pending_evaluations',
                'upcoming_live_sessions',
            ]);
    }

    public function test_department_dashboard_returns_department_metrics(): void
    {
        $response = $this->actingAs($this->teacher)
            ->getJson('/api/v1/dashboard/department');

        $response->assertStatus(200)
            ->assertJsonPath('department.code', 'CSE')
            ->assertJsonStructure([
                'department' => [
                    'id',
                    'name',
                    'code',
                    'description',
                    'hod_name',
                    'status',
                ],
                'metrics' => [
                    'programmes_count',
                    'faculty_count',
                    'enrolled_students_count',
                    'courses_offered_count',
                    'average_attendance_percentage',
                    'average_pass_rate_percentage',
                ],
                'programmes',
                'faculty_workloads',
                'courses',
            ]);
    }

    public function test_admin_can_fetch_admin_dashboard(): void
    {
        $response = $this->actingAs($this->admin)
            ->getJson('/api/v1/dashboard/admin');

        $response->assertStatus(200)
            ->assertJsonPath('college.name', 'ONI College of Engineering & Technology')
            ->assertJsonStructure([
                'college' => [
                    'name',
                    'code',
                    'domain',
                    'academic_session',
                    'system_version',
                ],
                'metrics' => [
                    'total_students',
                    'total_faculty',
                    'total_departments',
                    'total_courses',
                    'total_enrollments',
                    'certificates_issued',
                    'attendance_sessions',
                    'overall_attendance_rate',
                ],
                'system_health' => [
                    'application',
                    'database',
                    'redis',
                    'storage',
                    'php_version',
                    'laravel_version',
                ],
                'roles_distribution',
                'recent_audit_logs',
            ]);
    }
}
