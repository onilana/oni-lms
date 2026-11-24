<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('student_profiles', function (Blueprint $table) {
            $table->date('date_of_birth')->nullable()->after('admission_date');
            $table->string('gender', 50)->nullable()->after('date_of_birth');
            $table->string('class_roll_no', 100)->nullable()->after('gender');
            $table->string('phone', 50)->nullable()->after('class_roll_no');
            $table->string('father_name', 255)->nullable()->after('phone');
            $table->string('mother_name', 255)->nullable()->after('father_name');
            $table->text('address')->nullable()->after('mother_name');
        });
    }

    public function down(): void
    {
        Schema::table('student_profiles', function (Blueprint $table) {
            $table->dropColumn([
                'date_of_birth',
                'gender',
                'class_roll_no',
                'phone',
                'father_name',
                'mother_name',
                'address',
            ]);
        });
    }
};
