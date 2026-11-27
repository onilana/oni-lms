<?php

namespace Tests\Feature;

use App\Models\AttendanceRecord;
use App\Models\AttendanceSession;
use App\Models\Course;
use App\Models\CourseEnrolment;
use App\Models\CourseInstructor;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\AcademicSeeder;
use Database\Seeders\CourseSeeder;
use Database\Seeders\RoleAndPermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AttendanceTest extends TestCase
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

        $this->teacher = User::factory()->create(['email' => 'teacher_att@educare.edu']);
        $this->teacher->roles()->attach($teacherRole->id);

        $this->student = User::factory()->create(['email' => 'student_att@educare.edu']);
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
            'status' => 'enrolled',
            'enrolled_at' => now(),
        ]);
    }

    public function test_teacher_can_create_attendance_session(): void
    {
        $payload = [
            'session_date' => '2026-11-20',
            'start_time' => '10:00',
            'end_time' => '11:00',
            'topic' => 'Binary Search Trees & Rotations',
            'room' => 'Hall 201',
            'status' => 'completed',
        ];

        $response = $this->actingAs($this->teacher)
            ->postJson("/api/v1/courses/{$this->course->id}/attendance/sessions", $payload);

        $response->assertStatus(201)
            ->assertJsonPath('data.topic', 'Binary Search Trees & Rotations')
            ->assertJsonPath('data.room', 'Hall 201');

        $this->assertDatabaseHas('attendance_sessions', [
            'course_id' => $this->course->id,
            'topic' => 'Binary Search Trees & Rotations',
        ]);

        // Verify roster was automatically populated for enrolled student
        $sessionId = $response->json('data.id');
        $this->assertDatabaseHas('attendance_records', [
            'attendance_session_id' => $sessionId,
            'student_user_id' => $this->student->id,
        ]);
    }

    public function test_teacher_can_bulk_mark_student_attendance(): void
    {
        $session = AttendanceSession::create([
            'course_id' => $this->course->id,
            'instructor_id' => $this->teacher->id,
            'session_date' => now()->format('Y-m-d'),
            'topic' => 'Graph Traversal Algorithms',
            'status' => 'scheduled',
        ]);

        $payload = [
            'records' => [
                [
                    'student_user_id' => $this->student->id,
                    'status' => 'late',
                    'remarks' => 'Bus breakdown',
                ],
            ],
        ];

        $response = $this->actingAs($this->teacher)
            ->postJson("/api/v1/attendance/sessions/{$session->id}/bulk-mark", $payload);

        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'completed');

        $this->assertDatabaseHas('attendance_records', [
            'attendance_session_id' => $session->id,
            'student_user_id' => $this->student->id,
            'status' => 'late',
            'remarks' => 'Bus breakdown',
            'marked_by_id' => $this->teacher->id,
        ]);
    }

    public function test_student_can_view_their_own_attendance_record(): void
    {
        $session = AttendanceSession::create([
            'course_id' => $this->course->id,
            'instructor_id' => $this->teacher->id,
            'session_date' => now()->format('Y-m-d'),
            'topic' => 'Hashing and Hash Tables',
            'status' => 'completed',
        ]);

        AttendanceRecord::create([
            'attendance_session_id' => $session->id,
            'student_user_id' => $this->student->id,
            'status' => 'present',
            'marked_by_id' => $this->teacher->id,
        ]);

        $response = $this->actingAs($this->student)
            ->getJson('/api/v1/my-attendance');

        $response->assertStatus(200)
            ->assertJsonPath('overall_percentage', 100)
            ->assertJsonPath('has_shortage', false)
            ->assertJsonStructure([
                'overall_percentage',
                'has_shortage',
                'courses' => [
                    '*' => [
                        'course_id',
                        'code',
                        'title',
                        'stats',
                        'recent_sessions',
                    ],
                ],
            ]);
    }

    public function test_student_cannot_create_or_mark_attendance(): void
    {
        $session = AttendanceSession::create([
            'course_id' => $this->course->id,
            'instructor_id' => $this->teacher->id,
            'session_date' => now()->format('Y-m-d'),
            'topic' => 'Restricted Session',
        ]);

        // Student tries to create session -> 403
        $createRes = $this->actingAs($this->student)
            ->postJson("/api/v1/courses/{$this->course->id}/attendance/sessions", [
                'session_date' => now()->format('Y-m-d'),
            ]);
        $createRes->assertStatus(403);

        // Student tries to bulk mark -> 403
        $markRes = $this->actingAs($this->student)
            ->postJson("/api/v1/attendance/sessions/{$session->id}/bulk-mark", [
                'records' => [
                    ['student_user_id' => $this->student->id, 'status' => 'present'],
                ],
            ]);
        $markRes->assertStatus(403);
    }

    public function test_attendance_shortage_is_flagged_when_below_75_percent(): void
    {
        // Conduct 4 sessions: student attended only 1 (25% attendance)
        for ($i = 1; $i <= 4; $i++) {
            $sess = AttendanceSession::create([
                'course_id' => $this->course->id,
                'instructor_id' => $this->teacher->id,
                'session_date' => now()->subDays($i)->format('Y-m-d'),
                'status' => 'completed',
            ]);

            AttendanceRecord::create([
                'attendance_session_id' => $sess->id,
                'student_user_id' => $this->student->id,
                'status' => $i === 1 ? 'present' : 'absent',
            ]);
        }

        $response = $this->actingAs($this->student)
            ->getJson('/api/v1/my-attendance');

        $response->assertStatus(200)
            ->assertJsonPath('overall_percentage', 25)
            ->assertJsonPath('has_shortage', true);
    }
}
