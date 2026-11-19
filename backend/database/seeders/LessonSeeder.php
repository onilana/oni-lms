<?php

namespace Database\Seeders;

use App\Models\Course;
use App\Models\CourseSection;
use App\Models\Lesson;
use Illuminate\Database\Seeder;

class LessonSeeder extends Seeder
{
    public function run(): void
    {
        $dsa = Course::where('code', 'CS101')->first();
        if (! $dsa) {
            return;
        }

        // Section 1
        $sec1 = CourseSection::firstOrCreate(
            ['course_id' => $dsa->id, 'title' => 'Module 1: Introduction to Data Structures & Complexity'],
            [
                'description' => 'Asymptotic notation, Big-O analysis, memory hierarchy, and arrays.',
                'order_index' => 1,
                'status' => 'published',
            ]
        );

        Lesson::firstOrCreate(
            ['section_id' => $sec1->id, 'title' => '1.1 Welcome to Data Structures & Course Overview'],
            [
                'course_id' => $dsa->id,
                'type' => 'video',
                'content' => "## Course Welcome\nWelcome to CS101: Data Structures and Algorithms. In this course, you will master the foundational data representations and algorithmic paradigms essential for computer engineering.",
                'video_url' => 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
                'video_duration_seconds' => 596,
                'order_index' => 1,
                'is_free_preview' => true,
                'status' => 'published',
            ]
        );

        Lesson::firstOrCreate(
            ['section_id' => $sec1->id, 'title' => '1.2 Asymptotic Analysis & Time Complexity (Big-O)'],
            [
                'course_id' => $dsa->id,
                'type' => 'text',
                'content' => "### Understanding Big-O Notation\n\nAlgorithms are evaluated based on how their execution time and memory requirements grow relative to the input size \$n\$.\n\n- **\$O(1)\$**: Constant time (e.g. array indexing)\n- **\$O(\\log n)\$**: Logarithmic time (e.g. binary search)\n- **\$O(n)\$**: Linear time (e.g. traversing an unsorted array)\n- **\$O(n \\log n)\$**: Linearithmic time (e.g. Merge Sort, QuickSort average)\n- **\$O(n^2)\$**: Quadratic time (e.g. Bubble Sort, nested loops)",
                'order_index' => 2,
                'is_free_preview' => false,
                'status' => 'published',
            ]
        );

        // Section 2
        $sec2 = CourseSection::firstOrCreate(
            ['course_id' => $dsa->id, 'title' => 'Module 2: Linked Lists, Stacks & Queues'],
            [
                'description' => 'Dynamic node-based linear data structures and their implementations.',
                'order_index' => 2,
                'status' => 'published',
            ]
        );

        Lesson::firstOrCreate(
            ['section_id' => $sec2->id, 'title' => '2.1 Singly and Doubly Linked Lists'],
            [
                'course_id' => $dsa->id,
                'type' => 'pdf',
                'content' => "Review the accompanying lecture slides and implementation code for Singly, Doubly, and Circular Linked Lists.",
                'attachment_name' => 'CS101-Lecture02-LinkedLists.pdf',
                'attachment_path' => 'courses/CS101/docs/Lecture02-LinkedLists.pdf',
                'order_index' => 1,
                'is_free_preview' => false,
                'status' => 'published',
            ]
        );
    }
}
