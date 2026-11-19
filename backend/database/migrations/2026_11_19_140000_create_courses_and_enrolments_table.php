<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Courses table
        Schema::create('courses', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('department_id')->constrained('departments')->cascadeOnDelete();
            $table->foreignUuid('programme_id')->nullable()->constrained('programmes')->nullOnDelete();
            $table->string('code');
            $table->string('title');
            $table->text('description')->nullable();
            $table->unsignedSmallInteger('credits')->default(3);
            $table->string('level')->default('Undergraduate');
            $table->unsignedSmallInteger('semester_number')->nullable();
            $table->string('status')->default('draft'); // draft, published, archived
            $table->text('syllabus')->nullable();
            $table->foreignUuid('created_by_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['department_id', 'code']);
        });

        // 2. Course Instructor Assignments
        Schema::create('course_instructors', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('course_id')->constrained('courses')->cascadeOnDelete();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUuid('academic_session_id')->nullable()->constrained('academic_sessions')->nullOnDelete();
            $table->string('role')->default('lead'); // lead, assistant, tutor
            $table->timestamps();

            $table->unique(['course_id', 'user_id', 'academic_session_id']);
        });

        // 3. Course Enrolments
        Schema::create('course_enrolments', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('course_id')->constrained('courses')->cascadeOnDelete();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUuid('academic_session_id')->constrained('academic_sessions')->cascadeOnDelete();
            $table->foreignUuid('semester_id')->nullable()->constrained('semesters')->nullOnDelete();
            $table->string('status')->default('enrolled'); // enrolled, completed, dropped, suspended
            $table->timestamp('enrolled_at')->useCurrent();
            $table->timestamp('completed_at')->nullable();
            $table->string('final_grade')->nullable();
            $table->timestamps();

            $table->unique(['course_id', 'user_id', 'academic_session_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('course_enrolments');
        Schema::dropIfExists('course_instructors');
        Schema::dropIfExists('courses');
    }
};
