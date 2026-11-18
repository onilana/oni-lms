<?php

return [
    'default' => env('CACHE_STORE', 'redis'),
    'stores' => [
        'array' => ['driver' => 'array', 'serialize' => false],
        'redis' => ['driver' => 'redis', 'connection' => 'default', 'lock_connection' => 'default'],
    ],
    'prefix' => env('CACHE_PREFIX', 'oni_lms_cache'),
];
