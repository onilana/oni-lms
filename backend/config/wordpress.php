<?php

return [
    'url' => env('WORDPRESS_URL', 'https://www.yourcollege.edu'),
    'api_base' => env('WORDPRESS_API_BASE', 'https://www.yourcollege.edu/wp-json'),
    'theme_slug' => env('WORDPRESS_THEME_SLUG', 'oni_lana'),
    'webhook_secret' => env('WORDPRESS_WEBHOOK_SECRET'),
    'sso_client_id' => env('WORDPRESS_OIDC_CLIENT_ID', 'oni_lms_client'),
    'sso_client_secret' => env('WORDPRESS_OIDC_CLIENT_SECRET'),
    'auto_sync_notices' => env('WORDPRESS_AUTO_SYNC_NOTICES', true),
];
