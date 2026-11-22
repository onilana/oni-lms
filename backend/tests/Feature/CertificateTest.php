<?php

namespace Tests\Feature;

use App\Models\AcademicSession;
use App\Models\Certificate;
use App\Models\Course;
use App\Models\CourseEnrolment;
use App\Models\CourseSection;
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

class CertificateTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $student;
    private User $teacher;
    private Course $course;
    private AcademicSession $session;
    private Semester $semester;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleAndPermissionSeeder::class);

        $this->admin = User::where('email', 'admin@onilms.edu')->first();

        $this->student = User::where('email', 'student@onilms.edu')->first();

        $this->teacher = User::factory()->create(['name' => 'Prof. Alan Turing']);
        $this->teacher->roles()->attach(Role::where('name', Role::TEACHER)->first()->id);

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

        $this->semester = Semester::create([
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
            'code' => 'CS201',
            'title' => 'Algorithms & Complexity',
            'credits' => 4,
            'level' => 'intermediate',
            'semester_number' => 3,
            'status' => 'published',
            'created_by_id' => $this->teacher->id,
        ]);
    }

    public function test_public_can_verify_valid_certificate(): void
    {
        $cert = Certificate::create([
            'certificate_code' => 'ONI-2026-TEST-VERIFY',
            'user_id' => $this->student->id,
            'course_id' => $this->course->id,
            'issued_at' => now(),
            'title' => 'Certificate of Academic Excellence in Algorithms & Complexity',
            'grade' => 'Distinction',
            'final_score' => 98.50,
            'attendance_percentage' => 88.00,
            'metadata' => [
                'institution_name' => 'ONI Institute of Technology',
            ],
        ]);

        $response = $this->getJson("/api/v1/certificates/verify/{$cert->certificate_code}");

        $response->assertStatus(200)
            ->assertJson([
                'valid' => true,
                'certificate_code' => 'ONI-2026-TEST-VERIFY',
                'student_name' => $this->student->name,
                'course_title' => 'Algorithms & Complexity',
                'course_code' => 'CS201',
                'grade' => 'Distinction',
                'is_revoked' => false,
            ]);
    }

    public function test_public_verification_returns_404_for_unknown_code(): void
    {
        $response = $this->getJson('/api/v1/certificates/verify/NON-EXISTENT-CODE');
        $response->assertStatus(404)
            ->assertJson(['valid' => false]);
    }

    public function test_student_can_list_their_certificates(): void
    {
        Certificate::create([
            'certificate_code' => 'ONI-2026-MY-CERT',
            'user_id' => $this->student->id,
            'course_id' => $this->course->id,
            'issued_at' => now(),
            'title' => 'Certificate of Academic Excellence',
            'grade' => 'Merit',
        ]);

        $response = $this->actingAs($this->student, 'sanctum')
            ->getJson('/api/v1/my-certificates');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.certificate_code', 'ONI-2026-MY-CERT')
            ->assertJsonPath('data.0.grade', 'Merit');
    }

    public function test_student_can_check_certificate_eligibility(): void
    {
        // Initially not enrolled
        $response = $this->actingAs($this->student, 'sanctum')
            ->getJson("/api/v1/courses/{$this->course->id}/certificate/eligibility");

        $response->assertStatus(200)
            ->assertJsonPath('data.eligible', false)
            ->assertJsonPath('data.is_enrolled', false);

        // Enroll student
        CourseEnrolment::create([
            'course_id' => $this->course->id,
            'user_id' => $this->student->id,
            'academic_session_id' => $this->session->id,
            'semester_id' => $this->semester->id,
            'status' => 'active',
        ]);

        // Create a section & lesson
        $section = CourseSection::create([
            'course_id' => $this->course->id,
            'title' => 'Module 1: Foundations',
            'order_index' => 1,
        ]);

        $lesson = Lesson::create([
            'course_id' => $this->course->id,
            'section_id' => $section->id,
            'title' => 'Asymptotic Notation',
            'content_type' => 'text',
            'order_index' => 1,
            'status' => 'published',
        ]);

        $response = $this->actingAs($this->student, 'sanctum')
            ->getJson("/api/v1/courses/{$this->course->id}/certificate/eligibility");

        $response->assertStatus(200)
            ->assertJsonPath('data.eligible', false)
            ->assertJsonPath('data.lessons.completed', 0)
            ->assertJsonPath('data.lessons.passed', false);

        // Complete lesson
        LessonProgress::create([
            'course_id' => $this->course->id,
            'lesson_id' => $lesson->id,
            'user_id' => $this->student->id,
            'is_completed' => true,
            'completed_at' => now(),
        ]);

        // Recheck eligibility (no exams published, no attendance sessions yet)
        $response = $this->actingAs($this->student, 'sanctum')
            ->getJson("/api/v1/courses/{$this->course->id}/certificate/eligibility");

        $response->assertStatus(200)
            ->assertJsonPath('data.eligible', true)
            ->assertJsonPath('data.lessons.passed', true);
    }

    public function test_eligible_student_can_claim_certificate(): void
    {
        CourseEnrolment::create([
            'course_id' => $this->course->id,
            'user_id' => $this->student->id,
            'academic_session_id' => $this->session->id,
            'semester_id' => $this->semester->id,
            'status' => 'active',
        ]);

        $response = $this->actingAs($this->student, 'sanctum')
            ->postJson("/api/v1/courses/{$this->course->id}/certificate/claim");

        $response->assertStatus(201)
            ->assertJsonPath('message', 'Certificate awarded and verified successfully!')
            ->assertJsonStructure([
                'data' => [
                    'id',
                    'certificate_code',
                    'title',
                    'grade',
                    'student',
                    'course',
                    'verification_url',
                ],
            ]);

        $this->assertDatabaseHas('certificates', [
            'user_id' => $this->student->id,
            'course_id' => $this->course->id,
            'is_revoked' => false,
        ]);
    }

    public function test_ineligible_student_cannot_claim_certificate(): void
    {
        // Enrolled, but lesson is not completed
        CourseEnrolment::create([
            'course_id' => $this->course->id,
            'user_id' => $this->student->id,
            'academic_session_id' => $this->session->id,
            'semester_id' => $this->semester->id,
            'status' => 'active',
        ]);

        $section = CourseSection::create([
            'course_id' => $this->course->id,
            'title' => 'Module 2: Advanced Topics',
            'order_index' => 1,
        ]);

        Lesson::create([
            'course_id' => $this->course->id,
            'section_id' => $section->id,
            'title' => 'Dynamic Programming',
            'content_type' => 'text',
            'order_index' => 1,
            'status' => 'published',
        ]);

        $response = $this->actingAs($this->student, 'sanctum')
            ->postJson("/api/v1/courses/{$this->course->id}/certificate/claim");

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['eligibility']);
    }

    public function test_admin_can_manually_issue_and_revoke_certificate(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/certificates/issue', [
                'student_id' => $this->student->id,
                'course_id' => $this->course->id,
                'force' => true,
                'custom_meta' => [
                    'honors' => 'Dean List Recipient',
                ],
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('message', 'Certificate issued successfully.');

        $certId = $response->json('data.id');
        $certCode = $response->json('data.certificate_code');

        // Revoke certificate
        $revokeResponse = $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/v1/certificates/{$certId}/revoke", [
                'reason' => 'Administrative integrity audit check.',
            ]);

        $revokeResponse->assertStatus(200)
            ->assertJsonPath('data.is_revoked', true)
            ->assertJsonPath('data.revocation_reason', 'Administrative integrity audit check.');

        // Public verification now marks it revoked
        $verifyResponse = $this->getJson("/api/v1/certificates/verify/{$certCode}");
        $verifyResponse->assertStatus(200)
            ->assertJson([
                'valid' => false,
                'is_revoked' => true,
                'revocation_reason' => 'Administrative integrity audit check.',
            ]);
    }

    public function test_admin_can_update_certificate(): void
    {
        $issueResponse = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/certificates/issue', [
                'student_id' => $this->student->id,
                'course_id' => $this->course->id,
                'force' => true,
            ]);

        $certId = $issueResponse->json('data.id');

        $updateResponse = $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/v1/certificates/{$certId}", [
                'title' => 'Certificate of Advanced Excellence',
                'grade' => 'Distinction',
                'final_score' => 96.5,
                'attendance_percentage' => 98.0,
            ]);

        $updateResponse->assertStatus(200)
            ->assertJsonPath('data.title', 'Certificate of Advanced Excellence')
            ->assertJsonPath('data.grade', 'Distinction');

        $this->assertEquals(96.5, $updateResponse->json('data.final_score'));
        $this->assertEquals(98.0, $updateResponse->json('data.attendance_percentage'));

        $this->assertDatabaseHas('certificates', [
            'id' => $certId,
            'title' => 'Certificate of Advanced Excellence',
            'grade' => 'Distinction',
        ]);
    }

    public function test_admin_can_list_certificates(): void
    {
        $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/certificates/issue', [
                'student_id' => $this->student->id,
                'course_id' => $this->course->id,
                'force' => true,
            ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/certificates');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'certificate_code', 'title', 'grade', 'student', 'course'],
                ],
            ]);
    }
}
