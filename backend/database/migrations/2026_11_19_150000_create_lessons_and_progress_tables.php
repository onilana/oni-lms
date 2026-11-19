<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Course Sections (Modules / Units)
        Schema::create('course_sections', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('course_id')->constrained('courses')->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->unsignedInteger('order_index')->default(0);
            $table->string('status')->default('published'); // draft, published
            $table->timestamps();
        });

        // 2. Lessons
        Schema::create('lessons', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('course_id')->constrained('courses')->cascadeOnDelete();
            $table->foreignUuid('section_id')->constrained('course_sections')->cascadeOnDelete();
            $table->string('title');
            $table->string('type')->default('text'); // text, video, pdf, embed
            $table->longText('content')->nullable(); // markdown / rich content
            $table->string('video_url')->nullable(); // external stream, embed, or storage key
            $table->unsignedInteger('video_duration_seconds')->nullable();
            $table->string('attachment_path')->nullable();
            $table->string('attachment_name')->nullable();
            $table->unsignedInteger('order_index')->default(0);
            $table->boolean('is_free_preview')->default(false);
            $table->string('status')->default('published'); // draft, published
            $table->timestamps();
        });

        // 3. Student Lesson Progress
        Schema::create('lesson_progress', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('course_id')->constrained('courses')->cascadeOnDelete();
            $table->foreignUuid('lesson_id')->constrained('lessons')->cascadeOnDelete();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->boolean('is_completed')->default(false);
            $table->timestamp('completed_at')->nullable();
            $table->unsignedInteger('last_position_seconds')->default(0);
            $table->timestamps();

            $table->unique(['lesson_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lesson_progress');
        Schema::dropIfExists('lessons');
        Schema::dropIfExists('course_sections');
    }
};
