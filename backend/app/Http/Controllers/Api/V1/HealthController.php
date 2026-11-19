<?php

namespace App\Http\Controllers\Api\V1;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;

class HealthController
{
    public function __invoke(): JsonResponse
    {
        $checks = [
            'application' => 'ok',
            'database' => 'unknown',
            'redis' => 'unknown',
        ];

        try {
            DB::select('select 1');
            $checks['database'] = 'ok';
        } catch (\Throwable $exception) {
            $checks['database'] = 'unavailable';
        }

        if (config('cache.default') === 'redis' || config('session.driver') === 'redis' || config('queue.default') === 'redis') {
            try {
                Redis::connection()->ping();
                $checks['redis'] = 'ok';
            } catch (\Throwable $exception) {
                $checks['redis'] = 'unavailable';
            }
        } else {
            $checks['redis'] = 'ok';
        }

        $healthy = ! in_array('unavailable', $checks, true);

        return response()->json([
            'success' => $healthy,
            'service' => 'oni-lms-api',
            'checks' => $checks,
        ], $healthy ? 200 : 503);
    }
}
