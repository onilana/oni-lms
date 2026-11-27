<?php

namespace Tests\Feature;

use App\Models\AcademicSession;
use App\Models\Announcement;
use App\Models\AttendanceSession;
use App\Models\Course;
use App\Models\CourseEnrolment;
use App\Models\Department;
use App\Models\InAppNotification;
use App\Models\LiveSession;
use App\Models\Programme;
use App\Models\Role;
use App\Models\Semester;
use App\Models\User;
use Database\Seeders\RoleAndPermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LiveClassroomTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $teacher;
    private User $enrolledStudent;
    private User $unenrolledStudent;
    private Course $course;
    private AcademicSession $session;
    private Semester $semester;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleAndPermissionSeeder::class);

        $this->admin = User::where('email', 'admin@educare.edu')->first();

        $this->teacher = User::factory()->create(['name' => 'Prof. Katherine Johnson']);
        $this->teacher->roles()->attach(Role::where('name', Role::TEACHER)->first()->id);

        $this->enrolledStudent = User::where('email', 'student@educare.edu')->first();

        $this->unenrolledStudent = User::factory()->create(['name' => 'Bob Marley', 'email' => 'bob@educare.edu']);
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
            'code' => 'CS301',
            'title' => 'Operating Systems & Concurrency',
            'credits' => 4,
            'level' => 'intermediate',
            'semester_number' => 3,
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
            'user_id' => $this->enrolledStudent->id,
            'academic_session_id' => $this->session->id,
            'semester_id' => $this->semester->id,
            'status' => 'active',
        ]);
    }

    public function test_teacher_can_schedule_live_class(): void
    {
        $payload = [
            'title' => 'Process Synchronization & Mutexes',
            'description' => 'Detailed walkthrough of critical sections and semaphores.',
            'provider' => 'jitsi',
            'scheduled_start_at' => now()->addDay()->toDateTimeString(),
            'scheduled_end_at' => now()->addDay()->addHours(2)->toDateTimeString(),
            'link_attendance' => true,
        ];

        $response = $this->actingAs($this->teacher, 'sanctum')
            ->postJson("/api/v1/courses/{$this->course->id}/live-sessions", $payload);

        $response->assertStatus(201)
            ->assertJsonPath('message', 'Live class session scheduled successfully.')
            ->assertJsonPath('data.title', 'Process Synchronization & Mutexes')
            ->assertJsonPath('data.provider', 'jitsi');

        $this->assertDatabaseHas('live_sessions', [
            'course_id' => $this->course->id,
            'title' => 'Process Synchronization & Mutexes',
            'status' => 'scheduled',
        ]);

        // Verify attendance session link
        $sessionId = $response->json('data.id');
        $session = LiveSession::find($sessionId);
        $this->assertNotNull($session->attendance_session_id);
    }

    public function test_enrolled_student_can_see_upcoming_sessions(): void
    {
        LiveSession::create([
            'course_id' => $this->course->id,
            'instructor_id' => $this->teacher->id,
            'title' => 'Deadlock Avoidance',
            'provider' => 'google_meet',
            'meeting_url' => 'https://meet.google.com/abc-defg-hij',
            'scheduled_start_at' => now()->addHours(2),
            'scheduled_end_at' => now()->addHours(4),
            'status' => 'scheduled',
        ]);

        $response = $this->actingAs($this->enrolledStudent, 'sanctum')
            ->getJson('/api/v1/live-sessions/upcoming');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'Deadlock Avoidance')
            ->assertJsonPath('data.0.is_joinable', false);
    }

    public function test_unenrolled_student_cannot_join_or_view_meeting_url(): void
    {
        $live = LiveSession::create([
            'course_id' => $this->course->id,
            'instructor_id' => $this->teacher->id,
            'title' => 'Virtual Memory & Paging',
            'provider' => 'zoom',
            'meeting_url' => 'https://zoom.us/j/123456789',
            'scheduled_start_at' => now()->subMinutes(5),
            'scheduled_end_at' => now()->addMinutes(55),
            'status' => 'live',
        ]);

        // Unenrolled student tries to view
        $response = $this->actingAs($this->unenrolledStudent, 'sanctum')
            ->getJson("/api/v1/live-sessions/{$live->id}");

        $response->assertStatus(403);

        // Unenrolled student tries to join
        $joinResponse = $this->actingAs($this->unenrolledStudent, 'sanctum')
            ->postJson("/api/v1/live-sessions/{$live->id}/join");

        $joinResponse->assertStatus(403);
    }

    public function test_enrolled_student_can_join_active_live_session(): void
    {
        $live = LiveSession::create([
            'course_id' => $this->course->id,
            'instructor_id' => $this->teacher->id,
            'title' => 'Virtual Memory Live Room',
            'provider' => 'zoom',
            'meeting_url' => 'https://zoom.us/j/123456789',
            'meeting_id' => '123456789',
            'passcode' => 'Pass2026',
            'scheduled_start_at' => now()->subMinutes(5),
            'scheduled_end_at' => now()->addMinutes(55),
            'status' => 'live',
        ]);

        $response = $this->actingAs($this->enrolledStudent, 'sanctum')
            ->postJson("/api/v1/live-sessions/{$live->id}/join");

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Room access granted.',
                'meeting_url' => 'https://zoom.us/j/123456789',
                'meeting_id' => '123456789',
                'passcode' => 'Pass2026',
            ]);
    }

    public function test_joining_live_session_auto_records_attendance(): void
    {
        $attSession = AttendanceSession::create([
            'course_id' => $this->course->id,
            'academic_session_id' => $this->session->id,
            'instructor_id' => $this->teacher->id,
            'session_date' => now()->toDateString(),
            'start_time' => now()->format('H:i'),
            'end_time' => now()->addHour()->format('H:i'),
            'topic' => 'Live Lecture Attendance',
            'room' => 'Online (Jitsi)',
            'status' => 'completed',
        ]);

        $live = LiveSession::create([
            'course_id' => $this->course->id,
            'instructor_id' => $this->teacher->id,
            'attendance_session_id' => $attSession->id,
            'title' => 'Live OS Lab',
            'provider' => 'jitsi',
            'meeting_url' => 'https://meet.jit.si/ONI-OS-Lab',
            'scheduled_start_at' => now()->subMinutes(2),
            'scheduled_end_at' => now()->addMinutes(58),
            'status' => 'live',
        ]);

        $this->actingAs($this->enrolledStudent, 'sanctum')
            ->postJson("/api/v1/live-sessions/{$live->id}/join");

        $this->assertDatabaseHas('attendance_records', [
            'attendance_session_id' => $attSession->id,
            'student_user_id' => $this->enrolledStudent->id,
            'status' => 'present',
        ]);
    }

    public function test_users_can_view_campus_and_course_announcements(): void
    {
        // Campus announcement
        Announcement::create([
            'author_id' => $this->admin->id,
            'title' => 'Campus Holiday Notice',
            'content' => 'Classes suspended next Monday for National Holiday.',
            'priority' => 'high',
            'is_pinned' => true,
        ]);

        // Course announcement
        Announcement::create([
            'author_id' => $this->teacher->id,
            'course_id' => $this->course->id,
            'title' => 'Reading Assignment for OS',
            'content' => 'Review chapter 5 on threads.',
            'priority' => 'normal',
        ]);

        $response = $this->actingAs($this->enrolledStudent, 'sanctum')
            ->getJson('/api/v1/announcements');

        $response->assertStatus(200)
            ->assertJsonCount(2, 'data');
    }

    public function test_student_can_view_and_mark_notifications_as_read(): void
    {
        $notif = InAppNotification::create([
            'user_id' => $this->enrolledStudent->id,
            'type' => 'live_class',
            'title' => 'Upcoming Class',
            'message' => 'Class starts in 10 minutes',
        ]);

        $response = $this->actingAs($this->enrolledStudent, 'sanctum')
            ->getJson('/api/v1/notifications');

        $response->assertStatus(200)
            ->assertJsonPath('unread_count', 1);

        // Mark as read
        $readResponse = $this->actingAs($this->enrolledStudent, 'sanctum')
            ->postJson("/api/v1/notifications/{$notif->id}/read");

        $readResponse->assertStatus(200);

        $this->assertDatabaseHas('in_app_notifications', [
            'id' => $notif->id,
            'is_read' => true,
        ]);
    }
}
