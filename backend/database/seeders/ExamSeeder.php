<?php

namespace Database\Seeders;

use App\Models\Course;
use App\Models\Department;
use App\Models\Exam;
use App\Models\ExamQuestion;
use App\Models\Question;
use App\Models\QuestionBank;
use App\Models\User;
use Illuminate\Database\Seeder;

class ExamSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::where('email', 'admin@educare.edu')->first();
        if (!$admin) {
            return;
        }

        $course = Course::where('code', 'CS101')->first();
        $dept = Department::where('code', 'CSE')->first();

        // 1. Create Question Bank
        $bank = QuestionBank::firstOrCreate(
            ['title' => 'Computer Science Fundamentals Question Bank'],
            [
                'department_id' => $dept?->id,
                'description' => 'Standardized question pool for algorithms and data structures assessments',
                'created_by' => $admin->id,
            ]
        );

        // 2. Create Questions
        $q1 = Question::firstOrCreate(
            ['question_text' => 'What is the average time complexity of searching an element in a balanced Binary Search Tree (BST)?'],
            [
                'question_bank_id' => $bank->id,
                'course_id' => $course?->id,
                'question_type' => 'mcq_single',
                'options' => [
                    ['id' => 'a', 'text' => 'O(1)'],
                    ['id' => 'b', 'text' => 'O(log n)'],
                    ['id' => 'c', 'text' => 'O(n)'],
                    ['id' => 'd' ,'text' => 'O(n log n)'],
                ],
                'correct_answers' => ['b'],
                'points' => 2.00,
                'explanation' => 'A balanced BST halves the search space at each level, yielding O(log n) average complexity.',
                'created_by' => $admin->id,
            ]
        );

        $q2 = Question::firstOrCreate(
            ['question_text' => 'Which of the following data structures are non-linear? (Select all that apply)'],
            [
                'question_bank_id' => $bank->id,
                'course_id' => $course?->id,
                'question_type' => 'mcq_multiple',
                'options' => [
                    ['id' => 'a', 'text' => 'Array'],
                    ['id' => 'b', 'text' => 'Binary Tree'],
                    ['id' => 'c', 'text' => 'Graph'],
                    ['id' => 'd', 'text' => 'Linked List'],
                ],
                'correct_answers' => ['b', 'c'],
                'points' => 3.00,
                'explanation' => 'Trees and Graphs are non-linear; Arrays and Linked Lists are linear structures.',
                'created_by' => $admin->id,
            ]
        );

        $q3 = Question::firstOrCreate(
            ['question_text' => 'In a min-heap, the root node contains the maximum element.'],
            [
                'question_bank_id' => $bank->id,
                'course_id' => $course?->id,
                'question_type' => 'true_false',
                'options' => [
                    ['id' => 'true', 'text' => 'True'],
                    ['id' => 'false', 'text' => 'False'],
                ],
                'correct_answers' => ['false'],
                'points' => 1.00,
                'explanation' => 'A min-heap maintains the minimum element at the root node.',
                'created_by' => $admin->id,
            ]
        );

        $q4 = Question::firstOrCreate(
            ['question_text' => 'What abstract data type operates on a Last-In, First-Out (LIFO) principle?'],
            [
                'question_bank_id' => $bank->id,
                'course_id' => $course?->id,
                'question_type' => 'short_answer',
                'options' => null,
                'correct_answers' => ['stack', 'a stack'],
                'points' => 2.00,
                'explanation' => 'A stack is a LIFO data structure where elements are pushed and popped from the top.',
                'created_by' => $admin->id,
            ]
        );

        if (!$course) {
            return;
        }

        // 3. Create Exam
        $exam = Exam::firstOrCreate(
            ['title' => 'CS101 Midterm Examination: Data Structures'],
            [
                'course_id' => $course->id,
                'description' => 'Comprehensive mid-semester examination covering BSTs, Trees, Heaps, and Stacks.',
                'duration_minutes' => 45,
                'total_marks' => 8.00,
                'passing_percentage' => 50.00,
                'shuffle_questions' => true,
                'max_attempts' => 2,
                'is_published' => true,
                'created_by' => $admin->id,
            ]
        );

        // 4. Attach Questions to Exam
        $questions = [$q1, $q2, $q3, $q4];
        foreach ($questions as $idx => $q) {
            ExamQuestion::firstOrCreate(
                [
                    'exam_id' => $exam->id,
                    'question_id' => $q->id,
                ],
                [
                    'order_index' => $idx + 1,
                    'points' => $q->points,
                ]
            );
        }
    }
}
