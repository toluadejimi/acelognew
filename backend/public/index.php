<?php

use Illuminate\Foundation\Application;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

// Prevent memory exhaustion when admin loads large datasets (profiles, orders, etc.)
if (function_exists('ini_set')) {
    @ini_set('memory_limit', '256M');
}

// Determine if the application is in maintenance mode...
if (file_exists($maintenance = __DIR__.'/../storage/framework/maintenance.php')) {
    require $maintenance;
}

// Register the Composer autoloader...
// Support both standard Laravel layout (public/../vendor)
// and shared-hosting layout where Laravel lives in a "backend" subfolder.
$autoload = __DIR__.'/../vendor/autoload.php';
if (! file_exists($autoload) && file_exists(__DIR__.'/backend/vendor/autoload.php')) {
    $autoload = __DIR__.'/backend/vendor/autoload.php';
}
require $autoload;

// Bootstrap Laravel and handle the request...
/** @var Application $app */
$bootstrap = __DIR__.'/../bootstrap/app.php';
if (! file_exists($bootstrap) && file_exists(__DIR__.'/backend/bootstrap/app.php')) {
    $bootstrap = __DIR__.'/backend/bootstrap/app.php';
}
$app = require_once $bootstrap;

$app->handleRequest(Request::capture());
