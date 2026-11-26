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

        // 6. Arts, Science, Commerce & Education Structure
        $sci = Department::firstOrCreate(
            ['code' => 'SCI'],
            [
                'name' => 'Faculty of Science',
                'description' => 'Physical, chemical, biological, and mathematical sciences.',
                'status' => 'active',
            ]
        );

        $art = Department::firstOrCreate(
            ['code' => 'ART'],
            [
                'name' => 'Faculty of Arts & Humanities',
                'description' => 'Languages, literature, history, social sciences, and humanities.',
                'status' => 'active',
            ]
        );

        $com = Department::firstOrCreate(
            ['code' => 'COM'],
            [
                'name' => 'Department of Commerce',
                'description' => 'Accounting, finance, business administration, and economics.',
                'status' => 'active',
            ]
        );

        $edu = Department::firstOrCreate(
            ['code' => 'EDU'],
            [
                'name' => 'Department of Education',
                'description' => 'Teacher training, pedagogy, and educational studies.',
                'status' => 'active',
            ]
        );

        // Science Sub-Departments
        $scienceSubDepts = [
            ['code' => 'ZOO', 'name' => 'Department of Zoology', 'description' => 'Animal biology, physiology, ecology, and genetics.'],
            ['code' => 'BOT', 'name' => 'Department of Botany', 'description' => 'Plant sciences, taxonomy, physiology, and biotechnology.'],
            ['code' => 'PHY', 'name' => 'Department of Physics', 'description' => 'Classical mechanics, quantum physics, optics, and electronics.'],
            ['code' => 'CHE', 'name' => 'Department of Chemistry', 'description' => 'Organic, inorganic, physical, and analytical chemistry.'],
            ['code' => 'MAT', 'name' => 'Department of Mathematics', 'description' => 'Pure and applied mathematics, calculus, and statistics.'],
        ];
        foreach ($scienceSubDepts as $deptData) {
            Department::firstOrCreate(
                ['code' => $deptData['code']],
                [
                    'name' => $deptData['name'],
                    'description' => $deptData['description'],
                    'parent_id' => $sci->id,
                    'status' => 'active',
                ]
            );
        }

        // Arts Sub-Departments
        $artsSubDepts = [
            ['code' => 'ENG', 'name' => 'Department of English', 'description' => 'English literature, linguistics, and communication.'],
            ['code' => 'HIS', 'name' => 'Department of History', 'description' => 'Ancient, medieval, and modern world history.'],
            ['code' => 'POL', 'name' => 'Department of Political Science', 'description' => 'Political theory, governance, and international relations.'],
            ['code' => 'ECO', 'name' => 'Department of Economics', 'description' => 'Microeconomics, macroeconomics, and econometrics.'],
        ];
        foreach ($artsSubDepts as $deptData) {
            Department::firstOrCreate(
                ['code' => $deptData['code']],
                [
                    'name' => $deptData['name'],
                    'description' => $deptData['description'],
                    'parent_id' => $art->id,
                    'status' => 'active',
                ]
            );
        }

        // Degree Programmes
        $ba = Programme::firstOrCreate(
            ['department_id' => $art->id, 'code' => 'BA'],
            [
                'name' => 'Bachelor of Arts',
                'duration_years' => 3,
                'total_semesters' => 6,
                'status' => 'active',
            ]
        );

        $bsc = Programme::firstOrCreate(
            ['department_id' => $sci->id, 'code' => 'BSC'],
            [
                'name' => 'Bachelor of Science',
                'duration_years' => 3,
                'total_semesters' => 6,
                'status' => 'active',
            ]
        );

        $bcom = Programme::firstOrCreate(
            ['department_id' => $com->id, 'code' => 'BCOM'],
            [
                'name' => 'Bachelor of Commerce',
                'duration_years' => 3,
                'total_semesters' => 6,
                'status' => 'active',
            ]
        );

        $bed = Programme::firstOrCreate(
            ['department_id' => $edu->id, 'code' => 'BED'],
            [
                'name' => 'Bachelor of Education (B.Ed.)',
                'duration_years' => 2,
                'total_semesters' => 4,
                'status' => 'active',
            ]
        );

        // Batches for general degree programmes
        foreach ([
            [$ba, 'BA-2026', 'Bachelor of Arts — 2026 Cohort'],
            [$bsc, 'BSC-2026', 'Bachelor of Science — 2026 Cohort'],
            [$bcom, 'BCOM-2026', 'Bachelor of Commerce — 2026 Cohort'],
            [$bed, 'BED-2026', 'Bachelor of Education (B.Ed.) — 2026 Cohort'],
        ] as [$prog, $code, $name]) {
            Batch::firstOrCreate(
                ['programme_id' => $prog->id, 'code' => $code],
                [
                    'academic_session_id' => $session->id,
                    'name' => $name,
                    'max_capacity' => 120,
                    'status' => 'active',
                ]
            );
        }
    }
}
