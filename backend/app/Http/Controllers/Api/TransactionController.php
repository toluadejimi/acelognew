<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Transaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TransactionController extends Controller
{
    /** Admin: all transactions */
    public function index(): JsonResponse
    {
        $transactions = Transaction::with('user')->orderByDesc('created_at')->limit(5000)->get();
        return response()->json($transactions->map(fn (Transaction $t) => [
            'id' => $t->id,
            'user_id' => (string) $t->user_id,
            'amount' => (float) $t->amount,
            'currency' => $t->currency,
            'type' => $t->type,
            'description' => $t->description,
            'reference' => $t->reference,
            'created_at' => $t->created_at?->toIso8601String(),
        ]));
    }

    /** Authenticated user: own transactions only */
    public function myIndex(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user) {
            return response()->json([], 401);
        }
        $transactions = Transaction::where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->get();
        return response()->json($transactions->map(fn (Transaction $t) => [
            'id' => $t->id,
            'amount' => (float) $t->amount,
            'currency' => $t->currency,
            'type' => $t->type,
            'description' => $t->description,
            'reference' => $t->reference,
            'created_at' => $t->created_at?->toIso8601String(),
        ]));
    }
}
