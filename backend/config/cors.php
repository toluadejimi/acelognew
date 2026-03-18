<?php

/**
 * CORS: allows the frontend (e.g. http://127.0.0.1:8080) to call this API.
 * Production frontend: https://acelogstores.online (in default origins).
 * Set CORS_ALLOWED_ORIGINS in .env to override or add more origins.
 * On production (e.g. backend.predoz.com), ensure OPTIONS requests reach Laravel
 * (do not block or return 4xx for OPTIONS in nginx/Apache).
 */

return [

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

    'allowed_origins' => array_values(array_filter(array_map('trim', explode(',', env('CORS_ALLOWED_ORIGINS', 'https://acelogstores.online,http://acelogstores.online,http://127.0.0.1:8080,http://localhost:8080,http://localhost:5173,http://127.0.0.1:5173')))) ?: ['https://acelogstores.online', 'http://127.0.0.1:8080', 'http://localhost:8080']),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 600,

    'supports_credentials' => true,

];
