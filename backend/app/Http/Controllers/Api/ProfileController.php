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

    public function adminIndex(Request $request): JsonResponse
    {
        // Paginate to avoid loading 40k+ rows (memory/timeout → 500). One page per request.
        $perPage = min(100, max(1, (int) $request->input('per_page', 50)));
        $page = max(1, (int) $request->input('page', 1));
        $search = $request->input('search', '');
        $q = is_string($search) ? trim($search) : '';

        $query = Profile::with(['user', 'user.wallet'])
            ->leftJoin('users', 'profiles.user_id', '=', 'users.id')
            ->leftJoin('wallets', 'users.id', '=', 'wallets.user_id')
            ->orderByRaw('COALESCE(wallets.balance, 0) DESC')
            ->select('profiles.*');

        if ($q !== '') {
            $query->where(function ($builder) use ($q) {
                $builder->where('profiles.username', 'like', '%' . $q . '%')
                    ->orWhere('profiles.user_id', 'like', '%' . $q . '%')
                    ->orWhereHas('user', function ($userQuery) use ($q) {
                        $userQuery->where('users.email', 'like', '%' . $q . '%');
                    });
            });
        }

        $paginator = $query->paginate($perPage, ['*'], 'page', $page);

        $profiles = $paginator->getCollection()->map(fn (Profile $p) => [
            'id' => $p->id,
            'user_id' => (string) $p->user_id,
            'username' => $p->username,
            'email' => $p->user?->email,
            'avatar_url' => $p->avatar_url,
            'is_blocked' => $p->is_blocked,
            'created_at' => $p->created_at?->toIso8601String(),
            'balance' => (float) ($p->user?->wallet?->balance ?? 0),
        ])->values()->all();

        return response()->json([
            'profiles' => $profiles,
            'total' => $paginator->total(),
            'current_page' => $paginator->currentPage(),
            'last_page' => $paginator->lastPage(),
            'per_page' => $paginator->perPage(),
        ]);
    }

    public function toggleBlock(Profile $profile): JsonResponse
    {
        $profile->update(['is_blocked' => !$profile->is_blocked]);
        return response()->json($profile->fresh());
    }
}
