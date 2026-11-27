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
}
