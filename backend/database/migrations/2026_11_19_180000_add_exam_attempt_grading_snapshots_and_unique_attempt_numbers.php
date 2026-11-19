<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $duplicateGroups = DB::table('exam_attempts')
            ->select('exam_id', 'user_id')
            ->groupBy('exam_id', 'user_id')
            ->havingRaw('COUNT(*) > COUNT(DISTINCT attempt_number)')
            ->get();

        foreach ($duplicateGroups as $group) {
            $attempts = DB::table('exam_attempts')
                ->where('exam_id', $group->exam_id)
                ->where('user_id', $group->user_id)
                ->orderBy('attempt_number')
                ->orderBy('created_at')
                ->get(['id', 'attempt_number']);
            $seen = [];
            $nextNumber = (int) $attempts->max('attempt_number');

            foreach ($attempts as $attempt) {
                if (isset($seen[$attempt->attempt_number])) {
                    $nextNumber++;
                    DB::table('exam_attempts')
                        ->where('id', $attempt->id)
                        ->update(['attempt_number' => $nextNumber]);
                } else {
                    $seen[$attempt->attempt_number] = true;
                }
            }
        }

        Schema::table('exam_attempts', function (Blueprint $table): void {
            $table->json('grading_snapshot')->nullable();
            $table->unique(
                ['exam_id', 'user_id', 'attempt_number'],
                'exam_attempts_exam_user_number_unique'
            );
        });
    }

    public function down(): void
    {
        Schema::table('exam_attempts', function (Blueprint $table): void {
            $table->dropUnique('exam_attempts_exam_user_number_unique');
            $table->dropColumn('grading_snapshot');
        });
    }
};
