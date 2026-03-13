<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Transaction;
use App\Models\User;
use App\Models\VirtualAccount;
use App\Models\Wallet;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class WebhookController extends Controller
{
    public function sprintpay(Request $request): JsonResponse
    {
        $body = $request->all();
        if ($request->header('Content-Type') && str_contains($request->header('Content-Type'), 'form')) {
            $body = $request->except([]);
        }
        $payload = $body['payload'] ?? $body['data'] ?? $body;
        $amount = (float) ($payload['amount'] ?? $payload['amount_paid'] ?? $payload['total'] ?? $body['amount'] ?? 0);
        $email = trim((string) ($payload['email'] ?? $payload['customer_email'] ?? $body['email'] ?? ''));
        $orderId = trim((string) ($payload['order_id'] ?? $payload['ref'] ?? $payload['reference'] ?? $body['order_id'] ?? ''));
        $sessionId = trim((string) ($payload['session_id'] ?? $body['session_id'] ?? ''));
        $accountNo = trim((string) ($payload['account_no'] ?? $body['account_no'] ?? ''));
        $reference = $orderId ?: $sessionId ?: $accountNo ?: '';

        if ($amount <= 0 || !is_finite($amount)) {
            return response()->json(['error' => 'Invalid amount'], 400);
        }
        if (!$email && !$accountNo) {
            return response()->json(['error' => 'Missing email or account_no'], 400);
        }

        if ($reference && Transaction::where('reference', $reference)->exists()) {
            return response()->json(['message' => 'Already processed'], 200);
        }
        if (!$reference && Transaction::where('description', 'Wallet top-up via SprintPay')->orderByDesc('created_at')->first()) {
            return response()->json(['message' => 'Already processed'], 200);
        }

        $userId = null;
        if ($email) {
            $user = User::where('email', $email)->first();
            $userId = $user?->id;
        }
        if (!$userId && $accountNo) {
            $va = VirtualAccount::where('account_no', $accountNo)->first();
            $userId = $va?->user_id;
        }
        if (!$userId) {
            return response()->json(['error' => 'User not found.'], 404);
        }

        $wallet = Wallet::firstOrCreate(
            ['user_id' => $userId],
            ['currency' => 'NGN']
        );
        $newBalance = (float) $wallet->balance + $amount;
        $wallet->update(['balance' => $newBalance]);
        Transaction::create([
            'user_id' => $userId,
            'amount' => $amount,
            'type' => 'credit',
            'description' => 'Wallet top-up via SprintPay',
            'reference' => $reference ?: null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Credited ₦' . number_format($amount),
            'new_balance' => $newBalance,
        ], 200);
    }
}
