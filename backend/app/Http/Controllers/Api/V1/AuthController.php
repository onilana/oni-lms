<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Requests\Auth\ChangePasswordRequest;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\UpdateProfileRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController
{
    public function login(LoginRequest $request): JsonResponse
    {
        $credentials = $request->validated();

        $user = User::with(['roles.permissions'])
            ->where('email', strtolower(trim($credentials['email'])))
            ->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => [__('auth.failed')],
            ]);
        }

        if ($user->status !== 'active') {
            return response()->json([
                'message' => 'Your account is currently '.$user->status.'. Please contact the administrator.',
            ], 403);
        }

        $deviceName = $credentials['device_name'] ?? 'web-client';
        $token = $user->createToken($deviceName)->plainTextToken;

        if ($request->hasSession()) {
            Auth::guard('web')->login($user);
            $request->session()->regenerate();
        }

        $user->forceFill(['last_login_at' => now()])->save();

        return response()->json([
            'token' => $token,
            'token_type' => 'Bearer',
            'must_change_password' => (bool) $user->must_change_password,
            'user' => new UserResource($user),
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load(['roles.permissions']);

        return response()->json([
            'user' => new UserResource($user),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $accessToken = $request->user()?->currentAccessToken();
        if ($accessToken && method_exists($accessToken, 'delete')) {
            $accessToken->delete();
        }

        if ($request->hasSession()) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return response()->json([
            'message' => 'Successfully logged out.',
        ]);
    }

    public function changePassword(ChangePasswordRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $user = $request->user();

        if (! Hash::check($validated['current_password'], $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['The provided current password does not match our records.'],
            ]);
        }

        $user->forceFill([
            'password' => Hash::make($validated['new_password']),
            'must_change_password' => false,
        ])->save();

        return response()->json([
            'message' => 'Password updated successfully.',
        ]);
    }

    public function updateProfile(UpdateProfileRequest $request): JsonResponse
    {
        $user = $request->user();
        $user->update($request->validated());
        $user->load(['roles.permissions']);

        return response()->json([
            'message' => 'Profile updated successfully.',
            'user' => new UserResource($user),
        ]);
    }
}
