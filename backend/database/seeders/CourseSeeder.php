<?php

namespace Database\Seeders;

use App\Models\AcademicSession;
use App\Models\Batch;
use App\Models\Course;
use App\Models\CourseEnrolment;
use App\Models\CourseInstructor;
use App\Models\Department;
use App\Models\Programme;
use App\Models\Semester;
use App\Models\StudentProfile;
use App\Models\User;
use Illuminate\Database\Seeder;

class CourseSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::where('email', 'admin@onilms.edu')->first();
        $cse = Department::where('code', 'CSE')->first();
        $btechCse = Programme::where('code', 'BTECH-CSE')->first();
        $session = AcademicSession::where('is_current', true)->first();

        if (! $cse || ! $btechCse || ! $session) {
            return;
        }

        // 1. Data Structures and Algorithms
        $dsa = Course::firstOrCreate(
            ['department_id' => $cse->id, 'code' => 'CS101'],
            [
                'programme_id' => $btechCse->id,
                'title' => 'Data Structures and Algorithms',
                'description' => 'Fundamental concepts of data structures, complexity analysis, trees, graphs, and dynamic programming.',
                'credits' => 4,
                'level' => 'Undergraduate',
                'semester_number' => 1,
                'status' => 'published',
                'syllabus' => "Unit 1: Arrays, Linked Lists, Stacks & Queues\nUnit 2: Trees and Balanced BSTs\nUnit 3: Graphs & Shortest Path Algorithms\nUnit 4: Dynamic Programming & Greedy Techniques",
                'created_by_id' => $admin?->id,
            ]
        );

        // 2. Database Management Systems
        $dbms = Course::firstOrCreate(
            ['department_id' => $cse->id, 'code' => 'CS201'],
            [
                'programme_id' => $btechCse->id,
                'title' => 'Database Management Systems',
                'description' => 'Relational database design, SQL querying, indexing, transaction management, and ACID guarantees.',
                'credits' => 3,
                'level' => 'Undergraduate',
                'semester_number' => 2,
                'status' => 'published',
                'syllabus' => "Unit 1: ER Modeling and Relational Algebra\nUnit 2: SQL and Normalization (1NF to BCNF)\nUnit 3: Transactions, Concurrency & Locking\nUnit 4: Indexing and Query Optimization",
                'created_by_id' => $admin?->id,
            ]
        );

        // Assign instructor
        $teacher = User::where('email', 'teacher@onilms.edu')->first();
        $hod = User::where('email', 'hod@onilms.edu')->first();

        if ($teacher) {
            \App\Models\TeacherProfile::firstOrCreate(
                ['user_id' => $teacher->id],
                [
                    'department_id' => $cse->id,
                    'employee_id_number' => 'FAC-2026-0012',
                    'designation' => 'Associate Professor',
                    'qualification' => 'Ph.D. in Computer Science',
                    'status' => 'active',
                ]
            );

            CourseInstructor::firstOrCreate([
                'course_id' => $dsa->id,
                'user_id' => $teacher->id,
            ], [
                'role' => 'lead',
                'academic_session_id' => $session->id,
            ]);

            CourseInstructor::firstOrCreate([
                'course_id' => $dbms->id,
                'user_id' => $teacher->id,
            ], [
                'role' => 'lead',
                'academic_session_id' => $session->id,
            ]);
        }

        if ($hod) {
            \App\Models\TeacherProfile::firstOrCreate(
                ['user_id' => $hod->id],
                [
                    'department_id' => $cse->id,
                    'employee_id_number' => 'FAC-2026-0001',
                    'designation' => 'Professor & Head of Department',
                    'qualification' => 'Ph.D., Senior Member IEEE',
                    'status' => 'active',
                ]
            );
        }

        if ($admin) {
            CourseInstructor::firstOrCreate([
                'course_id' => $dsa->id,
                'user_id' => $admin->id,
            ], [
                'role' => 'co_instructor',
                'academic_session_id' => $session->id,
            ]);

            CourseInstructor::firstOrCreate([
                'course_id' => $dbms->id,
                'user_id' => $admin->id,
            ], [
                'role' => 'co_instructor',
                'academic_session_id' => $session->id,
            ]);
        }

        // Demo Student Profile & Enrolments
        $student = User::where('email', 'student@onilms.edu')->first();
        $batch = Batch::where('code', 'CSE-2026')->first();
        $sem1 = Semester::where('academic_session_id', $session->id)->where('semester_number', 1)->first();

        if ($student && $batch) {
            StudentProfile::firstOrCreate(
                ['user_id' => $student->id],
                [
                    'programme_id' => $btechCse->id,
                    'batch_id' => $batch->id,
                    'student_id_number' => 'STU-2026-0042',
                    'admission_date' => '2026-08-01',
                    'current_semester' => 1,
                    'status' => 'active',
                ]
            );

            CourseEnrolment::firstOrCreate([
                'course_id' => $dsa->id,
                'user_id' => $student->id,
                'academic_session_id' => $session->id,
            ], [
                'semester_id' => $sem1?->id,
                'status' => 'enrolled',
                'enrolled_at' => now(),
            ]);

            CourseEnrolment::firstOrCreate([
                'course_id' => $dbms->id,
                'user_id' => $student->id,
                'academic_session_id' => $session->id,
            ], [
                'semester_id' => $sem1?->id,
                'status' => 'enrolled',
                'enrolled_at' => now(),
            ]);
        }
    }
}
