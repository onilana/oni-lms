<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_conversations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUuid('course_id')->constrained('courses')->cascadeOnDelete();
            $table->string('title')->default('Course Study Session');
            $table->string('status')->default('active'); // active, archived
            $table->unsignedInteger('tokens_used')->default(0);
            $table->timestamps();
        });

        Schema::create('ai_messages', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('conversation_id')->constrained('ai_conversations')->cascadeOnDelete();
            $table->string('role'); // user, assistant, system
            $table->text('content');
            $table->json('citations')->nullable(); // source references e.g. [{"title": "Lecture 1", "reference": "Section 2"}]
            $table->unsignedInteger('tokens_count')->default(0);
            $table->string('model')->default('lms-rag-v1');
            $table->timestamps();
        });

        Schema::create('ai_documents', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('course_id')->constrained('courses')->cascadeOnDelete();
            $table->string('title');
            $table->string('source_type')->default('lesson'); // lesson, upload, syllabus
            $table->string('source_id')->nullable();
            $table->unsignedInteger('total_chunks')->default(0);
            $table->string('status')->default('indexed'); // pending, indexed, failed
            $table->timestamps();
        });

        Schema::create('ai_document_chunks', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('document_id')->constrained('ai_documents')->cascadeOnDelete();
            $table->unsignedInteger('chunk_index')->default(0);
            $table->text('content');
            $table->string('source_reference')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_document_chunks');
        Schema::dropIfExists('ai_documents');
        Schema::dropIfExists('ai_messages');
        Schema::dropIfExists('ai_conversations');
    }
};
