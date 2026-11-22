<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('live_sessions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('course_id')->constrained('courses')->cascadeOnDelete();
            $table->foreignUuid('academic_session_id')->nullable()->constrained('academic_sessions')->nullOnDelete();
            $table->foreignUuid('instructor_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUuid('attendance_session_id')->nullable()->constrained('attendance_sessions')->nullOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('provider', 32)->default('jitsi'); // jitsi, zoom, google_meet, teams, custom
            $table->text('meeting_url');
            $table->string('meeting_id')->nullable();
            $table->string('passcode')->nullable();
            $table->dateTime('scheduled_start_at');
            $table->dateTime('scheduled_end_at');
            $table->dateTime('actual_started_at')->nullable();
            $table->dateTime('actual_ended_at')->nullable();
            $table->string('status', 24)->default('scheduled'); // scheduled, live, completed, cancelled
            $table->text('recording_url')->nullable();
            $table->json('settings')->nullable();
            $table->timestamps();

            $table->index(['course_id', 'status']);
            $table->index(['scheduled_start_at', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('live_sessions');
    }
};
