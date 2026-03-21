<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| React SPA (Vite build in public/)
|--------------------------------------------------------------------------
| After `npm run build`, copy dist/* into backend/public/ (index.html + assets/).
| With VITE_API_URL empty, the browser only calls same-origin /api/... (no separate
| backend host in DevTools). Fallback serves index.html for client-side routes.
|--------------------------------------------------------------------------
*/

Route::get('/', function () {
    $spa = public_path('index.html');
    if (file_exists($spa)) {
        return response()->file($spa);
    }

    return view('welcome');
});

Route::fallback(function () {
    $spa = public_path('index.html');
    if (! file_exists($spa)) {
        abort(404);
    }

    return response()->file($spa);
});
