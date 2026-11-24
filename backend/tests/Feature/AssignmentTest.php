<?php

namespace Tests\Feature;

use App\Models\AcademicSession;
use App\Models\Assignment;
use App\Models\AssignmentSubmission;
use App\Models\AssignmentSubmissionUpload;
use App\Models\Course;
use App\Models\CourseEnrolment;
use App\Models\CourseInstructor;
use App\Models\CourseSection;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\AcademicSeeder;
use Database\Seeders\AssignmentSeeder;
use Database\Seeders\CourseSeeder;
use Database\Seeders\RoleAndPermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Http\UploadedFile;
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
        Assignment::create([
            'course_id' => $this->course->id,
            'title' => 'Draft assignment in published list',
            'due_date' => now()->addDays(2),
            'submission_type' => 'text',
            'status' => 'draft',
        ]);

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

        $assignments = collect($response->json('assignments'));
        $publishedIds = Assignment::where('course_id', $this->course->id)
            ->where('status', 'published')
            ->pluck('id')
            ->all();
        $draftId = Assignment::where('title', 'Draft assignment in published list')->value('id');

        $this->assertEqualsCanonicalizing($publishedIds, $assignments->pluck('id')->all());
        $this->assertNotContains($draftId, $assignments->pluck('id')->all());
    }

    public function test_students_cannot_view_or_delete_draft_assignments(): void
    {
        $draft = Assignment::create([
            'course_id' => $this->course->id,
            'title' => 'Draft assignment',
            'due_date' => now()->addDay(),
            'status' => 'draft',
        ]);

        $this->actingAs($this->enrolledStudent)
            ->getJson('/api/v1/assignments/'.$draft->id)
            ->assertNotFound();

        $this->actingAs($this->enrolledStudent)
            ->deleteJson('/api/v1/assignments/'.$draft->id)
            ->assertForbidden();

        $this->assertDatabaseHas('assignments', ['id' => $draft->id]);
    }

    public function test_assignment_deletion_is_course_scoped_unless_global_delete_permission(): void
    {
        $otherCourse = Course::where('id', '!=', $this->course->id)->firstOrFail();
        $assignment = Assignment::create([
            'course_id' => $otherCourse->id,
            'title' => 'Other course assignment',
            'due_date' => now()->addDay(),
            'status' => 'published',
        ]);

        $this->actingAs($this->teacher)
            ->deleteJson('/api/v1/assignments/'.$assignment->id)
            ->assertForbidden();

        $globalManager = User::factory()->create();
        $globalManager->roles()->attach(Role::where('name', Role::COLLEGE_ADMIN)->value('id'));

        $this->actingAs($globalManager)
            ->deleteJson('/api/v1/assignments/'.$assignment->id)
            ->assertOk();
    }

    public function test_assignment_section_must_belong_to_the_assignment_course(): void
    {
        $otherCourse = Course::where('id', '!=', $this->course->id)->firstOrFail();
        $foreignSection = CourseSection::create([
            'course_id' => $otherCourse->id,
            'title' => 'Foreign section',
        ]);

        $this->actingAs($this->teacher)
            ->postJson('/api/v1/courses/'.$this->course->id.'/assignments', [
                'title' => 'Misplaced assignment',
                'section_id' => $foreignSection->id,
                'due_date' => now()->addDay()->toIso8601String(),
                'max_score' => 100,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['section_id']);
    }

    public function test_assignment_submission_requires_valid_content_and_published_status(): void
    {
        $both = Assignment::create([
            'course_id' => $this->course->id,
            'title' => 'Text or file submission',
            'due_date' => now()->addDay(),
            'submission_type' => 'both',
            'status' => 'published',
        ]);

        $this->actingAs($this->enrolledStudent)
            ->postJson('/api/v1/assignments/'.$both->id.'/submit', [])
            ->assertUnprocessable();

        $this->actingAs($this->enrolledStudent)
            ->postJson('/api/v1/assignments/'.$both->id.'/submit', [
                'submission_text' => 'Text is enough for the both contract.',
            ])
            ->assertCreated();

        $assignment = Assignment::create([
            'course_id' => $this->course->id,
            'title' => 'Text submission only',
            'due_date' => now()->addDay(),
            'submission_type' => 'text',
            'status' => 'published',
        ]);

        $this->actingAs($this->enrolledStudent)
            ->postJson('/api/v1/assignments/'.$assignment->id.'/submit', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['submission_text']);

        $this->actingAs($this->enrolledStudent)
            ->postJson('/api/v1/assignments/'.$assignment->id.'/submit', [
                'submission_text' => 'Text answer',
                'attachment_path' => 'submissions/file.pdf',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['attachment_path']);

        $assignment->update(['status' => 'draft']);
        $this->actingAs($this->enrolledStudent)
            ->postJson('/api/v1/assignments/'.$assignment->id.'/submit', [
                'submission_text' => 'Text answer',
            ])
            ->assertForbidden();

        $assignment->update(['status' => 'closed']);
        $this->actingAs($this->enrolledStudent)
            ->postJson('/api/v1/assignments/'.$assignment->id.'/submit', [
                'submission_text' => 'Text answer',
            ])
            ->assertForbidden();

        $this->assertDatabaseMissing('assignment_submissions', [
            'assignment_id' => $assignment->id,
            'user_id' => $this->enrolledStudent->id,
        ]);
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
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('submission.status', 'submitted')
            ->assertJsonPath('submission.is_late', false);

        $this->assertDatabaseHas('assignment_submissions', [
            'assignment_id' => $assignment->id,
            'user_id' => $this->enrolledStudent->id,
        ]);
    }

    public function test_private_assignment_attachment_upload_submission_and_download_access(): void
    {
        Storage::fake('local');
        $assignment = Assignment::create([
            'course_id' => $this->course->id,
            'title' => 'File-or-text assignment',
            'due_date' => now()->addDay(),
            'submission_type' => 'both',
            'status' => 'published',
        ]);

        $uploadResponse = $this->actingAs($this->enrolledStudent)
            ->post('/api/v1/assignments/'.$assignment->id.'/attachments', [
                'file' => UploadedFile::fake()->createWithContent('solution.pdf', 'private assignment data'),
            ]);

        $uploadResponse->assertCreated()
            ->assertJsonPath('attachment_name', 'solution.pdf');
        $reference = $uploadResponse->json('attachment_reference');
        $upload = AssignmentSubmissionUpload::findOrFail($reference);
        Storage::disk('local')->assertExists($upload->storage_path);

        $anotherStudent = User::factory()->create();
        $anotherStudent->roles()->attach(Role::where('name', Role::STUDENT)->value('id'));
        CourseEnrolment::create([
            'course_id' => $this->course->id,
            'user_id' => $anotherStudent->id,
            'academic_session_id' => AcademicSession::where('is_current', true)->value('id'),
            'status' => 'enrolled',
        ]);
        $this->actingAs($anotherStudent)
            ->postJson('/api/v1/assignments/'.$assignment->id.'/submit', [
                'attachment_path' => $reference,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['attachment_path']);

        $submissionResponse = $this->actingAs($this->enrolledStudent)
            ->postJson('/api/v1/assignments/'.$assignment->id.'/submit', [
                'attachment_path' => $reference,
                'attachment_name' => 'spoofed-name.txt',
            ]);

        $submissionResponse->assertCreated()
            ->assertJsonPath('submission.attachment_name', 'solution.pdf')
            ->assertJsonPath(
                'submission.attachment_path',
                route('api.v1.submissions.attachment', ['submission' => $submissionResponse->json('submission.id')])
            );

        $submission = AssignmentSubmission::findOrFail($submissionResponse->json('submission.id'));
        $this->assertSame($upload->storage_path, $submission->attachment_path);
        $this->assertStringNotContainsString($upload->storage_path, json_encode($submissionResponse->json()));

        $downloadResponse = $this->actingAs($this->enrolledStudent)
            ->get('/api/v1/submissions/'.$submission->id.'/attachment')
            ->assertOk()
            ->assertHeader('X-Content-Type-Options', 'nosniff');
        $this->assertSame('private assignment data', $downloadResponse->streamedContent());

        $this->actingAs($this->teacher)
            ->get('/api/v1/submissions/'.$submission->id.'/attachment')
            ->assertOk();

        $this->actingAs($this->nonEnrolledStudent)
            ->get('/api/v1/submissions/'.$submission->id.'/attachment')
            ->assertForbidden();

        $unrelatedTeacher = User::factory()->create();
        $unrelatedTeacher->roles()->attach(Role::where('name', Role::TEACHER)->value('id'));
        $this->actingAs($unrelatedTeacher)
            ->get('/api/v1/submissions/'.$submission->id.'/attachment')
            ->assertForbidden();
    }

    public function test_uploads_require_eligible_assignment_and_submission_references(): void
    {
        Storage::fake('local');
        $fileAssignment = Assignment::create([
            'course_id' => $this->course->id,
            'title' => 'File-only assignment',
            'due_date' => now()->addDay(),
            'submission_type' => 'file',
            'status' => 'published',
        ]);

        $this->actingAs($this->enrolledStudent)
            ->post('/api/v1/assignments/'.$fileAssignment->id.'/attachments', [
                'file' => UploadedFile::fake()->create('file-only.pdf', 10),
            ])
            ->assertCreated();

        $this->actingAs($this->nonEnrolledStudent)
            ->post('/api/v1/assignments/'.$fileAssignment->id.'/attachments', [
                'file' => UploadedFile::fake()->create('solution.pdf', 10),
            ])
            ->assertForbidden();

        $this->actingAs($this->enrolledStudent)
            ->postJson('/api/v1/assignments/'.$fileAssignment->id.'/submit', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['attachment_path']);

        $textAssignment = Assignment::create([
            'course_id' => $this->course->id,
            'title' => 'Text-only assignment',
            'due_date' => now()->addDay(),
            'submission_type' => 'text',
            'status' => 'published',
        ]);
        $this->actingAs($this->enrolledStudent)
            ->post('/api/v1/assignments/'.$textAssignment->id.'/attachments', [
                'file' => UploadedFile::fake()->create('solution.pdf', 10),
            ])
            ->assertForbidden();

        $this->actingAs($this->enrolledStudent)
            ->postJson('/api/v1/assignments/'.$fileAssignment->id.'/submit', [
                'attachment_path' => 'assignment-submissions/../../arbitrary.pdf',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['attachment_path']);

        $this->actingAs($this->enrolledStudent)
            ->postJson('/api/v1/assignments/'.$fileAssignment->id.'/submit', [
                'attachment_name' => 'name-only.pdf',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['attachment_path']);

        $this->actingAs($this->admin)
            ->post('/api/v1/assignments/'.$fileAssignment->id.'/attachments', [
                'file' => UploadedFile::fake()->create('admin-solution.pdf', 10),
            ])
            ->assertCreated();
    }

    public function test_resubmitting_clears_previous_grade(): void
    {
        $assignment = Assignment::where('course_id', $this->course->id)->firstOrFail();
        $submission = AssignmentSubmission::create([
            'assignment_id' => $assignment->id,
            'user_id' => $this->enrolledStudent->id,
            'submission_text' => 'Old answer',
            'status' => 'graded',
            'score' => 80,
            'feedback' => 'Old feedback',
            'graded_by_id' => $this->teacher->id,
            'graded_at' => now(),
        ]);

        $this->actingAs($this->enrolledStudent)
            ->postJson('/api/v1/assignments/'.$assignment->id.'/submit', [
                'submission_text' => 'Replacement answer',
            ])
            ->assertCreated()
            ->assertJsonPath('submission.score', null)
            ->assertJsonPath('submission.feedback', null)
            ->assertJsonPath('submission.grader', null);

        $this->assertDatabaseHas('assignment_submissions', [
            'id' => $submission->id,
            'score' => null,
            'feedback' => null,
            'graded_by_id' => null,
            'graded_at' => null,
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
        $assignment = Assignment::create([
            'course_id' => $this->course->id,
            'title' => 'Explicit 50-point grading assignment',
            'due_date' => now()->addDay(),
            'submission_type' => 'text',
            'status' => 'published',
            'max_score' => 50,
        ]);

        $submission = AssignmentSubmission::create([
            'assignment_id' => $assignment->id,
            'user_id' => $this->enrolledStudent->id,
            'submission_text' => 'Solution.',
            'status' => 'submitted',
        ]);

        $this->withHeader('Authorization', 'Bearer '.$this->teacherToken)
            ->postJson('/api/v1/submissions/'.$submission->id.'/grade', [
                'score' => 50,
                'feedback' => 'Maximum score.',
            ])
            ->assertOk()
            ->assertJsonPath('submission.score', 50);

        $response = $this->withHeader('Authorization', 'Bearer '.$this->teacherToken)
            ->postJson('/api/v1/submissions/'.$submission->id.'/grade', [
                'score' => 51,
                'feedback' => 'Exceeds the assignment maximum.',
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
