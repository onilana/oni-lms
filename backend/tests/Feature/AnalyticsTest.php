<?php

namespace Tests\Feature;

use App\Models\AcademicSession;
use App\Models\Course;
use App\Models\CourseEnrolment;
use App\Models\Department;
use App\Models\Exam;
use App\Models\ExamAttempt;
use App\Models\Lesson;
use App\Models\LessonProgress;
use App\Models\Programme;
use App\Models\Role;
use App\Models\Semester;
use App\Models\User;
use Database\Seeders\RoleAndPermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AnalyticsTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $teacher;
    private User $student;
    private Course $course;
    private AcademicSession $session;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleAndPermissionSeeder::class);

        $this->admin = User::where('email', 'admin@educare.edu')->first();

        $this->teacher = User::factory()->create(['name' => 'Dr. Margaret Hamilton']);
        $this->teacher->roles()->attach(Role::where('name', Role::TEACHER)->first()->id);

        $this->student = User::where('email', 'student@educare.edu')->first();

        $department = Department::create([
            'code' => 'CS',
            'name' => 'Computer Science & Engineering',
            'is_active' => true,
        ]);

        $programme = Programme::create([
            'department_id' => $department->id,
            'code' => 'BSC-CS',
            'name' => 'B.Sc. Computer Science',
            'degree_type' => 'undergraduate',
            'duration_semesters' => 8,
            'is_active' => true,
        ]);

        $this->session = AcademicSession::create([
            'name' => '2026-2027 Academic Year',
            'start_date' => '2026-08-01',
            'end_date' => '2027-05-31',
            'is_current' => true,
        ]);

        $semester = Semester::create([
            'academic_session_id' => $this->session->id,
            'name' => 'Autumn 2026',
            'semester_number' => 1,
            'semester_type' => 'odd',
            'start_date' => '2026-08-01',
            'end_date' => '2026-12-20',
            'is_active' => true,
        ]);

        $this->course = Course::create([
            'department_id' => $department->id,
            'programme_id' => $programme->id,
            'code' => 'CS401',
            'title' => 'Compiler Engineering',
            'credits' => 4,
            'level' => 'advanced',
            'semester_number' => 7,
            'status' => 'published',
            'created_by_id' => $this->teacher->id,
        ]);

        $this->course->instructors()->create([
            'user_id' => $this->teacher->id,
            'role' => 'lead_instructor',
            'academic_session_id' => $this->session->id,
        ]);

        CourseEnrolment::create([
            'course_id' => $this->course->id,
            'user_id' => $this->student->id,
            'academic_session_id' => $this->session->id,
            'semester_id' => $semester->id,
            'status' => 'active',
        ]);
    }

    public function test_student_can_fetch_own_analytics(): void
    {
        $response = $this->actingAs($this->student, 'sanctum')
            ->getJson('/api/v1/analytics/student');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'student_name',
                    'student_email',
                    'summary' => [
                        'enrolled_courses_count',
                        'overall_progress_percentage',
                        'overall_attendance_percentage',
                        'has_attendance_shortage',
                        'certificates_earned_count',
                    ],
                    'courses',
                    'recent_exam_scores',
                ],
            ])
            ->assertJsonPath('data.summary.enrolled_courses_count', 1);
    }

    public function test_teacher_can_fetch_teacher_analytics_overview(): void
    {
        $response = $this->actingAs($this->teacher, 'sanctum')
            ->getJson('/api/v1/analytics/teacher');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'teacher_name',
                    'overview' => [
                        'active_courses_count',
                        'total_students_taught',
                        'total_at_risk_students',
                    ],
                    'courses',
                ],
            ]);
    }

    public function test_teacher_can_fetch_course_analytics(): void
    {
        $response = $this->actingAs($this->teacher, 'sanctum')
            ->getJson("/api/v1/analytics/courses/{$this->course->id}");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'course',
                    'metrics' => [
                        'total_enrolled',
                        'average_attendance',
                        'average_progress',
                        'at_risk_count',
                    ],
                    'grade_distribution',
                    'at_risk_students',
                    'lesson_engagement',
                    'roster',
                ],
            ])
            ->assertJsonPath('data.metrics.total_enrolled', 1);
    }

    public function test_student_cannot_inspect_course_analytics(): void
    {
        $response = $this->actingAs($this->student, 'sanctum')
            ->getJson("/api/v1/analytics/courses/{$this->course->id}");

        $response->assertStatus(403);
    }

    public function test_admin_can_fetch_college_wide_overview(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/analytics/admin');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'overview' => [
                        'total_students',
                        'total_teachers',
                        'total_courses',
                        'total_departments',
                        'total_certificates_issued',
                        'college_attendance_rate',
                        'college_exam_pass_rate',
                    ],
                    'departments',
                ],
            ]);
    }

    public function test_authorized_user_can_export_course_csv(): void
    {
        $response = $this->actingAs($this->teacher, 'sanctum')
            ->get("/api/v1/analytics/export/csv?course_id={$this->course->id}");

        $response->assertStatus(200);
        $this->assertStringContainsString('text/csv', $response->headers->get('Content-Type'));
    }
}
