<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Profile;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProfileController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $profile = $request->user()->profile;
        if (!$profile) {
            return response()->json(['username' => null, 'avatar_url' => null, 'is_blocked' => false]);
        }
        return response()->json($profile->only(['username', 'avatar_url', 'is_blocked']));
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate(['username' => ['nullable', 'string', 'max:255']]);
        $profile = $request->user()->profile;
        if (!$profile) {
            $profile = Profile::create(['user_id' => $request->user()->id] + $validated);
        } else {
            $profile->update($validated);
        }
        return response()->json($profile->fresh());
    }

    public function adminIndex(): JsonResponse
    {
        // Load all users with wallet so admin list shows correct balance for every user
        $profiles = Profile::with(['user', 'user.wallet'])->orderByDesc('created_at')->get();
        $total = $profiles->count();

        return response()->json([
            'profiles' => $profiles->map(fn (Profile $p) => [
                'id' => $p->id,
                'user_id' => (string) $p->user_id,
                'username' => $p->username,
                'email' => $p->user?->email,
                'avatar_url' => $p->avatar_url,
                'is_blocked' => $p->is_blocked,
                'created_at' => $p->created_at?->toIso8601String(),
                'balance' => (float) ($p->user?->wallet?->balance ?? 0),
            ])->values()->all(),
            'total' => $total,
        ]);
    }

    public function toggleBlock(Profile $profile): JsonResponse
    {
        $profile->update(['is_blocked' => !$profile->is_blocked]);
        return response()->json($profile->fresh());
    }
}
