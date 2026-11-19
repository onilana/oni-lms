<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\CourseEnrolment;
use App\Models\CourseInstructor;
use App\Models\Exam;
use App\Models\ExamAttempt;
use App\Models\ExamQuestion;
use App\Models\Question;
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
        $resubmit = $this->actingAs($this->student)
            ->postJson("/api/v1/attempts/{$attemptId}/submit", []);
        $resubmit->assertStatus(200);
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
