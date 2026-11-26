<?php

namespace App\Http\Controllers\Api\V1;

use App\Services\AuditService;
use App\Services\BackupService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class BackupController
{
    private string $backupDir;

    public function __construct(private readonly BackupService $backupService)
    {
        $this->backupDir = $this->backupService->getBackupDirectory();
    }

    private function authorizeAdmin(Request $request): void
    {
        $user = $request->user();
        if (!$user || !$user->isSuperAdmin()) {
            abort(403, 'Unauthorized. Backup operations require Super Administrator privileges.');
        }
    }

    public function index(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $files = File::files($this->backupDir);
        $backups = [];

        foreach ($files as $file) {
            $backups[] = [
                'filename' => $file->getFilename(),
                'size_bytes' => $file->getSize(),
                'size_human' => round($file->getSize() / 1024 / 1024, 2) . ' MB',
                'created_at' => date('c', $file->getMTime()),
                'sha256' => hash_file('sha256', $file->getRealPath()),
            ];
        }

        // Sort latest first
        usort($backups, fn ($a, $b) => strcmp($b['created_at'], $a['created_at']));

        return response()->json([
            'database_engine' => config('database.default'),
            'backup_directory' => 'storage/app/backups',
            'automated_schedule' => 'Daily at 02:00 AM UTC (Full snapshot + WAL retention)',
            'count' => count($backups),
            'data' => $backups,
        ]);
    }

    public function create(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        try {
            $backup = $this->backupService->createBackup();
        } catch (\Throwable $e) {
            AuditService::log(
                action: 'system.backup_failed',
                user: $request->user(),
                auditableType: 'SystemBackup',
                newValues: ['error' => $e->getMessage()],
                request: $request
            );

            return response()->json([
                'message' => 'Database backup failed: ' . $e->getMessage(),
            ], 500);
        }

        AuditService::log(
            action: 'system.backup_created',
            user: $request->user(),
            auditableType: 'SystemBackup',
            newValues: ['filename' => $backup['filename'], 'size' => $backup['size_bytes']],
            request: $request
        );

        return response()->json([
            'message' => 'Database snapshot created successfully.',
            'backup' => $backup,
        ], 201);
    }

    public function download(string $filename, Request $request): BinaryFileResponse
    {
        $this->authorizeAdmin($request);

        // Prevent path traversal
        $safeFilename = basename($filename);
        $path = $this->backupDir . DIRECTORY_SEPARATOR . $safeFilename;

        if (!File::exists($path)) {
            abort(404, 'Backup archive not found.');
        }

        return response()->download($path, $safeFilename);
    }

    public function verify(string $filename, Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        try {
            $result = $this->backupService->verifyBackup($filename);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 404);
        }

        return response()->json([
            'message' => $result['is_valid'] ? 'Backup integrity verified.' : 'Backup integrity check failed.',
            'verification' => $result,
        ], $result['is_valid'] ? 200 : 422);
    }
}
