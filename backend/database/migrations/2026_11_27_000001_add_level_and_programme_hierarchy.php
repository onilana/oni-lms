<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('programmes', function (Blueprint $table): void {
            $table->string('level', 30)->default('ug')->after('department_id');
            $table->uuid('department_id')->nullable()->change();
        });

        Schema::table('departments', function (Blueprint $table): void {
            $table->foreignUuid('programme_id')
                ->nullable()
                ->after('parent_id')
                ->constrained('programmes')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('departments', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('programme_id');
        });

        Schema::table('programmes', function (Blueprint $table): void {
            $table->dropColumn('level');
        });
    }
};
