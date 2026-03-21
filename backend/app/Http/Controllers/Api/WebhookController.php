<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Transaction;
use App\Models\User;
use App\Models\VirtualAccount;
use App\Models\Wallet;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class WebhookController extends Controller
{
    /**
     * SprintPay wallet top-up webhook.
     *
     * Security: requires SPRINTPAY_WEBHOOK_SECRET to match one of:
     * - X-Auth-Token
     * - X-Webhook-Secret
     * - Authorization: Bearer <secret>
     *
     * Without a configured secret, the endpoint returns 503 and never credits wallets.
     */
    public function sprintpay(Request $request): JsonResponse
    {
        if (! $this->webhookSecretConfigured()) {
            return response()->json(['error' => 'Webhook not configured'], 503);
        }

        if (! $this->validWebhookSecret($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $body = $request->all();
        if ($request->header('Content-Type') && str_contains((string) $request->header('Content-Type'), 'form')) {
            $body = $request->except([]);
        }
        $payload = $body['payload'] ?? $body['data'] ?? $body;
        $amount = (float) ($payload['amount'] ?? $payload['amount_paid'] ?? $payload['total'] ?? $body['amount'] ?? 0);
        $email = trim((string) ($payload['email'] ?? $payload['customer_email'] ?? $body['email'] ?? ''));
        $orderId = trim((string) ($payload['order_id'] ?? $payload['ref'] ?? $payload['reference'] ?? $body['order_id'] ?? ''));
        $sessionId = trim((string) ($payload['session_id'] ?? $body['session_id'] ?? ''));
        $accountNo = trim((string) ($payload['account_no'] ?? $body['account_no'] ?? ''));
        $reference = $orderId ?: $sessionId ?: $accountNo ?: '';

        if ($amount <= 0 || ! is_finite($amount)) {
            return response()->json(['error' => 'Invalid amount'], 400);
        }
        if ($reference === '') {
            return response()->json(['error' => 'Missing payment reference (order_id, session_id, or account_no)'], 400);
        }
        if (! $email && ! $accountNo) {
            return response()->json(['error' => 'Missing email or account_no'], 400);
        }

        $lockKey = 'webhook:sprintpay:'.hash('sha256', $reference);

        return Cache::lock($lockKey, 30)->block(10, function () use ($amount, $email, $accountNo, $reference) {
            return DB::transaction(function () use ($amount, $email, $accountNo, $reference) {
                if (Transaction::where('reference', $reference)->lockForUpdate()->exists()) {
                    return response()->json(['message' => 'Already processed'], 200);
                }

                $userId = null;
                if ($email !== '') {
                    $user = User::where('email', $email)->first();
                    $userId = $user?->id;
                }
                if (! $userId && $accountNo !== '') {
                    $va = VirtualAccount::where('account_no', $accountNo)->first();
                    $userId = $va?->user_id;
                }
                if (! $userId) {
                    return response()->json(['error' => 'User not found.'], 404);
                }

                $wallet = Wallet::firstOrCreate(
                    ['user_id' => $userId],
                    ['currency' => 'NGN']
                );
                $wallet = Wallet::whereKey($wallet->id)->lockForUpdate()->firstOrFail();

                $newBalance = (float) $wallet->balance + $amount;
                $wallet->update(['balance' => $newBalance]);

                Transaction::create([
                    'user_id' => $userId,
                    'amount' => $amount,
                    'type' => 'credit',
                    'description' => 'Wallet top-up via SprintPay',
                    'reference' => $reference,
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Credited ₦'.number_format($amount),
                    'new_balance' => $newBalance,
                    'wallet' => [
                        'user_id' => $userId,
                        'balance' => $newBalance,
                        'currency' => $wallet->currency,
                    ],
                ], 200);
            });
        });
    }

    private function webhookSecretConfigured(): bool
    {
        $secret = config('services.sprintpay.webhook_secret');

        return is_string($secret) && $secret !== '';
    }

    private function validWebhookSecret(Request $request): bool
    {
        $expected = config('services.sprintpay.webhook_secret');
        if (! is_string($expected) || $expected === '') {
            return false;
        }

        $provided = $request->header('X-Auth-Token')
            ?? $request->header('X-Webhook-Secret')
            ?? $request->header('X-SprintPay-Token');

        $auth = $request->header('Authorization');
        if ($provided === null && is_string($auth) && str_starts_with($auth, 'Bearer ')) {
            $provided = trim(substr($auth, 7));
        }

        if (! is_string($provided) || $provided === '') {
            return false;
        }

        return hash_equals($expected, trim($provided));
    }
}
