<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\CourseEnrolment;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\AcademicSeeder;
use Database\Seeders\CourseSeeder;
use Database\Seeders\RoleAndPermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StudentDashboardTest extends TestCase
{
    use RefreshDatabase;

    private User $student;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleAndPermissionSeeder::class);
        $this->seed(AcademicSeeder::class);
        $this->seed(CourseSeeder::class);

        $this->student = User::where('email', 'student@onilms.edu')->firstOrFail();
    }

    public function test_student_can_fetch_dashboard_summary(): void
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
}
