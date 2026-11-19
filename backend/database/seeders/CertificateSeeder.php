<?php

namespace Database\Seeders;

use App\Models\AcademicSession;
use App\Models\Certificate;
use App\Models\Course;
use App\Models\Exam;
use App\Models\ExamAttempt;
use App\Models\Lesson;
use App\Models\LessonProgress;
use App\Models\User;
use Illuminate\Database\Seeder;

class CertificateSeeder extends Seeder
{
    public function run(): void
    {
        $student = User::where('email', 'student@onilms.edu')->first();
        $admin = User::where('email', 'admin@onilms.edu')->first();
        $course = Course::where('code', 'CS101')->first();
        $session = AcademicSession::where('is_current', true)->first();

        if (!$student || !$course) {
            return;
        }

        // 1. Ensure lesson progress is 100% for student in CS101
        $lessons = Lesson::where('course_id', $course->id)->get();
        foreach ($lessons as $lesson) {
            LessonProgress::updateOrCreate(
                [
                    'user_id' => $student->id,
                    'lesson_id' => $lesson->id,
                ],
                [
                    'course_id' => $course->id,
                    'is_completed' => true,
                    'completed_at' => now()->subDays(3),
                    'last_position_seconds' => 600,
                ]
            );
        }

        // 2. Ensure exam attempt is passed for CS101
        $exam = Exam::where('course_id', $course->id)->first();
        if ($exam) {
            ExamAttempt::updateOrCreate(
                [
                    'exam_id' => $exam->id,
                    'user_id' => $student->id,
                    'attempt_number' => 1,
                ],
                [
                    'started_at' => now()->subDays(2),
                    'expires_at' => now()->subDays(2)->addMinutes(60),
                    'submitted_at' => now()->subDays(2)->addMinutes(35),
                    'status' => 'graded',
                    'score' => 95.00,
                    'percentage' => 95.00,
                    'is_passed' => true,
                ]
            );
        }

        // 3. Issue verifiable certificate for CS101
        Certificate::updateOrCreate(
            [
                'user_id' => $student->id,
                'course_id' => $course->id,
            ],
            [
                'certificate_code' => 'ONI-2026-CS101-HONORS',
                'academic_session_id' => $session?->id,
                'issued_by_id' => $admin?->id,
                'issued_at' => now()->subDays(1),
                'title' => "Certificate of Academic Excellence in {$course->title}",
                'grade' => 'Distinction',
                'final_score' => 95.00,
                'attendance_percentage' => 85.00,
                'lessons_completed_count' => $lessons->count(),
                'metadata' => [
                    'student_name' => $student->name,
                    'student_email' => $student->email,
                    'course_title' => $course->title,
                    'course_code' => $course->code,
                    'credits' => $course->credits,
                    'department' => $course->department?->name ?? 'Department of Computer Science',
                    'programme' => 'B.Sc. (Hons) Computer Science',
                    'institution_name' => 'ONI Institute of Technology and Higher Education',
                    'issuer_name' => 'Dr. Eleanor Vance, Controller of Examinations',
                    'signatory_role' => 'Academic Dean & University Registrar',
                    'verification_url' => url('/api/v1/certificates/verify/ONI-2026-CS101-HONORS'),
                ],
                'is_revoked' => false,
            ]
        );
    }
}
