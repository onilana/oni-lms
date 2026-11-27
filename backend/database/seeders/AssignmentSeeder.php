<?php

namespace Database\Seeders;

use App\Models\Assignment;
use App\Models\Course;
use App\Models\User;
use Illuminate\Database\Seeder;

class AssignmentSeeder extends Seeder
{
    public function run(): void
    {
        $dsa = Course::where('code', 'CS101')->first();
        $admin = User::where('email', 'admin@educare.edu')->first();

        if (! $dsa || ! $admin) {
            return;
        }

        Assignment::firstOrCreate(
            ['course_id' => $dsa->id, 'title' => 'Programming Assignment 1: Singly Linked List Operations'],
            [
                'description' => 'Implement standard linked list primitives in C++ or Java, including reverse, cycle detection, and merge sort.',
                'instructions' => "1. Implement `insertAtHead`, `insertAtTail`, `deleteNode`, and `reverseList`.\n2. Add test cases verifying time complexity bounds.\n3. Submit your source code or repository link.",
                'due_date' => now()->addDays(7),
                'max_score' => 100,
                'submission_type' => 'both',
                'status' => 'published',
                'created_by_id' => $admin->id,
            ]
        );

        Assignment::firstOrCreate(
            ['course_id' => $dsa->id, 'title' => 'Theory Assignment 2: Asymptotic Analysis & Master Theorem'],
            [
                'description' => 'Solve recurrence relations using Substitution, Recursion Tree, and Master Theorem.',
                'instructions' => "Provide step-by-step mathematical proofs for the 5 recurrence equations in the problem sheet.",
                'due_date' => now()->addDays(14),
                'max_score' => 50,
                'submission_type' => 'text',
                'status' => 'published',
                'created_by_id' => $admin->id,
            ]
        );
    }
}
