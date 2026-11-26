<?php

use App\Services\AuditService;
use App\Services\BackupService;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('backup:database', function (BackupService $backupService): int {
    try {
        $backup = $backupService->createBackup();
        $pruned = $backupService->pruneOldBackups();
        AuditService::log(
            action: 'system.backup_created',
            auditableType: 'SystemBackup',
            newValues: ['filename' => $backup['filename'], 'size' => $backup['size_bytes'], 'pruned' => $pruned, 'scheduled' => true]
        );
        $this->info("Backup created: {$backup['filename']} ({$backup['size_bytes']} bytes), pruned {$pruned} expired archive(s).");

        return 0;
    } catch (\Throwable $e) {
        AuditService::log(
            action: 'system.backup_failed',
            auditableType: 'SystemBackup',
            newValues: ['error' => $e->getMessage(), 'scheduled' => true]
        );
        $this->error('Backup failed: ' . $e->getMessage());

        return 1;
    }
})->purpose('Create a verified database backup snapshot');

Schedule::command('backup:database')->dailyAt('02:00')->timezone('UTC');
