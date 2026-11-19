<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendance_sessions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('course_id')->constrained('courses')->cascadeOnDelete();
            $table->foreignUuid('academic_session_id')->nullable()->constrained('academic_sessions')->nullOnDelete();
            $table->foreignUuid('instructor_id')->constrained('users')->cascadeOnDelete();
            $table->date('session_date');
            $table->string('start_time')->nullable();
            $table->string('end_time')->nullable();
            $table->string('topic')->nullable();
            $table->string('room')->nullable();
            $table->string('status')->default('completed'); // scheduled, completed, cancelled
            $table->timestamps();
        });

        Schema::create('attendance_records', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('attendance_session_id')->constrained('attendance_sessions')->cascadeOnDelete();
            $table->foreignUuid('student_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('status')->default('present'); // present, absent, late, excused
            $table->string('remarks')->nullable();
            $table->foreignUuid('marked_by_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['attendance_session_id', 'student_user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance_records');
        Schema::dropIfExists('attendance_sessions');
    }
};
