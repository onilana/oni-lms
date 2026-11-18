<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'application' => 'ONI LMS API',
        'message' => 'Use the versioned API under /api/v1.',
    ]);
});
