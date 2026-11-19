<?php

namespace Tests\Feature;

use App\Models\AcademicSession;
use App\Models\Course;
use App\Models\Department;
use App\Models\Programme;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\AcademicSeeder;
use Database\Seeders\CourseSeeder;
use Database\Seeders\RoleAndPermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class CourseTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private string $adminToken;
    private User $teacher;
    private string $teacherToken;
    private User $student;
    private string $studentToken;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleAndPermissionSeeder::class);
        $this->seed(AcademicSeeder::class);
        $this->seed(CourseSeeder::class);

        $this->admin = User::where('email', 'admin@onilms.edu')->first();
        $this->adminToken = $this->admin->createToken('admin-token')->plainTextToken;

        // Teacher
        $teacherRole = Role::where('name', Role::TEACHER)->first();
        $this->teacher = User::create([
            'name' => 'Prof. Alan Turing',
            'email' => 'turing@faculty.onilms.edu',
            'password' => Hash::make('Teacher123!'),
            'status' => 'active',
        ]);
        $this->teacher->roles()->attach($teacherRole->id);
        $this->teacherToken = $this->teacher->createToken('teacher-token')->plainTextToken;

        // Student
        $studentRole = Role::where('name', Role::STUDENT)->first();
        $this->student = User::create([
            'name' => 'Grace Hopper',
            'email' => 'grace@student.onilms.edu',
            'password' => Hash::make('Student123!'),
            'status' => 'active',
        ]);
        $this->student->roles()->attach($studentRole->id);
        $this->studentToken = $this->student->createToken('student-token')->plainTextToken;
    }

    public function test_authenticated_user_can_list_published_courses(): void
    {
        $response = $this->withHeader('Authorization', 'Bearer '.$this->studentToken)
            ->getJson('/api/v1/courses');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'courses' => [
                    '*' => [
                        'id',
                        'code',
                        'title',
                        'credits',
                        'level',
                        'status',
                        'department',
                    ],
                ],
            ]);

        $this->assertGreaterThanOrEqual(2, count($response->json('courses')));
    }

    public function test_teacher_can_create_course(): void
    {
        $cse = Department::where('code', 'CSE')->first();

        $response = $this->withHeader('Authorization', 'Bearer '.$this->teacherToken)
            ->postJson('/api/v1/courses', [
                'department_id' => $cse->id,
                'code' => 'CS301',
                'title' => 'Operating Systems',
                'description' => 'Processes, concurrency, virtual memory, file systems.',
                'credits' => 4,
                'level' => 'Undergraduate',
                'status' => 'published',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('course.code', 'CS301')
            ->assertJsonPath('course.title', 'Operating Systems');

        $this->assertDatabaseHas('courses', ['code' => 'CS301']);
    }

    public function test_course_creation_validates_department_and_unique_code(): void
    {
        $cse = Department::where('code', 'CSE')->first();

        $response = $this->withHeader('Authorization', 'Bearer '.$this->adminToken)
            ->postJson('/api/v1/courses', [
                'department_id' => $cse->id,
                'code' => 'CS101', // Already seeded
                'title' => 'Duplicate Data Structures',
                'credits' => 3,
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['code']);
    }

    public function test_admin_can_update_course(): void
    {
        $course = Course::where('code', 'CS101')->first();

        $response = $this->withHeader('Authorization', 'Bearer '.$this->adminToken)
            ->putJson('/api/v1/courses/'.$course->id, [
                'department_id' => $course->department_id,
                'code' => 'CS101',
                'title' => 'Data Structures and Algorithms (Honours)',
                'credits' => 4,
                'status' => 'published',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('course.title', 'Data Structures and Algorithms (Honours)');
    }

    public function test_admin_can_assign_and_remove_instructor(): void
    {
        $course = Course::where('code', 'CS101')->first();

        // Assign teacher
        $assignResponse = $this->withHeader('Authorization', 'Bearer '.$this->adminToken)
            ->postJson('/api/v1/courses/'.$course->id.'/instructors', [
                'user_id' => $this->teacher->id,
                'role' => 'assistant',
            ]);

        $assignResponse->assertStatus(200)
            ->assertJsonPath('instructor.role', 'assistant');

        $this->assertDatabaseHas('course_instructors', [
            'course_id' => $course->id,
            'user_id' => $this->teacher->id,
            'role' => 'assistant',
        ]);

        // Remove instructor
        $removeResponse = $this->withHeader('Authorization', 'Bearer '.$this->adminToken)
            ->deleteJson('/api/v1/courses/'.$course->id.'/instructors/'.$this->teacher->id);

        $removeResponse->assertStatus(200);

        $this->assertDatabaseMissing('course_instructors', [
            'course_id' => $course->id,
            'user_id' => $this->teacher->id,
        ]);
    }

    public function test_student_can_enroll_in_published_course(): void
    {
        $course = Course::where('code', 'CS101')->first();
        $session = AcademicSession::where('is_current', true)->first();

        $response = $this->withHeader('Authorization', 'Bearer '.$this->studentToken)
            ->postJson('/api/v1/courses/'.$course->id.'/enroll', [
                'academic_session_id' => $session->id,
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('enrolment.status', 'enrolled')
            ->assertJsonPath('enrolment.course_id', $course->id);

        $this->assertDatabaseHas('course_enrolments', [
            'course_id' => $course->id,
            'user_id' => $this->student->id,
        ]);
    }

    public function test_duplicate_enrolment_in_same_session_is_handled(): void
    {
        $course = Course::where('code', 'CS101')->first();
        $session = AcademicSession::where('is_current', true)->first();

        // First enrolment
        $this->withHeader('Authorization', 'Bearer '.$this->studentToken)
            ->postJson('/api/v1/courses/'.$course->id.'/enroll', [
                'academic_session_id' => $session->id,
            ])->assertStatus(201);

        // Second duplicate enrolment
        $response = $this->withHeader('Authorization', 'Bearer '.$this->studentToken)
            ->postJson('/api/v1/courses/'.$course->id.'/enroll', [
                'academic_session_id' => $session->id,
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('message', 'User is already enrolled in this course for the selected session.');
    }

    public function test_student_cannot_create_course(): void
    {
        $cse = Department::where('code', 'CSE')->first();

        $response = $this->withHeader('Authorization', 'Bearer '.$this->studentToken)
            ->postJson('/api/v1/courses', [
                'department_id' => $cse->id,
                'code' => 'CS999',
                'title' => 'Unauthorized Course',
                'credits' => 3,
            ]);

        $response->assertStatus(403);
    }
}
