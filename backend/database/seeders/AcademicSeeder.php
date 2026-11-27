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
        $admin = User::where('email', 'admin@educare.edu')->first();

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
                'level' => 'ug',
                'name' => 'Bachelor of Technology in Computer Science',
                'duration_years' => 4,
                'total_semesters' => 8,
                'status' => 'active',
            ]
        );

        $mtechAi = Programme::firstOrCreate(
            ['department_id' => $cse->id, 'code' => 'MTECH-AI'],
            [
                'level' => 'pg',
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

        // 6. Hierarchy: Level (PG / UG / Diploma / Certificate) -> Parent Programme -> Department
        $ba = Programme::updateOrCreate(
            ['code' => 'BA'],
            [
                'level' => 'ug',
                'department_id' => null,
                'name' => 'Bachelor of Arts',
                'duration_years' => 3,
                'total_semesters' => 6,
                'status' => 'active',
            ]
        );

        $bsc = Programme::updateOrCreate(
            ['code' => 'BSC'],
            [
                'level' => 'ug',
                'department_id' => null,
                'name' => 'Bachelor of Science',
                'duration_years' => 3,
                'total_semesters' => 6,
                'status' => 'active',
            ]
        );

        $bcom = Programme::updateOrCreate(
            ['code' => 'BCOM'],
            [
                'level' => 'ug',
                'department_id' => null,
                'name' => 'Bachelor of Commerce',
                'duration_years' => 3,
                'total_semesters' => 6,
                'status' => 'active',
            ]
        );

        $bed = Programme::updateOrCreate(
            ['code' => 'BED'],
            [
                'level' => 'ug',
                'department_id' => null,
                'name' => 'Bachelor of Education (B.Ed.)',
                'duration_years' => 2,
                'total_semesters' => 4,
                'status' => 'active',
            ]
        );

        $ma = Programme::updateOrCreate(
            ['code' => 'MA'],
            [
                'level' => 'pg',
                'department_id' => null,
                'name' => 'Master of Arts',
                'duration_years' => 2,
                'total_semesters' => 4,
                'status' => 'active',
            ]
        );

        $msc = Programme::updateOrCreate(
            ['code' => 'MSC'],
            [
                'level' => 'pg',
                'department_id' => null,
                'name' => 'Master of Science',
                'duration_years' => 2,
                'total_semesters' => 4,
                'status' => 'active',
            ]
        );

        $mcom = Programme::updateOrCreate(
            ['code' => 'MCOM'],
            [
                'level' => 'pg',
                'department_id' => null,
                'name' => 'Master of Commerce',
                'duration_years' => 2,
                'total_semesters' => 4,
                'status' => 'active',
            ]
        );

        $mba = Programme::updateOrCreate(
            ['code' => 'MBA'],
            [
                'level' => 'pg',
                'department_id' => null,
                'name' => 'Master of Business Administration',
                'duration_years' => 2,
                'total_semesters' => 4,
                'status' => 'active',
            ]
        );

        $pgd = Programme::updateOrCreate(
            ['code' => 'PGD'],
            [
                'level' => 'diploma',
                'department_id' => null,
                'name' => 'Post Graduate Diploma',
                'duration_years' => 1,
                'total_semesters' => 2,
                'status' => 'active',
            ]
        );

        $cert = Programme::updateOrCreate(
            ['code' => 'CERT'],
            [
                'level' => 'certificate',
                'department_id' => null,
                'name' => 'Certificate Course',
                'duration_years' => 1,
                'total_semesters' => 2,
                'status' => 'active',
            ]
        );

        // Departments linked to Parent Programmes
        $deptRows = [
            ['code' => 'ZOO', 'name' => 'Department of Zoology', 'programme_id' => $bsc->id, 'description' => 'Animal biology, physiology, ecology, and genetics.'],
            ['code' => 'BOT', 'name' => 'Department of Botany', 'programme_id' => $bsc->id, 'description' => 'Plant sciences, taxonomy, physiology, and biotechnology.'],
            ['code' => 'PHY', 'name' => 'Department of Physics', 'programme_id' => $bsc->id, 'description' => 'Classical mechanics, quantum physics, optics, and electronics.'],
            ['code' => 'CHE', 'name' => 'Department of Chemistry', 'programme_id' => $bsc->id, 'description' => 'Organic, inorganic, physical, and analytical chemistry.'],
            ['code' => 'MAT', 'name' => 'Department of Mathematics', 'programme_id' => $msc->id, 'description' => 'Pure and applied mathematics, calculus, and statistics.'],
            ['code' => 'HIS', 'name' => 'Department of History', 'programme_id' => $ma->id, 'description' => 'Ancient, medieval, and modern world history.'],
            ['code' => 'POL', 'name' => 'Department of Political Science', 'programme_id' => $ma->id, 'description' => 'Political theory, governance, and international relations.'],
            ['code' => 'ENG', 'name' => 'Department of English', 'programme_id' => $ba->id, 'description' => 'English literature, linguistics, and communication.'],
            ['code' => 'ECO', 'name' => 'Department of Economics', 'programme_id' => $ba->id, 'description' => 'Microeconomics, macroeconomics, and econometrics.'],
            ['code' => 'COM', 'name' => 'Department of Commerce', 'programme_id' => $bcom->id, 'description' => 'Accounting, finance, business administration, and taxation.'],
            ['code' => 'MGT', 'name' => 'Department of Management', 'programme_id' => $mba->id, 'description' => 'Business management, leadership, marketing, and operations.'],
            ['code' => 'EDU', 'name' => 'Department of Education', 'programme_id' => $bed->id, 'description' => 'Teacher training, pedagogy, and educational studies.'],
        ];

        foreach ($deptRows as $deptData) {
            Department::updateOrCreate(
                ['code' => $deptData['code']],
                [
                    'name' => $deptData['name'],
                    'description' => $deptData['description'],
                    'programme_id' => $deptData['programme_id'],
                    'status' => 'active',
                ]
            );
        }

        // Batches for general degree programmes
        foreach ([
            [$ba, 'BA-2026', 'Bachelor of Arts — 2026 Cohort'],
            [$bsc, 'BSC-2026', 'Bachelor of Science — 2026 Cohort'],
            [$bcom, 'BCOM-2026', 'Bachelor of Commerce — 2026 Cohort'],
            [$bed, 'BED-2026', 'Bachelor of Education (B.Ed.) — 2026 Cohort'],
            [$ma, 'MA-2026', 'Master of Arts — 2026 Cohort'],
            [$msc, 'MSC-2026', 'Master of Science — 2026 Cohort'],
            [$mcom, 'MCOM-2026', 'Master of Commerce — 2026 Cohort'],
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
