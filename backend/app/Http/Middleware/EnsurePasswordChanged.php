<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePasswordChanged
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && (bool) $user->must_change_password) {
            if (! $request->is('api/v1/auth/me', 'api/v1/auth/change-password', 'api/v1/auth/logout')) {
                return response()->json([
                    'message' => 'Password change required before accessing this resource.',
                    'must_change_password' => true,
                ], 403);
            }
        }

        return $next($request);
    }
}
