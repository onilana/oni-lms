<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Departments
        Schema::create('departments', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('code')->unique();
            $table->text('description')->nullable();
            $table->string('status')->default('active');
            $table->foreignUuid('head_of_department_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // 2. Programmes (Degrees/Courses of study)
        Schema::create('programmes', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('department_id')->constrained('departments')->cascadeOnDelete();
            $table->string('name');
            $table->string('code');
            $table->unsignedSmallInteger('duration_years')->default(4);
            $table->unsignedSmallInteger('total_semesters')->default(8);
            $table->string('status')->default('active');
            $table->timestamps();

            $table->unique(['department_id', 'code']);
        });

        // 3. Academic Sessions (e.g. 2026-2027)
        Schema::create('academic_sessions', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('name')->unique();
            $table->date('start_date');
            $table->date('end_date');
            $table->boolean('is_current')->default(false);
            $table->string('status')->default('active');
            $table->timestamps();
        });

        // 4. Semesters within an academic session
        Schema::create('semesters', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('academic_session_id')->constrained('academic_sessions')->cascadeOnDelete();
            $table->string('name');
            $table->unsignedSmallInteger('semester_number');
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->boolean('is_active')->default(false);
            $table->timestamps();

            $table->unique(['academic_session_id', 'semester_number']);
        });

        // 5. Batches (Student cohorts)
        Schema::create('batches', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('programme_id')->constrained('programmes')->cascadeOnDelete();
            $table->foreignUuid('academic_session_id')->constrained('academic_sessions')->cascadeOnDelete();
            $table->string('name');
            $table->string('code');
            $table->unsignedInteger('max_capacity')->nullable();
            $table->string('status')->default('active');
            $table->timestamps();

            $table->unique(['programme_id', 'code']);
        });

        // 6. Teacher Profiles
        Schema::create('teacher_profiles', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->foreignUuid('department_id')->constrained('departments')->cascadeOnDelete();
            $table->string('employee_id_number')->unique();
            $table->string('designation')->default('Lecturer');
            $table->string('qualification')->nullable();
            $table->string('status')->default('active');
            $table->timestamps();
        });

        // 7. Student Profiles
        Schema::create('student_profiles', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->foreignUuid('programme_id')->nullable()->constrained('programmes')->nullOnDelete();
            $table->foreignUuid('batch_id')->nullable()->constrained('batches')->nullOnDelete();
            $table->string('student_id_number')->unique();
            $table->date('admission_date')->nullable();
            $table->unsignedSmallInteger('current_semester')->default(1);
            $table->string('status')->default('enrolled');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_profiles');
        Schema::dropIfExists('teacher_profiles');
        Schema::dropIfExists('batches');
        Schema::dropIfExists('semesters');
        Schema::dropIfExists('academic_sessions');
        Schema::dropIfExists('programmes');
        Schema::dropIfExists('departments');
    }
};
