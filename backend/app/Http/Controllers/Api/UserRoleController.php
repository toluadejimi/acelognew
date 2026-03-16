<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\UserRole;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserRoleController extends Controller
{
    public function index(): JsonResponse
    {
        $roles = UserRole::with('user')->orderByDesc('created_at')->limit(5000)->get();
        return response()->json($roles->map(fn (UserRole $r) => [
            'id' => $r->id,
            'user_id' => (string) $r->user_id,
            'role' => $r->role,
            'created_at' => $r->created_at?->toIso8601String(),
        ]));
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'user_id' => ['required', 'exists:users,id'],
            'role' => ['required', 'in:admin,moderator,user'],
        ]);
        $role = UserRole::create($validated);
        return response()->json($role, 201);
    }

    public function destroy(UserRole $userRole): JsonResponse
    {
        $userRole->delete();
        return response()->json(null, 204);
    }
}
