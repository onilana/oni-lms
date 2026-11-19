<?php

namespace Tests\Feature;

use App\Models\AcademicSession;
use App\Models\Assignment;
use App\Models\AssignmentSubmission;
use App\Models\Course;
use App\Models\CourseEnrolment;
use App\Models\CourseInstructor;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\AcademicSeeder;
use Database\Seeders\AssignmentSeeder;
use Database\Seeders\CourseSeeder;
use Database\Seeders\RoleAndPermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AssignmentTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private string $adminToken;
    private User $teacher;
    private string $teacherToken;
    private User $enrolledStudent;
    private string $enrolledToken;
    private User $nonEnrolledStudent;
    private string $nonEnrolledToken;
    private Course $course;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleAndPermissionSeeder::class);
        $this->seed(AcademicSeeder::class);
        $this->seed(CourseSeeder::class);
        $this->seed(AssignmentSeeder::class);

        $this->course = Course::where('code', 'CS101')->first();
        $session = AcademicSession::where('is_current', true)->first();

        // 1. Admin
        $this->admin = User::where('email', 'admin@onilms.edu')->first();
        $this->adminToken = $this->admin->createToken('admin-token')->plainTextToken;

        // 2. Teacher
        $teacherRole = Role::where('name', Role::TEACHER)->first();
        $this->teacher = User::create([
            'name' => 'Prof. Edsger Dijkstra',
            'email' => 'dijkstra@faculty.onilms.edu',
            'password' => Hash::make('Teacher123!'),
            'status' => 'active',
        ]);
        $this->teacher->roles()->attach($teacherRole->id);
        $this->teacherToken = $this->teacher->createToken('teacher-token')->plainTextToken;

        CourseInstructor::create([
            'course_id' => $this->course->id,
            'user_id' => $this->teacher->id,
            'role' => 'lead',
        ]);

        // 3. Enrolled Student
        $studentRole = Role::where('name', Role::STUDENT)->first();
        $this->enrolledStudent = User::create([
            'name' => 'Donald Knuth',
            'email' => 'knuth@student.onilms.edu',
            'password' => Hash::make('Student123!'),
            'status' => 'active',
        ]);
        $this->enrolledStudent->roles()->attach($studentRole->id);
        $this->enrolledToken = $this->enrolledStudent->createToken('enrolled-token')->plainTextToken;

        CourseEnrolment::create([
            'course_id' => $this->course->id,
            'user_id' => $this->enrolledStudent->id,
            'academic_session_id' => $session->id,
            'status' => 'enrolled',
        ]);

        // 4. Non-enrolled Student
        $this->nonEnrolledStudent = User::create([
            'name' => 'Linus Torvalds',
            'email' => 'linus@student.onilms.edu',
            'password' => Hash::make('Student123!'),
            'status' => 'active',
        ]);
        $this->nonEnrolledStudent->roles()->attach($studentRole->id);
        $this->nonEnrolledToken = $this->nonEnrolledStudent->createToken('non-enrolled-token')->plainTextToken;
    }

    public function test_authenticated_user_can_list_published_assignments(): void
    {
        $response = $this->withHeader('Authorization', 'Bearer '.$this->enrolledToken)
            ->getJson('/api/v1/courses/'.$this->course->id.'/assignments');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'assignments' => [
                    '*' => [
                        'id',
                        'title',
                        'due_date',
                        'max_score',
                        'submission_type',
                        'status',
                    ],
                ],
            ]);

        $this->assertCount(2, $response->json('assignments'));
    }

    public function test_instructor_can_create_assignment(): void
    {
        $response = $this->withHeader('Authorization', 'Bearer '.$this->teacherToken)
            ->postJson('/api/v1/courses/'.$this->course->id.'/assignments', [
                'title' => 'Lab 3: Binary Search Tree Balancing',
                'description' => 'Implement AVL rotations and height calculations.',
                'due_date' => now()->addDays(5)->toIso8601String(),
                'max_score' => 100,
                'submission_type' => 'both',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('assignment.title', 'Lab 3: Binary Search Tree Balancing')
            ->assertJsonPath('assignment.max_score', 100);

        $this->assertDatabaseHas('assignments', ['title' => 'Lab 3: Binary Search Tree Balancing']);
    }

    public function test_enrolled_student_can_submit_assignment(): void
    {
        $assignment = Assignment::where('course_id', $this->course->id)->first();

        $response = $this->withHeader('Authorization', 'Bearer '.$this->enrolledToken)
            ->postJson('/api/v1/assignments/'.$assignment->id.'/submit', [
                'submission_text' => 'https://github.com/knuth/cs101-linked-list.git',
                'attachment_name' => 'solution.zip',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('submission.status', 'submitted')
            ->assertJsonPath('submission.is_late', false);

        $this->assertDatabaseHas('assignment_submissions', [
            'assignment_id' => $assignment->id,
            'user_id' => $this->enrolledStudent->id,
        ]);
    }

    public function test_past_due_submission_is_flagged_as_late(): void
    {
        $pastDueAssignment = Assignment::create([
            'course_id' => $this->course->id,
            'title' => 'Expired Homework',
            'due_date' => now()->subDay(),
            'max_score' => 50,
            'status' => 'published',
        ]);

        $response = $this->withHeader('Authorization', 'Bearer '.$this->enrolledToken)
            ->postJson('/api/v1/assignments/'.$pastDueAssignment->id.'/submit', [
                'submission_text' => 'Late submission solution.',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('submission.is_late', true);
    }

    public function test_non_enrolled_student_cannot_submit_assignment(): void
    {
        $assignment = Assignment::where('course_id', $this->course->id)->first();

        $response = $this->withHeader('Authorization', 'Bearer '.$this->nonEnrolledToken)
            ->postJson('/api/v1/assignments/'.$assignment->id.'/submit', [
                'submission_text' => 'Unauthorized attempt.',
            ]);

        $response->assertStatus(403);
    }

    public function test_instructor_can_grade_submission_with_score_and_feedback(): void
    {
        $assignment = Assignment::where('course_id', $this->course->id)->first();

        $submission = AssignmentSubmission::create([
            'assignment_id' => $assignment->id,
            'user_id' => $this->enrolledStudent->id,
            'submission_text' => 'Working solution.',
            'status' => 'submitted',
        ]);

        $response = $this->withHeader('Authorization', 'Bearer '.$this->teacherToken)
            ->postJson('/api/v1/submissions/'.$submission->id.'/grade', [
                'score' => 95,
                'feedback' => 'Exceptional implementation with clean edge-case handling.',
                'status' => 'graded',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('submission.score', 95)
            ->assertJsonPath('submission.status', 'graded')
            ->assertJsonPath('submission.grader.id', $this->teacher->id);

        $this->assertDatabaseHas('assignment_submissions', [
            'id' => $submission->id,
            'score' => 95,
            'status' => 'graded',
        ]);
    }

    public function test_grading_fails_if_score_exceeds_max_score(): void
    {
        $assignment = Assignment::where('course_id', $this->course->id)->first(); // max_score = 100

        $submission = AssignmentSubmission::create([
            'assignment_id' => $assignment->id,
            'user_id' => $this->enrolledStudent->id,
            'submission_text' => 'Solution.',
            'status' => 'submitted',
        ]);

        $response = $this->withHeader('Authorization', 'Bearer '.$this->teacherToken)
            ->postJson('/api/v1/submissions/'.$submission->id.'/grade', [
                'score' => 150, // Exceeds 100
                'feedback' => 'Impossible score.',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['score']);
    }

    public function test_student_can_view_own_submission_and_grade(): void
    {
        $assignment = Assignment::where('course_id', $this->course->id)->first();

        AssignmentSubmission::create([
            'assignment_id' => $assignment->id,
            'user_id' => $this->enrolledStudent->id,
            'submission_text' => 'Completed task.',
            'status' => 'graded',
            'score' => 88,
            'feedback' => 'Well structured.',
            'graded_by_id' => $this->teacher->id,
            'graded_at' => now(),
        ]);

        $response = $this->withHeader('Authorization', 'Bearer '.$this->enrolledToken)
            ->getJson('/api/v1/assignments/'.$assignment->id.'/my-submission');

        $response->assertStatus(200)
            ->assertJsonPath('submission.score', 88)
            ->assertJsonPath('submission.feedback', 'Well structured.');
    }
}
