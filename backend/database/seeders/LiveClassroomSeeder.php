<?php

namespace Database\Seeders;

use App\Models\AcademicSession;
use App\Models\Announcement;
use App\Models\Course;
use App\Models\InAppNotification;
use App\Models\LiveSession;
use App\Models\User;
use Illuminate\Database\Seeder;

class LiveClassroomSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::where('email', 'admin@onilms.edu')->first();
        $student = User::where('email', 'student@onilms.edu')->first();
        $course = Course::where('code', 'CS101')->first();
        $session = AcademicSession::where('is_current', true)->first();

        if (!$course || !$admin) {
            return;
        }

        $instructor = $course->teacherUsers()->first() ?? $admin;

        // 1. Live Class that is LIVE RIGHT NOW (Interactive join test)
        LiveSession::updateOrCreate(
            [
                'course_id' => $course->id,
                'title' => 'CS101: Live Algorithmic Problem Solving & Office Hours',
            ],
            [
                'academic_session_id' => $session?->id,
                'instructor_id' => $instructor->id,
                'description' => 'Interactive session covering asymptotic runtime analysis, Big-O recurrence relations, and dynamic programming walkthrough with Q&A.',
                'provider' => LiveSession::PROVIDER_JITSI,
                'meeting_url' => 'https://meet.jit.si/ONI-LMS-CS101-Live-Workshop-2026',
                'meeting_id' => 'CS101-LIVE-901',
                'passcode' => 'OniLive2026!',
                'scheduled_start_at' => now()->subMinutes(10),
                'scheduled_end_at' => now()->addMinutes(50),
                'actual_started_at' => now()->subMinutes(8),
                'status' => LiveSession::STATUS_LIVE,
                'settings' => [
                    'mute_on_entry' => true,
                    'enable_screen_share' => true,
                    'enable_chat' => true,
                ],
            ]
        );

        // 2. Scheduled Live Class for Tomorrow
        LiveSession::updateOrCreate(
            [
                'course_id' => $course->id,
                'title' => 'CS101: Graph Traversal Algorithms (BFS & DFS Deep Dive)',
            ],
            [
                'academic_session_id' => $session?->id,
                'instructor_id' => $instructor->id,
                'description' => 'Hands-on live coding of graph traversal, Dijkstra shortest path, and topological sorting algorithms.',
                'provider' => LiveSession::PROVIDER_GOOGLE_MEET,
                'meeting_url' => 'https://meet.google.com/oni-cs101-graph',
                'meeting_id' => 'oni-cs101-graph',
                'passcode' => 'GraphCode26',
                'scheduled_start_at' => now()->addDay()->setHour(14)->setMinute(0),
                'scheduled_end_at' => now()->addDay()->setHour(15)->setMinute(30),
                'status' => LiveSession::STATUS_SCHEDULED,
            ]
        );

        // 3. Past Completed Live Session with Recording
        LiveSession::updateOrCreate(
            [
                'course_id' => $course->id,
                'title' => 'CS101: Course Orientation & Environment Setup',
            ],
            [
                'academic_session_id' => $session?->id,
                'instructor_id' => $instructor->id,
                'description' => 'Introductory session introducing syllabus, grading policy, compiler installation, and coursework workflow.',
                'provider' => LiveSession::PROVIDER_ZOOM,
                'meeting_url' => 'https://zoom.us/j/98765432101',
                'meeting_id' => '98765432101',
                'passcode' => 'ZoomCS101',
                'scheduled_start_at' => now()->subDays(5)->setHour(10)->setMinute(0),
                'scheduled_end_at' => now()->subDays(5)->setHour(11)->setMinute(30),
                'actual_started_at' => now()->subDays(5)->setHour(10)->setMinute(2),
                'actual_ended_at' => now()->subDays(5)->setHour(11)->setMinute(28),
                'status' => LiveSession::STATUS_COMPLETED,
                'recording_url' => 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
            ]
        );

        // 4. Campus & Course Announcements
        Announcement::updateOrCreate(
            [
                'title' => 'Campus Notice: Mid-Term Examination Schedule & Registration Open',
            ],
            [
                'author_id' => $admin->id,
                'course_id' => null,
                'content' => 'The Controller of Examinations has published the Autumn 2026 examination timetable. Students must verify their enrolled courses and report any schedule conflicts before Friday.',
                'priority' => Announcement::PRIORITY_HIGH,
                'is_pinned' => true,
                'published_at' => now()->subDays(2),
            ]
        );

        Announcement::updateOrCreate(
            [
                'title' => 'CS101: Preparation Materials for Graph Theory Live Workshop',
            ],
            [
                'author_id' => $instructor->id,
                'course_id' => $course->id,
                'content' => 'Please clone the starter repository and review Section 3 slides on Adjacency Matrices prior to our interactive live session tomorrow.',
                'priority' => Announcement::PRIORITY_NORMAL,
                'is_pinned' => false,
                'published_at' => now()->subHours(6),
            ]
        );

        // 5. In-App Notifications for Demo Student
        if ($student) {
            InAppNotification::updateOrCreate(
                [
                    'user_id' => $student->id,
                    'title' => '🔴 CS101 Live Class is Happening Now',
                ],
                [
                    'type' => 'live_class',
                    'message' => 'Dr. Alan Turing has started the live classroom session for CS101. Click to join the room.',
                    'action_url' => '/live-classroom',
                    'is_read' => false,
                    'created_at' => now()->subMinutes(5),
                ]
            );

            InAppNotification::updateOrCreate(
                [
                    'user_id' => $student->id,
                    'title' => 'Announcement: Mid-Term Exam Schedule',
                ],
                [
                    'type' => 'announcement',
                    'message' => 'Official examination timetable published by Academic Senate.',
                    'action_url' => '/live-classroom',
                    'is_read' => true,
                    'read_at' => now()->subHours(1),
                    'created_at' => now()->subDays(1),
                ]
            );
        }
    }
}
