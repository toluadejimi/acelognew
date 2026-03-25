<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Profile;
use App\Models\User;
use App\Models\UserRole;
use App\Models\Wallet;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password as PasswordRule;

class AdminUserController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', PasswordRule::defaults()],
            'username' => ['nullable', 'string', 'max:255'],
        ]);

        $user = DB::transaction(function () use ($validated) {
            $user = User::create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'password' => Hash::make($validated['password']),
            ]);
            Profile::create([
                'user_id' => $user->id,
                'username' => $validated['username'] ?? $validated['name'],
            ]);
            Wallet::create(['user_id' => $user->id, 'currency' => 'NGN']);
            UserRole::firstOrCreate(['user_id' => $user->id, 'role' => 'user']);

            return $user;
        });

        return response()->json(['id' => (string) $user->id], 201);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'string', 'email', 'max:255', 'unique:users,email,'.$user->id],
            'password' => ['nullable', 'string', PasswordRule::defaults()],
            'username' => ['nullable', 'string', 'max:255'],
        ]);

        DB::transaction(function () use ($validated, $user) {
            $payload = [];
            if (array_key_exists('name', $validated)) {
                $payload['name'] = $validated['name'];
            }
            if (array_key_exists('email', $validated)) {
                $payload['email'] = $validated['email'];
            }
            if (! empty($validated['password'])) {
                $payload['password'] = Hash::make($validated['password']);
            }
            if ($payload !== []) {
                $user->update($payload);
            }

            if (array_key_exists('username', $validated)) {
                $profile = Profile::firstOrCreate(['user_id' => $user->id]);
                $profile->update(['username' => $validated['username']]);
            }
        });

        return response()->json(['success' => true]);
    }

    public function destroy(User $user): JsonResponse
    {
        $hasHistory = DB::table('orders')->where('user_id', $user->id)->exists()
            || DB::table('transactions')->where('user_id', $user->id)->exists();
        if ($hasHistory) {
            return response()->json([
                'message' => 'This user has orders/transactions and cannot be deleted. Block instead.',
            ], 422);
        }

        DB::transaction(function () use ($user) {
            DB::table('wallet_checks')->where('user_id', $user->id)->delete();
            DB::table('manual_payments')->where('user_id', $user->id)->delete();
            DB::table('virtual_accounts')->where('user_id', $user->id)->delete();
            DB::table('messages')->where('sender_id', $user->id)->orWhere('receiver_id', $user->id)->delete();
            DB::table('user_roles')->where('user_id', $user->id)->delete();
            DB::table('wallets')->where('user_id', $user->id)->delete();
            DB::table('profiles')->where('user_id', $user->id)->delete();
            DB::table('personal_access_tokens')->where('tokenable_id', $user->id)->where('tokenable_type', User::class)->delete();
            $user->delete();
        });

        return response()->json(null, 204);
    }

    public function impersonate(User $user): JsonResponse
    {
        $user->tokens()->delete();
        $token = $user->createToken('spa')->plainTextToken;
        $roles = $user->roles()->pluck('role')->values()->all();

        return response()->json([
            'token' => $token,
            'user' => [
                'id' => (string) $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'roles' => $roles,
            ],
        ]);
    }
}

