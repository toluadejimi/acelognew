<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserIsAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }
        $isAdmin = $user->roles()->where('role', 'admin')->exists();
        if (!$isAdmin) {
            return response()->json(['message' => 'Forbidden. Admin only.'], 403);
        }
        return $next($request);
    }
}
