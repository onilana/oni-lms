<?php

namespace App\Services;

use App\Models\Certificate;
use App\Models\Course;
use App\Models\CourseEnrolment;
use App\Models\ExamAttempt;
use App\Models\User;
use Illuminate\Validation\ValidationException;

class CertificateService
{
    public function checkEligibility(Course $course, User $student): array
    {
        $existingCertificate = Certificate::where('course_id', $course->id)
            ->where('user_id', $student->id)
            ->first();

        $enrolment = CourseEnrolment::where('course_id', $course->id)
            ->where('user_id', $student->id)
            ->first();

        $isEnrolled = $enrolment !== null && in_array($enrolment->status, ['active', 'completed']);

        // 1. Lessons progress
        $progress = $course->calculateProgressFor($student);
        $lessonsPassed = $progress['total_lessons'] === 0 || $progress['percentage'] >= 100;

        // 2. Attendance requirement (>= 75% quota)
        $attendance = $course->calculateAttendanceFor($student);
        $attendancePassed = !$attendance['has_shortage'] && $attendance['percentage'] >= 75;

        // 3. Exams completion
        $publishedExams = $course->exams()->where('status', 'published')->get();
        $totalExams = $publishedExams->count();
        $passedExamsCount = 0;
        $totalExamScore = 0;

        if ($totalExams > 0) {
            $examIds = $publishedExams->pluck('id')->all();
            $bestPassedAttempts = ExamAttempt::where('user_id', $student->id)
                ->whereIn('exam_id', $examIds)
                ->where('is_passed', true)
                ->get()
                ->groupBy('exam_id');

            $passedExamsCount = $bestPassedAttempts->count();
            $examsPassed = $passedExamsCount >= $totalExams;

            if ($passedExamsCount > 0) {
                $scores = $bestPassedAttempts->map(fn ($attempts) => $attempts->max('percentage'));
                $totalExamScore = round($scores->average(), 2);
            }
        } else {
            $examsPassed = true;
            $totalExamScore = null;
        }

        $reasons = [];
        if (!$isEnrolled) {
            $reasons[] = 'Student is not actively enrolled in this course.';
        }
        if (!$lessonsPassed) {
            $reasons[] = "Course syllabus not completed ({$progress['completed_lessons']}/{$progress['total_lessons']} lessons).";
        }
        if (!$attendancePassed) {
            $reasons[] = "Minimum 75% attendance quota not met (Current: {$attendance['percentage']}%).";
        }
        if (!$examsPassed) {
            $reasons[] = "All required course examinations must be passed ({$passedExamsCount}/{$totalExams} passed).";
        }
        if ($existingCertificate) {
            $reasons[] = 'Certificate has already been issued for this course.';
        }

        $isEligible = $isEnrolled && $lessonsPassed && $attendancePassed && $examsPassed && !$existingCertificate;

        return [
            'eligible' => $isEligible,
            'is_enrolled' => $isEnrolled,
            'lessons' => [
                'total' => $progress['total_lessons'],
                'completed' => $progress['completed_lessons'],
                'percentage' => $progress['percentage'],
                'passed' => $lessonsPassed,
            ],
            'attendance' => [
                'total_sessions' => $attendance['total_sessions'],
                'percentage' => $attendance['percentage'],
                'required_percentage' => 75,
                'has_shortage' => $attendance['has_shortage'],
                'passed' => $attendancePassed,
            ],
            'exams' => [
                'total' => $totalExams,
                'passed' => $passedExamsCount,
                'average_score' => $totalExamScore,
                'passed_all' => $examsPassed,
            ],
            'existing_certificate' => $existingCertificate,
            'reasons' => $reasons,
        ];
    }

    public function issueCertificate(Course $course, User $student, ?User $issuer = null, array $customMeta = [], bool $force = false): Certificate
    {
        $existing = Certificate::where('course_id', $course->id)
            ->where('user_id', $student->id)
            ->first();

        if ($existing) {
            return $existing;
        }

        $eligibility = $this->checkEligibility($course, $student);

        if (!$force && !$eligibility['eligible']) {
            throw ValidationException::withMessages([
                'eligibility' => $eligibility['reasons'],
            ]);
        }

        $examScore = $eligibility['exams']['average_score'];
        $grade = 'Pass';
        if ($examScore !== null) {
            if ($examScore >= 90) {
                $grade = 'Distinction';
            } elseif ($examScore >= 75) {
                $grade = 'Merit';
            }
        }

        $departmentName = $course->department?->name ?? 'Department of Computer Science';
        $programmeName = $course->programme?->name ?? 'B.Sc. Honours';

        $metadata = array_merge([
            'student_name' => $student->name,
            'student_email' => $student->email,
            'course_title' => $course->title,
            'course_code' => $course->code,
            'credits' => $course->credits,
            'department' => $departmentName,
            'programme' => $programmeName,
            'institution_name' => 'ONI Institute of Technology and Higher Education',
            'issuer_name' => $issuer?->name ?? 'Academic Council & Examination Board',
            'signatory_role' => 'Controller of Examinations & Academic Dean',
            'verification_url' => url('/api/v1/certificates/verify/'),
        ], $customMeta);

        $enrolment = CourseEnrolment::where('course_id', $course->id)
            ->where('user_id', $student->id)
            ->first();

        return Certificate::create([
            'user_id' => $student->id,
            'course_id' => $course->id,
            'academic_session_id' => $enrolment?->academic_session_id,
            'issued_by_id' => $issuer?->id,
            'issued_at' => now(),
            'title' => "Certificate of Academic Excellence in {$course->title}",
            'grade' => $grade,
            'final_score' => $examScore,
            'attendance_percentage' => $eligibility['attendance']['percentage'],
            'lessons_completed_count' => $eligibility['lessons']['completed'],
            'metadata' => $metadata,
            'is_revoked' => false,
        ]);
    }
}
