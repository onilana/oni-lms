<?php

namespace Database\Seeders;

use App\Models\AcademicSession;
use App\Models\Batch;
use App\Models\Department;
use App\Models\Programme;
use App\Models\Semester;
use App\Models\User;
use Illuminate\Database\Seeder;

class AcademicSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::where('email', 'admin@onilms.edu')->first();

        // 1. Departments
        $cse = Department::firstOrCreate(
            ['code' => 'CSE'],
            [
                'name' => 'Department of Computer Science & Engineering',
                'description' => 'Computing sciences, software systems, and artificial intelligence.',
                'status' => 'active',
                'head_of_department_id' => $admin?->id,
            ]
        );

        $ece = Department::firstOrCreate(
            ['code' => 'ECE'],
            [
                'name' => 'Department of Electronics & Communication',
                'description' => 'Embedded systems, signal processing, and communication networks.',
                'status' => 'active',
            ]
        );

        // 2. Programmes
        $btechCse = Programme::firstOrCreate(
            ['department_id' => $cse->id, 'code' => 'BTECH-CSE'],
            [
                'name' => 'Bachelor of Technology in Computer Science',
                'duration_years' => 4,
                'total_semesters' => 8,
                'status' => 'active',
            ]
        );

        $mtechAi = Programme::firstOrCreate(
            ['department_id' => $cse->id, 'code' => 'MTECH-AI'],
            [
                'name' => 'Master of Technology in Artificial Intelligence',
                'duration_years' => 2,
                'total_semesters' => 4,
                'status' => 'active',
            ]
        );

        // 3. Academic Sessions
        $session = AcademicSession::firstOrCreate(
            ['name' => '2026-2027'],
            [
                'start_date' => '2026-08-01',
                'end_date' => '2027-05-31',
                'is_current' => true,
                'status' => 'active',
            ]
        );

        // 4. Semesters
        Semester::firstOrCreate(
            ['academic_session_id' => $session->id, 'semester_number' => 1],
            [
                'name' => 'Fall Semester (Sem 1)',
                'start_date' => '2026-08-01',
                'end_date' => '2026-12-15',
                'is_active' => true,
            ]
        );

        Semester::firstOrCreate(
            ['academic_session_id' => $session->id, 'semester_number' => 2],
            [
                'name' => 'Spring Semester (Sem 2)',
                'start_date' => '2027-01-10',
                'end_date' => '2027-05-30',
                'is_active' => false,
            ]
        );

        // 5. Batch
        Batch::firstOrCreate(
            ['programme_id' => $btechCse->id, 'code' => 'CSE-2026'],
            [
                'academic_session_id' => $session->id,
                'name' => 'B.Tech CSE — Class of 2030',
                'max_capacity' => 120,
                'status' => 'active',
            ]
        );
    }
}
