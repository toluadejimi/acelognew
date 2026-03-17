<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Transaction;
use App\Models\Wallet;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WalletController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $wallet = $request->user()->wallet;
        if (!$wallet) {
            $wallet = Wallet::create(['user_id' => $request->user()->id]);
        }
        // Always read latest balance from DB (avoid stale relation/cache)
        $wallet->refresh();
        return response()->json([
            'balance' => (float) $wallet->balance,
            'currency' => $wallet->currency ?? 'NGN',
        ]);
    }

    public function adminIndex(): JsonResponse
    {
        $wallets = Wallet::with('user')->orderByDesc('created_at')->limit(5000)->get();
        return response()->json($wallets->map(fn (Wallet $w) => [
            'id' => $w->id,
            'user_id' => (string) $w->user_id,
            'balance' => (float) $w->balance,
            'currency' => $w->currency,
        ]));
    }

    public function credit(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'user_id' => ['required', 'exists:users,id'],
            'amount' => ['required', 'numeric'],
            'description' => ['nullable', 'string'],
        ]);
        $amount = (float) $validated['amount'];
        $wallet = Wallet::firstOrCreate(
            ['user_id' => $validated['user_id']],
            ['currency' => 'NGN']
        );
        if ($amount >= 0) {
            $wallet->increment('balance', $amount);
            $type = 'credit';
        } else {
            if ((float) $wallet->balance + $amount < 0) {
                return response()->json(['message' => 'Insufficient balance for debit.'], 400);
            }
            $wallet->decrement('balance', abs($amount));
            $type = 'debit';
        }
        Transaction::create([
            'user_id' => $validated['user_id'],
            'amount' => abs($amount),
            'type' => $type,
            'description' => $validated['description'] ?? 'Admin ' . $type,
        ]);
        return response()->json($wallet->fresh());
    }
}
