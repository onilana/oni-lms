<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            RoleAndPermissionSeeder::class,
            AcademicSeeder::class,
            CourseSeeder::class,
            LessonSeeder::class,
            AssignmentSeeder::class,
            ExamSeeder::class,
            AttendanceSeeder::class,
            CertificateSeeder::class,
        ]);
    }
}
