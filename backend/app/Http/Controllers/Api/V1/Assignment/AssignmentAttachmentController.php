<?php

namespace App\Http\Controllers\Api\V1\Assignment;

use App\Http\Requests\Assignment\UploadAssignmentAttachmentRequest;
use App\Models\Assignment;
use App\Models\AssignmentSubmission;
use App\Models\AssignmentSubmissionUpload;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AssignmentAttachmentController
{
    public function store(UploadAssignmentAttachmentRequest $request, Assignment $assignment): JsonResponse
    {
        $user = $request->user();
        $file = $request->file('file');
        $directory = "assignment-submissions/{$assignment->id}/{$user->id}";
        $reference = (string) Str::uuid();
        $extension = strtolower($file->guessExtension() ?: 'bin');
        if (! preg_match('/\A[a-z0-9]{1,10}\z/', $extension)) {
            $extension = 'bin';
        }

        $storagePath = $file->storeAs($directory, $reference.'.'.$extension, 'local');
        $originalName = $this->safeOriginalName($file->getClientOriginalName());

        try {
            $upload = AssignmentSubmissionUpload::create([
                'assignment_id' => $assignment->id,
                'user_id' => $user->id,
                'storage_path' => $storagePath,
                'original_name' => $originalName,
            ]);
        } catch (\Throwable $exception) {
            Storage::disk('local')->delete($storagePath);
            throw $exception;
        }

        return response()->json([
            'message' => 'Attachment uploaded successfully.',
            'attachment_reference' => $upload->id,
            'attachment_path' => $upload->id,
            'attachment_name' => $upload->original_name,
        ], 201);
    }

    public function download(Request $request, AssignmentSubmission $submission): StreamedResponse|JsonResponse
    {
        $user = $request->user();
        $submission->loadMissing('assignment');

        if (
            $submission->user_id !== $user->id
            && ! $submission->assignment->canBeGradedBy($user)
        ) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        if (! $submission->attachment_path) {
            abort(404);
        }

        $upload = AssignmentSubmissionUpload::query()
            ->where('assignment_id', $submission->assignment_id)
            ->where('user_id', $submission->user_id)
            ->where('storage_path', $submission->attachment_path)
            ->first();

        if (! $upload || ! Storage::disk('local')->exists($upload->storage_path)) {
            abort(404);
        }

        return Storage::disk('local')->download(
            $upload->storage_path,
            $upload->original_name,
            [
                'Content-Type' => 'application/octet-stream',
                'X-Content-Type-Options' => 'nosniff',
            ]
        );
    }

    private function safeOriginalName(string $originalName): string
    {
        $name = basename(str_replace('\\', '/', $originalName));
        $name = preg_replace('/[\x00-\x1F\x7F]/u', '', $name) ?? '';
        $name = trim(mb_substr($name, 0, 255));

        return $name === '' ? 'attachment' : $name;
    }
}
