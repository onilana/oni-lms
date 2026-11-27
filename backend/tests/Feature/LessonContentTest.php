<?php

namespace Tests\Feature;

use App\Models\AcademicSession;
use App\Models\Course;
use App\Models\CourseEnrolment;
use App\Models\CourseInstructor;
use App\Models\CourseSection;
use App\Models\Lesson;
use App\Models\LessonProgress;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\AcademicSeeder;
use Database\Seeders\CourseSeeder;
use Database\Seeders\LessonSeeder;
use Database\Seeders\RoleAndPermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class LessonContentTest extends TestCase
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
        $this->seed(LessonSeeder::class);

        $this->course = Course::where('code', 'CS101')->first();
        $session = AcademicSession::where('is_current', true)->first();

        // 1. Admin
        $this->admin = User::where('email', 'admin@educare.edu')->first();
        $this->adminToken = $this->admin->createToken('admin-token')->plainTextToken;

        // 2. Teacher
        $teacherRole = Role::where('name', Role::TEACHER)->first();
        $this->teacher = User::create([
            'name' => 'Prof. Turing',
            'email' => 'turing@faculty.educare.edu',
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
            'name' => 'Ada Lovelace',
            'email' => 'ada@student.educare.edu',
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
            'name' => 'Charles Babbage',
            'email' => 'charles@student.educare.edu',
            'password' => Hash::make('Student123!'),
            'status' => 'active',
        ]);
        $this->nonEnrolledStudent->roles()->attach($studentRole->id);
        $this->nonEnrolledToken = $this->nonEnrolledStudent->createToken('non-enrolled-token')->plainTextToken;
    }

    public function test_authenticated_user_can_view_course_sections_and_lessons(): void
    {
        $response = $this->withHeader('Authorization', 'Bearer '.$this->enrolledToken)
            ->getJson('/api/v1/courses/'.$this->course->id.'/sections');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'sections' => [
                    '*' => [
                        'id',
                        'title',
                        'order_index',
                        'lessons' => [
                            '*' => [
                                'id',
                                'title',
                                'type',
                                'is_free_preview',
                                'is_accessible',
                            ],
                        ],
                    ],
                ],
            ]);

        $this->assertCount(2, $response->json('sections'));
    }

    public function test_instructor_can_create_section_and_lesson(): void
    {
        // 1. Create section
        $secResponse = $this->withHeader('Authorization', 'Bearer '.$this->teacherToken)
            ->postJson('/api/v1/courses/'.$this->course->id.'/sections', [
                'title' => 'Module 3: Sorting & Searching',
                'description' => 'Divide and conquer algorithms.',
                'order_index' => 3,
            ]);

        $secResponse->assertStatus(201)
            ->assertJsonPath('section.title', 'Module 3: Sorting & Searching');

        $sectionId = $secResponse->json('section.id');

        // 2. Create lesson under section
        $lesResponse = $this->withHeader('Authorization', 'Bearer '.$this->teacherToken)
            ->postJson('/api/v1/sections/'.$sectionId.'/lessons', [
                'title' => '3.1 Merge Sort & Inversions',
                'type' => 'text',
                'content' => 'Merge sort runs in O(n log n) worst-case time using auxiliary space.',
                'order_index' => 1,
                'is_free_preview' => false,
            ]);

        $lesResponse->assertStatus(201)
            ->assertJsonPath('lesson.title', '3.1 Merge Sort & Inversions');
    }

    public function test_enrolled_student_can_access_private_lesson(): void
    {
        // Lesson 1.2 is private (not free preview)
        $privateLesson = Lesson::where('title', 'like', '%1.2%')->first();

        $response = $this->withHeader('Authorization', 'Bearer '.$this->enrolledToken)
            ->getJson('/api/v1/lessons/'.$privateLesson->id.'/access');

        $response->assertStatus(200)
            ->assertJsonPath('lesson_id', $privateLesson->id);

        $this->assertNotNull($response->json('content'));
    }

    public function test_non_enrolled_student_cannot_access_private_lesson(): void
    {
        $privateLesson = Lesson::where('title', 'like', '%1.2%')->first();

        $response = $this->withHeader('Authorization', 'Bearer '.$this->nonEnrolledToken)
            ->getJson('/api/v1/lessons/'.$privateLesson->id.'/access');

        $response->assertStatus(403);
    }

    public function test_any_user_can_access_free_preview_lesson(): void
    {
        // Lesson 1.1 is free preview
        $previewLesson = Lesson::where('title', 'like', '%1.1%')->first();

        $response = $this->withHeader('Authorization', 'Bearer '.$this->nonEnrolledToken)
            ->getJson('/api/v1/lessons/'.$previewLesson->id.'/access');

        $response->assertStatus(200)
            ->assertJsonPath('lesson_id', $previewLesson->id);
    }

    public function test_draft_lesson_content_is_not_accessible_to_students_even_as_preview(): void
    {
        $section = \App\Models\CourseSection::where('course_id', $this->course->id)->firstOrFail();
        $lesson = Lesson::create([
            'course_id' => $this->course->id,
            'section_id' => $section->id,
            'title' => 'Draft preview lesson',
            'type' => 'text',
            'content' => 'Unpublished content',
            'is_free_preview' => true,
            'status' => 'draft',
        ]);

        $this->actingAs($this->enrolledStudent)
            ->getJson('/api/v1/lessons/'.$lesson->id.'/access')
            ->assertForbidden();

        $this->actingAs($this->enrolledStudent)
            ->getJson('/api/v1/lessons/'.$lesson->id)
            ->assertOk()
            ->assertJsonPath('lesson.is_accessible', false)
            ->assertJsonPath('lesson.content', null);

        $sectionResponse = $this->actingAs($this->nonEnrolledStudent)
            ->getJson("/api/v1/courses/{$this->course->id}/sections/{$section->id}")
            ->assertOk();
        $serializedLesson = collect($sectionResponse->json('section.lessons'))
            ->firstWhere('id', $lesson->id);

        $this->assertFalse($serializedLesson['is_accessible']);
        $this->assertNull($serializedLesson['content']);
        $this->assertNull($serializedLesson['video_url']);
        $this->assertNull($serializedLesson['attachment_path']);
        $this->assertNull($serializedLesson['attachment_name']);
    }

    public function test_students_cannot_delete_lessons(): void
    {
        $lesson = Lesson::firstOrFail();

        $this->actingAs($this->enrolledStudent)
            ->deleteJson('/api/v1/lessons/'.$lesson->id)
            ->assertForbidden();

        $this->assertDatabaseHas('lessons', ['id' => $lesson->id]);

        $otherCourse = Course::where('id', '!=', $this->course->id)->firstOrFail();
        $otherSection = CourseSection::create([
            'course_id' => $otherCourse->id,
            'title' => 'Unmanaged course section',
        ]);
        $otherLesson = Lesson::create([
            'course_id' => $otherCourse->id,
            'section_id' => $otherSection->id,
            'title' => 'Unmanaged lesson',
        ]);

        $this->actingAs($this->teacher)
            ->deleteJson('/api/v1/lessons/'.$otherLesson->id)
            ->assertForbidden();

        $this->assertDatabaseHas('lessons', ['id' => $otherLesson->id]);
    }

    public function test_course_section_deletion_requires_management_access_and_matching_course(): void
    {
        $section = CourseSection::where('course_id', $this->course->id)->firstOrFail();

        $this->actingAs($this->enrolledStudent)
            ->deleteJson("/api/v1/courses/{$this->course->id}/sections/{$section->id}")
            ->assertForbidden();

        $otherCourse = Course::where('id', '!=', $this->course->id)->firstOrFail();
        $this->actingAs($this->teacher)
            ->deleteJson("/api/v1/courses/{$otherCourse->id}/sections/{$section->id}")
            ->assertNotFound();

        $otherSection = CourseSection::create([
            'course_id' => $otherCourse->id,
            'title' => 'Unmanaged section',
        ]);
        $this->actingAs($this->teacher)
            ->deleteJson("/api/v1/courses/{$otherCourse->id}/sections/{$otherSection->id}")
            ->assertForbidden();

        $this->actingAs($this->teacher)
            ->deleteJson("/api/v1/courses/{$this->course->id}/sections/{$section->id}")
            ->assertOk();

        $this->assertDatabaseMissing('course_sections', ['id' => $section->id]);
    }

    public function test_section_update_authorizes_the_bound_sections_course(): void
    {
        $otherCourse = Course::where('id', '!=', $this->course->id)->firstOrFail();
        $section = CourseSection::create([
            'course_id' => $otherCourse->id,
            'title' => 'Other course section',
        ]);

        $this->actingAs($this->teacher)
            ->putJson("/api/v1/courses/{$this->course->id}/sections/{$section->id}", [
                'title' => 'Unauthorized update',
            ])
            ->assertForbidden();

        $this->assertDatabaseHas('course_sections', [
            'id' => $section->id,
            'title' => 'Other course section',
        ]);
    }

    public function test_course_completion_ignores_draft_lessons(): void
    {
        $section = CourseSection::where('course_id', $this->course->id)->firstOrFail();
        $publishedLesson = Lesson::create([
            'course_id' => $this->course->id,
            'section_id' => $section->id,
            'title' => 'Published progress lesson',
            'status' => 'published',
        ]);
        $draftLesson = Lesson::create([
            'course_id' => $this->course->id,
            'section_id' => $section->id,
            'title' => 'Draft progress lesson',
            'status' => 'draft',
        ]);

        LessonProgress::create([
            'course_id' => $this->course->id,
            'lesson_id' => $publishedLesson->id,
            'user_id' => $this->enrolledStudent->id,
            'is_completed' => true,
        ]);
        LessonProgress::create([
            'course_id' => $this->course->id,
            'lesson_id' => $draftLesson->id,
            'user_id' => $this->enrolledStudent->id,
            'is_completed' => true,
        ]);

        $progress = $this->course->calculateProgressFor($this->enrolledStudent);

        $this->assertSame(
            Lesson::where('course_id', $this->course->id)->where('status', 'published')->count(),
            $progress['total_lessons']
        );
        $this->assertSame(1, $progress['completed_lessons']);
    }

    public function test_enrolled_student_can_mark_lesson_as_completed_and_track_progress(): void
    {
        $lesson1 = Lesson::where('title', 'like', '%1.1%')->first();

        $response = $this->withHeader('Authorization', 'Bearer '.$this->enrolledToken)
            ->postJson('/api/v1/lessons/'.$lesson1->id.'/progress', [
                'is_completed' => true,
                'last_position_seconds' => 120,
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('progress.is_completed', true)
            ->assertJsonPath('progress.last_position_seconds', 120);

        // Verify overall course progress
        $progressResponse = $this->withHeader('Authorization', 'Bearer '.$this->enrolledToken)
            ->getJson('/api/v1/courses/'.$this->course->id.'/progress');

        $progressResponse->assertStatus(200)
            ->assertJsonPath('progress.completed_lessons', 1);

        $this->assertGreaterThan(0, $progressResponse->json('progress.percentage'));
    }
}
