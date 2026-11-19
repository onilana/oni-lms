<?php

namespace Database\Seeders;

use App\Models\AcademicSession;
use App\Models\AttendanceRecord;
use App\Models\AttendanceSession;
use App\Models\Course;
use App\Models\User;
use Illuminate\Database\Seeder;

class AttendanceSeeder extends Seeder
{
    public function run(): void
    {
        $teacher = User::where('email', 'admin@onilms.edu')->first();
        $student = User::where('email', 'student@onilms.edu')->first();
        $course = Course::where('code', 'CS101')->first();
        $academicSession = AcademicSession::where('is_current', true)->first();

        if (!$course || !$teacher || !$student) {
            return;
        }

        $sessionsData = [
            [
                'session_date' => now()->subDays(14)->format('Y-m-d'),
                'start_time' => '09:00',
                'end_time' => '10:00',
                'topic' => 'Lecture 1: Introduction to Data Structures & Complexity',
                'room' => 'Hall 3B',
                'status' => 'completed',
                'student_status' => 'present',
                'remarks' => null,
            ],
            [
                'session_date' => now()->subDays(10)->format('Y-m-d'),
                'start_time' => '09:00',
                'end_time' => '10:00',
                'topic' => 'Lecture 2: Arrays and Memory Representation',
                'room' => 'Hall 3B',
                'status' => 'completed',
                'student_status' => 'present',
                'remarks' => null,
            ],
            [
                'session_date' => now()->subDays(7)->format('Y-m-d'),
                'start_time' => '09:00',
                'end_time' => '10:00',
                'topic' => 'Lecture 3: Singly and Doubly Linked Lists',
                'room' => 'Hall 3B',
                'status' => 'completed',
                'student_status' => 'late',
                'remarks' => 'Transit delay; attended second half',
            ],
            [
                'session_date' => now()->subDays(3)->format('Y-m-d'),
                'start_time' => '11:00',
                'end_time' => '13:00',
                'topic' => 'Lab 1: Linked List Implementation in C++',
                'room' => 'Lab 204',
                'status' => 'completed',
                'student_status' => 'present',
                'remarks' => null,
            ],
            [
                'session_date' => now()->addDays(2)->format('Y-m-d'),
                'start_time' => '09:00',
                'end_time' => '10:00',
                'topic' => 'Lecture 4: Stack & Queue Principles',
                'room' => 'Hall 3B',
                'status' => 'scheduled',
                'student_status' => null,
                'remarks' => null,
            ],
        ];

        foreach ($sessionsData as $item) {
            $sess = AttendanceSession::firstOrCreate(
                [
                    'course_id' => $course->id,
                    'session_date' => $item['session_date'],
                    'start_time' => $item['start_time'],
                ],
                [
                    'academic_session_id' => $academicSession?->id,
                    'instructor_id' => $teacher->id,
                    'end_time' => $item['end_time'],
                    'topic' => $item['topic'],
                    'room' => $item['room'],
                    'status' => $item['status'],
                ]
            );

            if ($item['student_status']) {
                AttendanceRecord::firstOrCreate(
                    [
                        'attendance_session_id' => $sess->id,
                        'student_user_id' => $student->id,
                    ],
                    [
                        'status' => $item['student_status'],
                        'remarks' => $item['remarks'],
                        'marked_by_id' => $teacher->id,
                    ]
                );
            }
        }
    }
}
