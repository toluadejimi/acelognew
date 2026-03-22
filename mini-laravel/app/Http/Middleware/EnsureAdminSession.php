<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Requires api.session + user with admin role (from session api_user, same shape as React AuthContext).
 */
class EnsureAdminSession
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = session('api_user');
        $roles = is_array($user) ? ($user['roles'] ?? []) : [];
        if (! is_array($roles) || ! in_array('admin', $roles, true)) {
            return redirect()->route('dashboard');
        }

        return $next($request);
    }
}
