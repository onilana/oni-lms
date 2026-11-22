<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('announcements', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('author_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUuid('course_id')->nullable()->constrained('courses')->cascadeOnDelete();
            $table->foreignUuid('department_id')->nullable()->constrained('departments')->nullOnDelete();
            $table->string('title');
            $table->text('content');
            $table->string('priority', 24)->default('normal'); // low, normal, high, urgent
            $table->boolean('is_pinned')->default(false);
            $table->dateTime('published_at')->useCurrent();
            $table->timestamps();

            $table->index(['course_id', 'is_pinned', 'published_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('announcements');
    }
};
