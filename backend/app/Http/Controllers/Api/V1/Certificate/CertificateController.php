<?php

namespace App\Http\Controllers\Api\V1\Certificate;

use App\Http\Resources\CertificateResource;
use App\Models\Certificate;
use App\Models\Course;
use App\Models\Role;
use App\Models\User;
use App\Services\CertificateService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class CertificateController
{
    public function verify(string $code): JsonResponse
    {
        $certificate = Certificate::with(['user', 'course'])
            ->where('certificate_code', strtoupper(trim($code)))
            ->first();

        if (!$certificate) {
            return response()->json([
                'valid' => false,
                'message' => 'Certificate code not found or invalid.',
            ], 404);
        }

        return response()->json([
            'valid' => !$certificate->is_revoked,
            'certificate_code' => $certificate->certificate_code,
            'title' => $certificate->title,
            'student_name' => $certificate->user?->name ?? 'Verified Student',
            'course_title' => $certificate->course?->title ?? 'Accredited Course',
            'course_code' => $certificate->course?->code ?? 'N/A',
            'credits' => $certificate->course?->credits,
            'issued_at' => $certificate->issued_at?->toDateString(),
            'grade' => $certificate->grade,
            'final_score' => $certificate->final_score !== null ? (float) $certificate->final_score : null,
            'institution_name' => $certificate->metadata['institution_name'] ?? 'Edu Care Institute and Higher Education',
            'is_revoked' => (bool) $certificate->is_revoked,
            'revoked_at' => $certificate->revoked_at?->toDateString(),
            'revocation_reason' => $certificate->is_revoked ? $certificate->revocation_reason : null,
        ]);
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Certificate::with(['course', 'user', 'issuedBy', 'revokedBy'])->orderBy('created_at', 'desc');

        if ($request->filled('course_id')) {
            $query->where('course_id', $request->query('course_id'));
        }

        if ($request->filled('search')) {
            $term = $request->query('search');
            $query->where(function ($q) use ($term) {
                $q->where('certificate_code', 'like', "%{$term}%")
                    ->orWhere('title', 'like', "%{$term}%")
                    ->orWhereHas('user', function ($uq) use ($term) {
                        $uq->where('name', 'like', "%{$term}%")->orWhere('email', 'like', "%{$term}%");
                    });
            });
        }

        return CertificateResource::collection($query->paginate(25));
    }

    public function myCertificates(Request $request): AnonymousResourceCollection
    {
        $certificates = Certificate::with(['course', 'user', 'issuedBy'])
            ->where('user_id', $request->user()->id)
            ->orderBy('issued_at', 'desc')
            ->get();

        return CertificateResource::collection($certificates);
    }

    public function eligibility(Request $request, Course $course, CertificateService $service): JsonResponse
    {
        $user = $request->user();

        // If teacher or admin, can inspect a student's eligibility via student_id query param
        $student = $user;
        if ($request->has('student_id') && ($user->hasRole([Role::TEACHER, Role::DEPT_ADMIN, Role::COLLEGE_ADMIN, Role::SUPER_ADMIN]))) {
            $student = User::findOrFail($request->input('student_id'));
        }

        $result = $service->checkEligibility($course, $student);

        return response()->json([
            'data' => $result,
        ]);
    }

    public function claim(Request $request, Course $course, CertificateService $service): JsonResponse
    {
        $user = $request->user();
        $certificate = $service->issueCertificate($course, $user);

        return response()->json([
            'message' => 'Certificate awarded and verified successfully!',
            'data' => new CertificateResource($certificate->load(['course', 'user', 'issuedBy'])),
        ], 201);
    }

    public function issue(Request $request, CertificateService $service): JsonResponse
    {
        $user = $request->user();
        if (!$user->hasRole([Role::TEACHER, Role::DEPT_ADMIN, Role::COLLEGE_ADMIN, Role::SUPER_ADMIN])) {
            return response()->json(['message' => 'Unauthorized to issue certificates.'], 403);
        }

        $validated = $request->validate([
            'student_id' => 'required|uuid|exists:users,id',
            'course_id' => 'required|uuid|exists:courses,id',
            'force' => 'boolean',
            'custom_meta' => 'array',
        ]);

        $course = Course::findOrFail($validated['course_id']);
        $student = User::findOrFail($validated['student_id']);

        $certificate = $service->issueCertificate(
            $course,
            $student,
            $user,
            $validated['custom_meta'] ?? [],
            $validated['force'] ?? false
        );

        return response()->json([
            'message' => 'Certificate issued successfully.',
            'data' => new CertificateResource($certificate->load(['course', 'user', 'issuedBy'])),
        ], 201);
    }

    public function show(Request $request, Certificate $certificate): JsonResponse
    {
        $user = $request->user();
        if ($certificate->user_id !== $user->id && !$user->hasRole([Role::TEACHER, Role::DEPT_ADMIN, Role::COLLEGE_ADMIN, Role::SUPER_ADMIN])) {
            return response()->json(['message' => 'Unauthorized to view this certificate.'], 403);
        }

        return response()->json([
            'data' => new CertificateResource($certificate->load(['course', 'user', 'issuedBy'])),
        ]);
    }

    public function revoke(Request $request, Certificate $certificate): JsonResponse
    {
        $user = $request->user();
        if (!$user->hasRole([Role::COLLEGE_ADMIN, Role::SUPER_ADMIN])) {
            return response()->json(['message' => 'Only administrators can revoke certificates.'], 403);
        }

        $validated = $request->validate([
            'reason' => 'required|string|min:5|max:1000',
        ]);

        $certificate->revoke($user, $validated['reason']);

        return response()->json([
            'message' => 'Certificate revoked successfully.',
            'data' => new CertificateResource($certificate->load(['course', 'user', 'issuedBy', 'revokedBy'])),
        ]);
    }

    public function update(Request $request, Certificate $certificate): JsonResponse
    {
        $user = $request->user();
        if (!$user->hasRole([Role::COLLEGE_ADMIN, Role::SUPER_ADMIN])) {
            return response()->json(['message' => 'Only administrators can edit certificate records.'], 403);
        }

        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'grade' => 'sometimes|nullable|string|max:32',
            'final_score' => 'sometimes|nullable|numeric|between:0,100',
            'attendance_percentage' => 'sometimes|nullable|numeric|between:0,100',
            'is_revoked' => 'sometimes|boolean',
            'revocation_reason' => 'sometimes|nullable|string|max:1000',
        ]);

        if (isset($validated['is_revoked']) && !$validated['is_revoked'] && $certificate->is_revoked) {
            $validated['revoked_at'] = null;
            $validated['revoked_by_id'] = null;
            $validated['revocation_reason'] = null;
        }

        $certificate->update($validated);

        return response()->json([
            'message' => 'Certificate updated successfully.',
            'data' => new CertificateResource($certificate->load(['course', 'user', 'issuedBy', 'revokedBy'])),
        ]);
    }
}
