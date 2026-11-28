<?php

namespace Tests\Feature;

use App\Models\Assignment;
use App\Models\Course;
use App\Models\CourseSection;
use App\Models\Department;
use App\Models\Exam;
use App\Models\Lesson;
use App\Models\Programme;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\RoleAndPermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class RbacPolicyTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $otherTeacher;
    private User $student;
    private User $supportStaff;
    private Course $draftCourse;
    private Course $publishedCourse;
    private CourseSection $section;
    private Lesson $lesson;
    private Assignment $draftAssignment;
    private Exam $draftExam;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleAndPermissionSeeder::class);

        $this->admin = User::where('email', 'admin@educare.edu')->first();

        $deptA = Department::create(['code' => 'CSE', 'name' => 'Computer Science', 'is_active' => true]);
        $deptB = Department::create(['code' => 'ECE', 'name' => 'Electronics', 'is_active' => true]);
        $prog = Programme::create([
            'department_id' => $deptA->id,
            'code' => 'BTECH-CSE',
            'name' => 'B.Tech CSE',
            'degree_type' => 'undergraduate',
            'duration_semesters' => 8,
            'is_active' => true,
        ]);

        $this->otherTeacher = User::create([
            'name' => 'Other Dept Teacher',
            'email' => 'other.teacher@educare.edu',
            'password' => Hash::make('Secret123!'),
            'department_id' => $deptB->id,
            'status' => 'active',
        ]);
        $this->otherTeacher->roles()->attach(Role::where('name', Role::TEACHER)->first()->id);

        $this->student = User::create([
            'name' => 'Student User',
            'email' => 'student.rbac@educare.edu',
            'password' => Hash::make('Secret123!'),
            'status' => 'active',
        ]);
        $this->student->roles()->attach(Role::where('name', Role::STUDENT)->first()->id);

        $this->supportStaff = User::create([
            'name' => 'Support User',
            'email' => 'support.rbac@educare.edu',
            'password' => Hash::make('Secret123!'),
            'status' => 'active',
        ]);
        $this->supportStaff->roles()->attach(Role::where('name', Role::SUPPORT_STAFF)->first()->id);

        $this->draftCourse = Course::create([
            'department_id' => $deptA->id,
            'programme_id' => $prog->id,
            'code' => 'CS401',
            'title' => 'Draft Systems Course',
            'credits' => 4,
            'status' => 'draft',
            'created_by_id' => $this->admin->id,
        ]);

        $this->publishedCourse = Course::create([
            'department_id' => $deptA->id,
            'programme_id' => $prog->id,
            'code' => 'CS102',
            'title' => 'Published Algorithms',
            'credits' => 4,
            'status' => 'published',
            'created_by_id' => $this->admin->id,
        ]);

        $this->section = CourseSection::create([
            'course_id' => $this->publishedCourse->id,
            'title' => 'Module 1',
            'order_index' => 1,
        ]);

        $this->lesson = Lesson::create([
            'course_id' => $this->publishedCourse->id,
            'section_id' => $this->section->id,
            'title' => 'Protected Lesson',
            'type' => 'text',
            'content' => 'Private lesson content',
            'order_index' => 1,
            'is_free_preview' => false,
            'is_published' => true,
        ]);

        $this->draftAssignment = Assignment::create([
            'course_id' => $this->publishedCourse->id,
            'created_by_id' => $this->admin->id,
            'title' => 'Draft Assignment',
            'status' => 'draft',
            'max_marks' => 100,
            'due_date' => now()->addWeek(),
        ]);

        $this->draftExam = Exam::create([
            'course_id' => $this->publishedCourse->id,
            'created_by' => $this->admin->id,
            'title' => 'Draft Exam',
            'duration_minutes' => 60,
            'total_marks' => 100,
            'passing_marks' => 40,
            'is_published' => false,
        ]);
    }

    public function test_unauthorized_roles_cannot_view_cross_department_or_draft_courses(): void
    {
        $this->actingAs($this->student, 'sanctum')
            ->getJson('/api/v1/courses/' . $this->draftCourse->id)
            ->assertStatus(403);

        $this->actingAs($this->supportStaff, 'sanctum')
            ->getJson('/api/v1/courses/' . $this->draftCourse->id)
            ->assertStatus(403);

        $this->actingAs($this->otherTeacher, 'sanctum')
            ->getJson('/api/v1/courses/' . $this->publishedCourse->id)
            ->assertStatus(403);
    }

    public function test_unauthorized_roles_cannot_access_or_delete_lessons(): void
    {
        $this->actingAs($this->student, 'sanctum')
            ->getJson('/api/v1/lessons/' . $this->lesson->id . '/access')
            ->assertStatus(403);

        $this->actingAs($this->student, 'sanctum')
            ->postJson('/api/v1/lessons/' . $this->lesson->id . '/progress', [
                'is_completed' => true,
            ])
            ->assertStatus(403);

        $this->actingAs($this->otherTeacher, 'sanctum')
            ->getJson('/api/v1/sections/' . $this->section->id . '/lessons')
            ->assertStatus(403);

        $this->actingAs($this->otherTeacher, 'sanctum')
            ->deleteJson('/api/v1/lessons/' . $this->lesson->id)
            ->assertStatus(403);

        $this->actingAs($this->supportStaff, 'sanctum')
            ->deleteJson('/api/v1/lessons/' . $this->lesson->id)
            ->assertStatus(403);
    }

    public function test_unauthorized_roles_cannot_view_or_delete_draft_assignments_and_exams(): void
    {
        $this->actingAs($this->student, 'sanctum')
            ->getJson('/api/v1/assignments/' . $this->draftAssignment->id)
            ->assertStatus(404);

        $this->actingAs($this->otherTeacher, 'sanctum')
            ->deleteJson('/api/v1/assignments/' . $this->draftAssignment->id)
            ->assertStatus(403);

        $this->actingAs($this->student, 'sanctum')
            ->getJson('/api/v1/exams/' . $this->draftExam->id)
            ->assertStatus(404);

        $this->actingAs($this->otherTeacher, 'sanctum')
            ->deleteJson('/api/v1/exams/' . $this->draftExam->id)
            ->assertStatus(403);

        $this->actingAs($this->supportStaff, 'sanctum')
            ->deleteJson('/api/v1/exams/' . $this->draftExam->id)
            ->assertStatus(403);
    }

    public function test_super_admin_has_global_gate_override_authority(): void
    {
        $this->assertTrue(\Illuminate\Support\Facades\Gate::forUser($this->admin)->allows('any-arbitrary-ability'));
        $this->assertFalse(\Illuminate\Support\Facades\Gate::forUser($this->student)->allows('any-arbitrary-ability'));
    }

    public function test_super_admin_can_overwrite_existing_users_in_bulk_enroll_but_college_admin_cannot(): void
    {
        $collegeAdmin = User::create([
            'name' => 'College Admin',
            'email' => 'college.admin.rbac@educare.edu',
            'password' => Hash::make('Secret123!'),
            'status' => 'active',
        ]);
        $collegeAdmin->roles()->attach(Role::where('name', Role::COLLEGE_ADMIN)->first()->id);

        // Non-super-admin cannot use overwrite
        $this->actingAs($collegeAdmin, 'sanctum')
            ->postJson('/api/v1/users/bulk-enroll', [
                'overwrite' => true,
                'users' => [
                    ['name' => 'Hijacked Name', 'email' => $this->student->email, 'role' => 'student'],
                ],
            ])
            ->assertStatus(403);

        // Super admin can overwrite existing user
        $this->app['auth']->forgetGuards();
        $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/users/bulk-enroll', [
                'overwrite' => true,
                'users' => [
                    ['name' => 'Overwritten Student Name', 'email' => $this->student->email, 'role' => 'student'],
                ],
            ])
            ->assertStatus(200)
            ->assertJsonPath('updated_count', 1);

        $this->assertDatabaseHas('users', [
            'id' => $this->student->id,
            'name' => 'Overwritten Student Name',
        ]);
    }

    public function test_non_super_admin_cannot_overwrite_super_admin_account(): void
    {
        $collegeAdmin = User::create([
            'name' => 'College Admin',
            'email' => 'college.admin.protect@educare.edu',
            'password' => Hash::make('Secret123!'),
            'status' => 'active',
        ]);
        $collegeAdmin->roles()->attach(Role::where('name', Role::COLLEGE_ADMIN)->first()->id);

        $this->actingAs($collegeAdmin, 'sanctum')
            ->putJson('/api/v1/users/' . $this->admin->id, [
                'name' => 'Tampered Super Admin',
            ])
            ->assertStatus(403);

        $this->actingAs($collegeAdmin, 'sanctum')
            ->postJson('/api/v1/users/' . $this->admin->id . '/reset-password', [
                'password' => 'NewSecret123!',
            ])
            ->assertStatus(403);

        $this->actingAs($collegeAdmin, 'sanctum')
            ->deleteJson('/api/v1/users/' . $this->admin->id)
            ->assertStatus(403);
    }

    public function test_super_admin_can_update_student_details_even_with_blank_student_id(): void
    {
        $prog = Programme::first();
        $deptId = $prog->department_id;

        $this->actingAs($this->admin, 'sanctum')
            ->putJson('/api/v1/users/' . $this->student->id, [
                'name' => 'Updated Student Name',
                'email' => $this->student->email,
                'status' => 'active',
                'role' => Role::STUDENT,
                'department_id' => $deptId,
                'employee_id_number' => null,
                'designation' => null,
                'programme_id' => $prog->id,
                'batch_id' => null,
                'student_id_number' => null,
                'current_semester' => 2,
            ])
            ->assertStatus(200)
            ->assertJsonPath('data.name', 'Updated Student Name')
            ->assertJsonPath('data.student_profile.current_semester', 2);

        $this->assertDatabaseMissing('teacher_profiles', ['user_id' => $this->student->id]);
        $this->assertNotNull($this->student->fresh()->studentProfile->student_id_number);
    }

    public function test_attendance_endpoints_block_students_and_unrelated_teachers(): void
    {
        $session = \App\Models\AttendanceSession::create([
            'course_id' => $this->publishedCourse->id,
            'instructor_id' => $this->admin->id,
            'session_date' => now()->toDateString(),
            'topic' => 'Lecture 1',
            'status' => 'completed',
        ]);

        $this->actingAs($this->student, 'sanctum')
            ->getJson('/api/v1/courses/' . $this->publishedCourse->id . '/attendance/sessions')
            ->assertStatus(403);

        $this->actingAs($this->student, 'sanctum')
            ->getJson('/api/v1/attendance/sessions/' . $session->id)
            ->assertStatus(403);

        $this->actingAs($this->student, 'sanctum')
            ->getJson('/api/v1/courses/' . $this->publishedCourse->id . '/attendance/summary')
            ->assertStatus(403);

        $this->actingAs($this->otherTeacher, 'sanctum')
            ->getJson('/api/v1/courses/' . $this->publishedCourse->id . '/attendance/summary')
            ->assertStatus(403);
    }

    public function test_question_bank_blocks_students_and_unrelated_teachers(): void
    {
        $question = \App\Models\Question::create([
            'course_id' => $this->publishedCourse->id,
            'created_by' => $this->admin->id,
            'type' => 'mcq',
            'question_text' => 'What is Big-O of binary search?',
            'options' => ['O(1)', 'O(log n)', 'O(n)', 'O(n^2)'],
            'correct_answers' => ['O(log n)'],
            'marks' => 2,
        ]);

        $this->actingAs($this->student, 'sanctum')
            ->getJson('/api/v1/questions?course_id=' . $this->publishedCourse->id)
            ->assertStatus(403);

        $this->actingAs($this->student, 'sanctum')
            ->getJson('/api/v1/questions/' . $question->id)
            ->assertStatus(403);

        $this->actingAs($this->otherTeacher, 'sanctum')
            ->getJson('/api/v1/questions?course_id=' . $this->publishedCourse->id)
            ->assertStatus(403);

        $this->actingAs($this->otherTeacher, 'sanctum')
            ->getJson('/api/v1/questions/' . $question->id)
            ->assertStatus(403);
    }

    public function test_student_cannot_manipulate_enrolment_status_or_enrol_in_draft_course(): void
    {
        $academicSession = \App\Models\AcademicSession::create([
            'name' => '2026-2027',
            'start_date' => '2026-08-01',
            'end_date' => '2027-05-31',
            'is_current' => true,
            'status' => 'active',
        ]);

        $this->actingAs($this->student, 'sanctum')
            ->postJson('/api/v1/courses/' . $this->publishedCourse->id . '/enroll', [
                'academic_session_id' => $academicSession->id,
                'status' => 'completed',
            ])
            ->assertStatus(403);

        $this->actingAs($this->student, 'sanctum')
            ->postJson('/api/v1/courses/' . $this->draftCourse->id . '/enroll', [
                'academic_session_id' => $academicSession->id,
            ])
            ->assertStatus(422);
    }

    public function test_must_change_password_blocks_protected_api_routes_until_changed(): void
    {
        $this->student->forceFill(['must_change_password' => true])->save();

        $this->actingAs($this->student, 'sanctum')
            ->getJson('/api/v1/courses')
            ->assertStatus(403)
            ->assertJsonPath('must_change_password', true);

        $this->actingAs($this->student, 'sanctum')
            ->getJson('/api/v1/auth/me')
            ->assertStatus(200);

        $this->actingAs($this->student, 'sanctum')
            ->postJson('/api/v1/auth/change-password', [
                'current_password' => 'Secret123!',
                'new_password' => 'NewSecret123!',
                'new_password_confirmation' => 'NewSecret123!',
            ])
            ->assertStatus(200);

        $this->actingAs($this->student->fresh(), 'sanctum')
            ->getJson('/api/v1/courses')
            ->assertStatus(200);
    }

    public function test_sso_rejects_inactive_accounts_even_with_valid_signature(): void
    {
        config(['wordpress.webhook_secret' => 'test-sso-secret-key-123456']);
        $this->student->update(['status' => 'inactive']);

        $claims = [
            'iss' => rtrim((string) config('wordpress.url'), '/'),
            'aud' => rtrim((string) config('app.url'), '/'),
            'email' => $this->student->email,
            'email_verified' => true,
            'name' => $this->student->name,
            'iat' => time(),
            'exp' => time() + 300,
            'nonce' => 'nonce-' . uniqid('', true),
        ];
        $payload = rtrim(strtr(base64_encode(json_encode($claims)), '+/', '-_'), '=');
        $sig = hash_hmac('sha256', $payload, 'test-sso-secret-key-123456');

        $this->postJson('/api/v1/integrations/wordpress/sso-handshake', [
            'email' => $this->student->email,
            'name' => $this->student->name,
            'token' => $payload . '.' . $sig,
        ])->assertStatus(403);
    }
}
