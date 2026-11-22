<?php

namespace Tests\Feature;

use App\Models\AcademicSession;
use App\Models\AiConversation;
use App\Models\Course;
use App\Models\CourseEnrolment;
use App\Models\CourseSection;
use App\Models\Department;
use App\Models\Lesson;
use App\Models\Programme;
use App\Models\Role;
use App\Models\Semester;
use App\Models\User;
use Database\Seeders\RoleAndPermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AiAssistantTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $teacher;
    private User $enrolledStudent;
    private User $unenrolledStudent;
    private Course $course;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleAndPermissionSeeder::class);

        $this->admin = User::where('email', 'admin@onilms.edu')->first();

        $this->teacher = User::factory()->create(['name' => 'Prof. Alan Turing']);
        $this->teacher->roles()->attach(Role::where('name', Role::TEACHER)->first()->id);

        $this->enrolledStudent = User::where('email', 'student@onilms.edu')->first();

        $this->unenrolledStudent = User::factory()->create(['name' => 'Unenrolled Student', 'email' => 'unenrolled@onilms.edu']);
        $this->unenrolledStudent->roles()->attach(Role::where('name', Role::STUDENT)->first()->id);

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

        $session = AcademicSession::create([
            'name' => '2026-2027 Academic Year',
            'start_date' => '2026-08-01',
            'end_date' => '2027-05-31',
            'is_current' => true,
        ]);

        $semester = Semester::create([
            'academic_session_id' => $session->id,
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
            'title' => 'Artificial Intelligence & Neural Networks',
            'description' => 'Comprehensive introduction to neural nets, search algorithms, and machine learning.',
            'credits' => 4,
            'level' => 'advanced',
            'semester_number' => 4,
            'status' => 'published',
            'created_by_id' => $this->teacher->id,
        ]);

        $this->course->instructors()->create([
            'user_id' => $this->teacher->id,
            'role' => 'lead_instructor',
            'academic_session_id' => $session->id,
        ]);

        CourseEnrolment::create([
            'course_id' => $this->course->id,
            'user_id' => $this->enrolledStudent->id,
            'academic_session_id' => $session->id,
            'semester_id' => $semester->id,
            'status' => 'active',
        ]);

        // Add a section and lesson for RAG indexing
        $section = CourseSection::create([
            'course_id' => $this->course->id,
            'title' => 'Module 1: Foundations of Deep Learning',
            'position' => 1,
        ]);

        Lesson::create([
            'course_id' => $this->course->id,
            'section_id' => $section->id,
            'title' => 'Backpropagation and Gradient Descent',
            'content_type' => 'text',
            'content' => 'Gradient descent minimizes the objective loss function by iteratively updating network weights proportional to the negative gradient.',
            'position' => 1,
            'is_mandatory' => true,
        ]);
    }

    public function test_student_can_start_ai_conversation_for_enrolled_course(): void
    {
        $response = $this->actingAs($this->enrolledStudent, 'sanctum')
            ->postJson('/api/v1/ai/conversations', [
                'course_id' => $this->course->id,
                'title' => 'Exam Preparation on Neural Networks',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.title', 'Exam Preparation on Neural Networks')
            ->assertJsonPath('data.course.code', 'CS401');

        $this->assertDatabaseHas('ai_conversations', [
            'user_id' => $this->enrolledStudent->id,
            'course_id' => $this->course->id,
        ]);

        // Verify initial assistant welcome message was created
        $convId = $response->json('data.id');
        $this->assertDatabaseHas('ai_messages', [
            'conversation_id' => $convId,
            'role' => 'assistant',
        ]);
    }

    public function test_unenrolled_student_cannot_start_ai_conversation(): void
    {
        $response = $this->actingAs($this->unenrolledStudent, 'sanctum')
            ->postJson('/api/v1/ai/conversations', [
                'course_id' => $this->course->id,
            ]);

        $response->assertStatus(403);
    }

    public function test_student_can_send_message_and_receive_pedagogical_answer_with_citations(): void
    {
        $conv = AiConversation::create([
            'user_id' => $this->enrolledStudent->id,
            'course_id' => $this->course->id,
            'title' => 'Gradient Descent Study',
        ]);

        $response = $this->actingAs($this->enrolledStudent, 'sanctum')
            ->postJson("/api/v1/ai/conversations/{$conv->id}/messages", [
                'message' => 'Can you give me practice quiz questions on gradient descent?',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('message', 'AI response generated.')
            ->assertJsonPath('data.role', 'assistant');

        $this->assertDatabaseHas('ai_messages', [
            'conversation_id' => $conv->id,
            'role' => 'user',
            'content' => 'Can you give me practice quiz questions on gradient descent?',
        ]);

        $this->assertDatabaseHas('ai_messages', [
            'conversation_id' => $conv->id,
            'role' => 'assistant',
        ]);

        $conv->refresh();
        $this->assertGreaterThan(0, $conv->tokens_used);
    }

    public function test_student_can_list_conversations_and_view_history(): void
    {
        AiConversation::create([
            'user_id' => $this->enrolledStudent->id,
            'course_id' => $this->course->id,
            'title' => 'Search Algorithms Review',
        ]);

        $response = $this->actingAs($this->enrolledStudent, 'sanctum')
            ->getJson('/api/v1/ai/conversations');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'Search Algorithms Review');
    }

    public function test_teacher_can_index_course_documents(): void
    {
        $response = $this->actingAs($this->teacher, 'sanctum')
            ->postJson('/api/v1/ai/documents/index', [
                'course_id' => $this->course->id,
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('message', 'Course syllabus and lesson modules indexed for permission-aware AI retrieval.');

        $this->assertDatabaseHas('ai_documents', [
            'course_id' => $this->course->id,
            'status' => 'indexed',
        ]);

        $this->assertDatabaseHas('ai_document_chunks', [
            'source_reference' => 'Module 1: Foundations of Deep Learning · Backpropagation and Gradient Descent',
        ]);
    }

    public function test_user_can_view_ai_usage_stats(): void
    {
        $response = $this->actingAs($this->enrolledStudent, 'sanctum')
            ->getJson('/api/v1/ai/usage');

        $response->assertStatus(200)
            ->assertJsonPath('data.model_name', 'oni-rag-tutor-v1')
            ->assertJsonPath('data.quota_limit', 500000);
    }
}
