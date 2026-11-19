<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\CourseEnrolment;
use App\Models\CourseInstructor;
use App\Models\Department;
use App\Models\Exam;
use App\Models\ExamAttempt;
use App\Models\ExamQuestion;
use App\Models\Question;
use App\Models\QuestionBank;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\AcademicSeeder;
use Database\Seeders\CourseSeeder;
use Database\Seeders\RoleAndPermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExamTest extends TestCase
{
    use RefreshDatabase;

    private User $teacher;
    private User $student;
    private Course $course;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleAndPermissionSeeder::class);
        $this->seed(AcademicSeeder::class);
        $this->seed(CourseSeeder::class);

        $teacherRole = Role::where('name', Role::TEACHER)->first();
        $studentRole = Role::where('name', Role::STUDENT)->first();

        $this->teacher = User::factory()->create([
            'email' => 'teacher_exam@onilms.edu',
        ]);
        $this->teacher->roles()->attach($teacherRole->id);

        $this->student = User::factory()->create([
            'email' => 'student_exam@onilms.edu',
        ]);
        $this->student->roles()->attach($studentRole->id);

        $this->course = Course::where('code', 'CS101')->firstOrFail();

        // Assign instructor
        CourseInstructor::create([
            'course_id' => $this->course->id,
            'user_id' => $this->teacher->id,
            'role' => 'lead',
        ]);

        // Enroll student
        CourseEnrolment::create([
            'course_id' => $this->course->id,
            'user_id' => $this->student->id,
            'academic_session_id' => $this->course->department->programmes()->first()->batches()->first()?->academic_session_id,
            'status' => 'active',
            'enrolled_at' => now(),
        ]);
    }

    public function test_teacher_can_create_exam(): void
    {
        $payload = [
            'title' => 'Midterm Assessment',
            'description' => 'Evaluates Unit 1 and Unit 2 concepts',
            'duration_minutes' => 60,
            'total_marks' => 50,
            'passing_percentage' => 45,
            'is_published' => true,
        ];

        $response = $this->actingAs($this->teacher)
            ->postJson("/api/v1/courses/{$this->course->id}/exams", $payload);

        $response->assertStatus(201)
            ->assertJsonPath('data.title', 'Midterm Assessment')
            ->assertJsonPath('data.duration_minutes', 60);

        $this->assertDatabaseHas('exams', [
            'course_id' => $this->course->id,
            'title' => 'Midterm Assessment',
        ]);
    }

    public function test_teacher_can_create_question_and_attach_to_exam(): void
    {
        $exam = Exam::create([
            'course_id' => $this->course->id,
            'title' => 'Quiz 1',
            'duration_minutes' => 30,
            'created_by' => $this->teacher->id,
            'is_published' => true,
        ]);

        $qPayload = [
            'course_id' => $this->course->id,
            'question_text' => 'What is the worst-case complexity of QuickSort?',
            'question_type' => 'mcq_single',
            'options' => [
                ['id' => 'a', 'text' => 'O(n)'],
                ['id' => 'b', 'text' => 'O(n log n)'],
                ['id' => 'c', 'text' => 'O(n^2)'],
            ],
            'correct_answers' => ['c'],
            'points' => 2.0,
            'explanation' => 'When already sorted and pivot is extreme, QuickSort degrades to O(n^2).',
        ];

        $qRes = $this->actingAs($this->teacher)
            ->postJson('/api/v1/questions', $qPayload);

        $qRes->assertStatus(201);
        $questionId = $qRes->json('data.id');

        // Attach question to exam
        $attachRes = $this->actingAs($this->teacher)
            ->postJson("/api/v1/exams/{$exam->id}/questions", [
                'question_ids' => [$questionId],
            ]);

        $attachRes->assertStatus(200);
        $this->assertDatabaseHas('exam_questions', [
            'exam_id' => $exam->id,
            'question_id' => $questionId,
        ]);
    }

    public function test_question_bank_scope_is_checked_for_each_attached_question(): void
    {
        $exam = Exam::create([
            'course_id' => $this->course->id,
            'title' => 'Question bank scope exam',
            'duration_minutes' => 30,
            'created_by' => $this->teacher->id,
            'is_published' => true,
        ]);
        $otherDepartment = Department::where('id', '!=', $this->course->department_id)->firstOrFail();
        $restrictedBank = QuestionBank::create([
            'department_id' => $otherDepartment->id,
            'title' => 'Restricted bank',
            'created_by' => $this->teacher->id,
        ]);
        $restrictedQuestion = Question::create([
            'question_bank_id' => $restrictedBank->id,
            'question_text' => 'Restricted question',
            'question_type' => 'mcq_single',
            'options' => [['id' => 'a', 'text' => 'A']],
            'correct_answers' => ['a'],
            'created_by' => $this->teacher->id,
        ]);
        $sharedBank = QuestionBank::create([
            'department_id' => null,
            'title' => 'Shared question bank',
            'created_by' => $this->teacher->id,
        ]);
        $sharedQuestion = Question::create([
            'question_bank_id' => $sharedBank->id,
            'question_text' => 'Shared question',
            'question_type' => 'mcq_single',
            'options' => [['id' => 'a', 'text' => 'A']],
            'correct_answers' => ['a'],
            'created_by' => $this->teacher->id,
        ]);

        $this->actingAs($this->teacher)
            ->postJson("/api/v1/exams/{$exam->id}/questions", [
                'question_ids' => [$sharedQuestion->id, $restrictedQuestion->id],
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['question_ids.1']);

        $this->actingAs($this->teacher)
            ->postJson("/api/v1/exams/{$exam->id}/questions", [
                'question_ids' => [$sharedQuestion->id],
            ])
            ->assertOk();
    }

    public function test_question_solutions_are_hidden_from_teacher_roles_outside_the_exam_course(): void
    {
        $exam = Exam::create([
            'course_id' => $this->course->id,
            'title' => 'Course-scoped solutions',
            'duration_minutes' => 30,
            'created_by' => $this->teacher->id,
            'is_published' => true,
        ]);
        $question = Question::create([
            'course_id' => $this->course->id,
            'question_text' => 'Course-scoped question',
            'question_type' => 'mcq_single',
            'options' => [['id' => 'a', 'text' => 'A']],
            'correct_answers' => ['a'],
            'created_by' => $this->teacher->id,
        ]);
        ExamQuestion::create([
            'exam_id' => $exam->id,
            'question_id' => $question->id,
            'order_index' => 1,
        ]);

        $otherTeacher = User::factory()->create();
        $otherTeacher->roles()->attach([
            Role::where('name', Role::TEACHER)->value('id'),
            Role::where('name', Role::STUDENT)->value('id'),
        ]);
        CourseEnrolment::create([
            'course_id' => $this->course->id,
            'user_id' => $otherTeacher->id,
            'academic_session_id' => $this->course->department->programmes()->first()->batches()->first()?->academic_session_id,
            'status' => 'active',
            'enrolled_at' => now(),
        ]);

        $this->actingAs($otherTeacher)
            ->getJson("/api/v1/exams/{$exam->id}")
            ->assertOk()
            ->assertJsonMissingPath('data.questions.0.correct_answers');
    }

    public function test_single_choice_correct_answer_must_reference_an_option(): void
    {
        $this->actingAs($this->teacher)
            ->postJson('/api/v1/questions', [
                'course_id' => $this->course->id,
                'question_text' => 'Invalid correct option',
                'question_type' => 'mcq_single',
                'options' => [['id' => 'a', 'text' => 'A']],
                'correct_answers' => ['not-an-option'],
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['correct_answers']);
    }

    public function test_teacher_cannot_update_or_delete_a_question_from_another_course(): void
    {
        $otherCourse = Course::where('id', '!=', $this->course->id)->firstOrFail();
        $question = Question::create([
            'course_id' => $otherCourse->id,
            'question_text' => 'Another course question',
            'question_type' => 'mcq_single',
            'options' => [['id' => 'a', 'text' => 'A']],
            'correct_answers' => ['a'],
            'created_by' => $this->teacher->id,
        ]);

        $this->actingAs($this->teacher)
            ->putJson("/api/v1/questions/{$question->id}", [
                'course_id' => $otherCourse->id,
                'question_text' => 'Changed by unrelated teacher',
                'question_type' => 'mcq_single',
                'options' => [['id' => 'a', 'text' => 'A']],
                'correct_answers' => ['a'],
            ])
            ->assertForbidden();

        $this->actingAs($this->teacher)
            ->deleteJson("/api/v1/questions/{$question->id}")
            ->assertForbidden();

        $this->assertDatabaseHas('questions', ['id' => $question->id]);
    }

    public function test_question_exam_relation_generates_pivot_uuid_when_attaching(): void
    {
        $exam = Exam::create([
            'course_id' => $this->course->id,
            'title' => 'Pivot UUID exam',
            'duration_minutes' => 30,
            'created_by' => $this->teacher->id,
        ]);
        $question = Question::create([
            'course_id' => $this->course->id,
            'question_text' => 'Question with pivot UUID',
            'question_type' => 'mcq_single',
            'options' => [['id' => 'a', 'text' => 'A']],
            'correct_answers' => ['a'],
        ]);

        $question->exams()->attach($exam->id, ['order_index' => 1]);

        $pivotId = ExamQuestion::where('exam_id', $exam->id)->value('id');
        $this->assertNotEmpty($pivotId);
        $this->assertMatchesRegularExpression('/^[0-9a-f-]{36}$/i', $pivotId);
    }

    public function test_attached_question_order_uses_numeric_iteration_not_array_keys(): void
    {
        $exam = Exam::create([
            'course_id' => $this->course->id,
            'title' => 'Question order exam',
            'duration_minutes' => 30,
            'created_by' => $this->teacher->id,
        ]);
        $questions = collect([1, 2])->map(fn (int $number) => Question::create([
            'course_id' => $this->course->id,
            'question_text' => "Question {$number}",
            'question_type' => 'mcq_single',
            'options' => [['id' => 'a', 'text' => 'A']],
            'correct_answers' => ['a'],
            'created_by' => $this->teacher->id,
        ]));

        $this->actingAs($this->teacher)
            ->postJson("/api/v1/exams/{$exam->id}/questions", [
                'question_ids' => [3 => $questions[0]->id, 8 => $questions[1]->id],
            ])
            ->assertOk();

        $this->assertSame(
            [1, 2],
            ExamQuestion::where('exam_id', $exam->id)->orderBy('order_index')->pluck('order_index')->all()
        );
    }

    public function test_student_cannot_see_correct_answers_in_exam(): void
    {
        $exam = Exam::create([
            'course_id' => $this->course->id,
            'title' => 'Secure Midterm',
            'duration_minutes' => 45,
            'created_by' => $this->teacher->id,
            'is_published' => true,
        ]);

        $question = Question::create([
            'course_id' => $this->course->id,
            'question_text' => 'Binary tree search complexity?',
            'question_type' => 'mcq_single',
            'options' => [
                ['id' => 'a', 'text' => 'O(log n)'],
                ['id' => 'b', 'text' => 'O(n)'],
            ],
            'correct_answers' => ['a'],
            'points' => 1.0,
            'explanation' => 'Super confidential teacher note',
            'created_by' => $this->teacher->id,
        ]);

        ExamQuestion::create([
            'exam_id' => $exam->id,
            'question_id' => $question->id,
            'order_index' => 1,
        ]);

        $response = $this->actingAs($this->student)
            ->getJson("/api/v1/exams/{$exam->id}");

        $response->assertStatus(200);
        // Assert student response does NOT leak correct_answers or explanation
        $this->assertNull($response->json('data.questions.0.correct_answers'));
        $this->assertNull($response->json('data.questions.0.explanation'));

        $this->actingAs($this->teacher)
            ->getJson("/api/v1/exams/{$exam->id}")
            ->assertOk()
            ->assertJsonPath('data.questions.0.correct_answers', ['a']);
    }

    public function test_student_cannot_view_unpublished_exam_directly(): void
    {
        $exam = Exam::create([
            'course_id' => $this->course->id,
            'title' => 'Draft exam',
            'duration_minutes' => 30,
            'created_by' => $this->teacher->id,
            'is_published' => false,
        ]);

        $this->actingAs($this->student)
            ->getJson("/api/v1/exams/{$exam->id}")
            ->assertNotFound();

        $this->actingAs($this->teacher)
            ->getJson("/api/v1/exams/{$exam->id}")
            ->assertOk();
    }

    public function test_student_can_start_exam_and_autosave_progress(): void
    {
        $exam = Exam::create([
            'course_id' => $this->course->id,
            'title' => 'Live Algorithm Exam',
            'duration_minutes' => 60,
            'created_by' => $this->teacher->id,
            'is_published' => true,
        ]);

        $startRes = $this->actingAs($this->student)
            ->postJson("/api/v1/exams/{$exam->id}/start");

        $startRes->assertStatus(201)
            ->assertJsonPath('attempt.status', 'in_progress');

        $attemptId = $startRes->json('attempt.id');
        $this->assertNotNull($attemptId);

        // Autosave snapshot
        $saveRes = $this->actingAs($this->student)
            ->postJson("/api/v1/attempts/{$attemptId}/save", [
                'answers' => [
                    'q1' => 'a',
                    'q2' => ['b', 'c'],
                ],
            ]);

        $saveRes->assertStatus(200)
            ->assertJsonPath('message', 'Attempt progress autosaved');

        $this->actingAs($this->student)
            ->postJson("/api/v1/attempts/{$attemptId}/save", [
                'answers' => ['q3' => 'c'],
            ])
            ->assertOk();

        $this->assertSame(
            ['q1' => 'a', 'q2' => ['b', 'c'], 'q3' => 'c'],
            ExamAttempt::findOrFail($attemptId)->answers_snapshot
        );

        $resumed = $this->actingAs($this->student)
            ->postJson("/api/v1/exams/{$exam->id}/start");
        $resumed->assertOk()
            ->assertJsonPath('attempt.id', $attemptId);

        $this->assertSame(1, ExamAttempt::where('exam_id', $exam->id)->where('user_id', $this->student->id)->count());

        $this->assertDatabaseHas('exam_attempts', [
            'id' => $attemptId,
            'status' => 'in_progress',
        ]);
    }

    public function test_student_can_submit_exam_and_receive_server_authoritative_grading(): void
    {
        $exam = Exam::create([
            'course_id' => $this->course->id,
            'title' => 'Final Grading Test',
            'duration_minutes' => 30,
            'passing_percentage' => 50,
            'created_by' => $this->teacher->id,
            'is_published' => true,
        ]);

        $q1 = Question::create([
            'course_id' => $this->course->id,
            'question_text' => 'Capital of France?',
            'question_type' => 'mcq_single',
            'options' => [
                ['id' => 'paris', 'text' => 'Paris'],
                ['id' => 'rome', 'text' => 'Rome'],
            ],
            'correct_answers' => ['paris'],
            'points' => 2.0,
            'created_by' => $this->teacher->id,
        ]);

        $q2 = Question::create([
            'course_id' => $this->course->id,
            'question_text' => 'Is Earth flat?',
            'question_type' => 'true_false',
            'options' => [
                ['id' => 'true', 'text' => 'True'],
                ['id' => 'false', 'text' => 'False'],
            ],
            'correct_answers' => ['false'],
            'points' => 2.0,
            'created_by' => $this->teacher->id,
        ]);

        ExamQuestion::create([
            'exam_id' => $exam->id,
            'question_id' => $q1->id,
            'order_index' => 1,
            'points' => 2.0,
        ]);
        ExamQuestion::create([
            'exam_id' => $exam->id,
            'question_id' => $q2->id,
            'order_index' => 2,
            'points' => 2.0,
        ]);

        // Start attempt
        $startRes = $this->actingAs($this->student)
            ->postJson("/api/v1/exams/{$exam->id}/start");
        $attemptId = $startRes->json('attempt.id');

        // Submit both correct answers
        $submitRes = $this->actingAs($this->student)
            ->postJson("/api/v1/attempts/{$attemptId}/submit", [
                'answers' => [
                    $q1->id => 'paris',
                    $q2->id => 'false',
                ],
            ]);

        $submitRes->assertStatus(200)
            ->assertJsonPath('data.status', 'evaluated')
            ->assertJsonPath('data.score', 4)
            ->assertJsonPath('data.percentage', 100)
            ->assertJsonPath('data.is_passed', true);

        // Assert idempotent re-submission returns 200 without double grading
        $q1->update(['correct_answers' => ['rome']]);
        $resubmit = $this->actingAs($this->student)
            ->postJson("/api/v1/attempts/{$attemptId}/submit", []);
        $resubmit->assertStatus(200)
            ->assertJsonPath('data.score', 4);
    }

    public function test_submission_merges_saved_answers_and_uses_start_time_grading_snapshot(): void
    {
        $exam = Exam::create([
            'course_id' => $this->course->id,
            'title' => 'Snapshot grading test',
            'duration_minutes' => 30,
            'created_by' => $this->teacher->id,
            'is_published' => true,
        ]);
        $q1 = Question::create([
            'course_id' => $this->course->id,
            'question_text' => 'First question',
            'question_type' => 'mcq_single',
            'options' => [['id' => 'right', 'text' => 'Right'], ['id' => 'wrong', 'text' => 'Wrong']],
            'correct_answers' => ['right'],
            'points' => 2,
            'created_by' => $this->teacher->id,
        ]);
        $q2 = Question::create([
            'course_id' => $this->course->id,
            'question_text' => 'Second question',
            'question_type' => 'mcq_single',
            'options' => [['id' => 'yes', 'text' => 'Yes']],
            'correct_answers' => ['yes'],
            'points' => 1,
            'created_by' => $this->teacher->id,
        ]);
        ExamQuestion::create([
            'exam_id' => $exam->id,
            'question_id' => $q1->id,
            'order_index' => 1,
            'points' => 2,
        ]);
        ExamQuestion::create([
            'exam_id' => $exam->id,
            'question_id' => $q2->id,
            'order_index' => 2,
            'points' => 1,
        ]);

        $attemptId = $this->actingAs($this->student)
            ->postJson("/api/v1/exams/{$exam->id}/start")
            ->assertCreated()
            ->json('attempt.id');

        $this->actingAs($this->student)
            ->postJson("/api/v1/attempts/{$attemptId}/save", [
                'answers' => [$q1->id => 'right'],
            ])
            ->assertOk();

        $q1->update(['correct_answers' => ['wrong'], 'points' => 10]);
        $exam->questions()->updateExistingPivot($q1->id, ['points' => 7]);

        $this->actingAs($this->student)
            ->postJson("/api/v1/attempts/{$attemptId}/submit", [
                'answers' => [$q2->id => 'yes'],
            ])
            ->assertOk()
            ->assertJsonPath('data.score', 3)
            ->assertJsonPath('data.answers_snapshot.'.$q1->id, 'right');
    }

    public function test_expired_attempt_is_blocked_from_autosave(): void
    {
        $exam = Exam::create([
            'course_id' => $this->course->id,
            'title' => 'Strict Timer Exam',
            'duration_minutes' => 10,
            'created_by' => $this->teacher->id,
            'is_published' => true,
        ]);

        $attempt = ExamAttempt::create([
            'exam_id' => $exam->id,
            'user_id' => $this->student->id,
            'attempt_number' => 1,
            'started_at' => now()->subMinutes(20),
            'expires_at' => now()->subMinutes(10), // expired 10 mins ago
            'status' => 'in_progress',
        ]);

        $response = $this->actingAs($this->student)
            ->postJson("/api/v1/attempts/{$attempt->id}/save", [
                'answers' => ['foo' => 'bar'],
            ]);

        $response->assertStatus(410)
            ->assertJsonPath('is_expired', true);
    }

    public function test_expired_attempt_submission_uses_only_saved_answers(): void
    {
        $exam = Exam::create([
            'course_id' => $this->course->id,
            'title' => 'Expired submission exam',
            'duration_minutes' => 10,
            'created_by' => $this->teacher->id,
            'is_published' => true,
        ]);
        $question = Question::create([
            'course_id' => $this->course->id,
            'question_text' => 'Pick the correct answer',
            'question_type' => 'mcq_single',
            'options' => [['id' => 'right', 'text' => 'Right']],
            'correct_answers' => ['right'],
            'created_by' => $this->teacher->id,
        ]);
        ExamQuestion::create([
            'exam_id' => $exam->id,
            'question_id' => $question->id,
            'order_index' => 1,
        ]);
        $attempt = ExamAttempt::create([
            'exam_id' => $exam->id,
            'user_id' => $this->student->id,
            'attempt_number' => 1,
            'started_at' => now()->subMinutes(20),
            'expires_at' => now()->subMinutes(10),
            'status' => 'in_progress',
            'answers_snapshot' => [$question->id => 'wrong'],
        ]);

        $this->actingAs($this->student)
            ->postJson("/api/v1/attempts/{$attempt->id}/submit", [
                'answers' => [$question->id => 'right'],
            ])
            ->assertStatus(410)
            ->assertJsonPath('is_expired', true)
            ->assertJsonPath('data.score', 0)
            ->assertJsonPath('data.answers_snapshot.'.$question->id, 'wrong');
    }

    public function test_ungraded_submitted_attempt_can_recover_from_saved_answers(): void
    {
        $exam = Exam::create([
            'course_id' => $this->course->id,
            'title' => 'Submitted recovery exam',
            'duration_minutes' => 30,
            'created_by' => $this->teacher->id,
            'is_published' => true,
        ]);
        $question = Question::create([
            'course_id' => $this->course->id,
            'question_text' => 'Recovery question',
            'question_type' => 'mcq_single',
            'options' => [['id' => 'right', 'text' => 'Right']],
            'correct_answers' => ['right'],
            'created_by' => $this->teacher->id,
        ]);
        ExamQuestion::create([
            'exam_id' => $exam->id,
            'question_id' => $question->id,
            'order_index' => 1,
        ]);
        $attemptId = $this->actingAs($this->student)
            ->postJson("/api/v1/exams/{$exam->id}/start")
            ->assertCreated()
            ->json('attempt.id');
        ExamAttempt::findOrFail($attemptId)->update([
            'status' => 'submitted',
            'answers_snapshot' => [$question->id => 'right'],
        ]);

        $this->actingAs($this->student)
            ->postJson("/api/v1/attempts/{$attemptId}/submit", [
                'answers' => [$question->id => 'wrong'],
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'evaluated')
            ->assertJsonPath('data.score', 1)
            ->assertJsonPath('data.answers_snapshot.'.$question->id, 'right');
    }

    public function test_max_attempts_limit_enforced(): void
    {
        $exam = Exam::create([
            'course_id' => $this->course->id,
            'title' => 'Single Attempt Exam',
            'duration_minutes' => 20,
            'max_attempts' => 1,
            'created_by' => $this->teacher->id,
            'is_published' => true,
        ]);

        // Attempt 1 already completed
        ExamAttempt::create([
            'exam_id' => $exam->id,
            'user_id' => $this->student->id,
            'attempt_number' => 1,
            'started_at' => now()->subMinutes(30),
            'expires_at' => now()->subMinutes(10),
            'submitted_at' => now()->subMinutes(10),
            'status' => 'evaluated',
            'score' => 10,
            'percentage' => 100,
            'is_passed' => true,
        ]);

        // Attempt 2 should be rejected
        $response = $this->actingAs($this->student)
            ->postJson("/api/v1/exams/{$exam->id}/start");

        $response->assertStatus(422)
            ->assertJsonPath('message', 'You have reached the maximum number of attempts for this exam.');
    }
}
