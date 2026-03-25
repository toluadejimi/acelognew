<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'sprintpay' => [
        // WEBKEY used by SprintPay merchant/vas endpoints as `key` query/body.
        'webkey' => env('WEBKEY', env('SPRINTPAY_API_KEY', env('PALMPAYKEY'))),
        'key' => env('SPRINTPAY_API_KEY', env('WEBKEY', env('PALMPAYKEY'))),
        'secret' => env('SPRINTPAY_SECRET', env('PALSEC')),
        // Shared secret for POST /api/webhooks/sprintpay — must match header from SprintPay (see WebhookController).
        'webhook_secret' => env('SPRINTPAY_WEBHOOK_SECRET'),
        // VTU / bills (SprintPay → VTpass). Server-side only; never expose in the browser.
        'base_url' => rtrim(env('SPRINTPAY_API_BASE', 'https://web.sprintpay.online/api'), '/'),
        // Merchant VAS auth token. Guide default: webhook secret bearer + webkey.
        'token' => env('SPRINTPAY_API_TOKEN', env('SPRINTPAY_WEBHOOK_SECRET', env('SPRINTPAY_API_KEY'))),
        'vtu_enabled' => env('SPRINTPAY_VTU_ENABLED', false),
        'vtu_mock' => env('SPRINTPAY_VTU_MOCK', false),
        'vtu_timeout' => (int) env('SPRINTPAY_VTU_TIMEOUT', 90),
        /*
         * Relative paths appended to base_url. Override to match SprintPay Readme for your account.
         */
        'vtu_paths' => [
            'airtime' => env('SPRINTPAY_VTU_PATH_AIRTIME', 'merchant/vas/buy-ng-airtime'),
            'data' => env('SPRINTPAY_VTU_PATH_DATA', 'merchant/vas/buy-data'),
            'cable_validate' => env('SPRINTPAY_VTU_PATH_CABLE_VALIDATE', 'merchant/vas/validate-cable'),
            'cable_buy' => env('SPRINTPAY_VTU_PATH_CABLE_BUY', 'merchant/vas/buy-cable'),
            'electricity_validate' => env('SPRINTPAY_VTU_PATH_ELECTRICITY_VALIDATE', 'merchant/vas/validate-electricity-meter'),
            'electricity_buy' => env('SPRINTPAY_VTU_PATH_ELECTRICITY_BUY', 'merchant/vas/buy-electricity'),
        ],
        'vtu_payload_extra' => [
            'airtime' => [],
            'data' => [],
            'cable' => [],
            'electricity' => [],
        ],
        /** Public-style catalog (no wallet debit). Proxies SprintPay GET /get-data, /get-data-variations, etc. */
        'vtu_catalog_enabled' => env('SPRINTPAY_VTU_CATALOG_ENABLED', true),
        'vtu_catalog_paths' => [
            'data_networks' => env('SPRINTPAY_CATALOG_PATH_GET_DATA', 'get-data'),
            'data_variations' => env('SPRINTPAY_CATALOG_PATH_GET_DATA_VARIATIONS', 'get-data-variations'),
            'cable_plans' => env('SPRINTPAY_CATALOG_PATH_CABLE_PLANS', 'cable-plan'),
            'electricity_variations' => env('SPRINTPAY_CATALOG_PATH_ELECTRICITY_VARIATIONS', 'get-electricity-variations'),
        ],
    ],

];
