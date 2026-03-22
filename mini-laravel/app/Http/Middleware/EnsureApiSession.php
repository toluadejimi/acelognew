<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureApiSession
{
    /**
     * Require a stored API token (after login through this app’s /api proxy).
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (! session()->has('api_token')) {
            return redirect()->route('auth');
        }

        return $next($request);
    }
}
