<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\VirtualAccount;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class VirtualAccountController extends Controller
{
    public function generate(Request $request): JsonResponse
    {
        $user = $request->user();
        $email = $user->email;
        if (!$email) {
            return response()->json(['success' => false, 'error' => 'User email is required.', 'message' => 'User email is required.'], 400);
        }
        $existing = VirtualAccount::where('user_id', $user->id)->first();
        if ($existing) {
            return response()->json([
                'success' => true,
                'account_no' => $existing->account_no,
                'account_name' => $existing->account_name,
                'bank_name' => $existing->bank_name,
                'amount' => (float) ($request->input('amount', 0)),
                'existing' => true,
            ]);
        }
        $accountName = $request->input('account_name') ?: $user->name ?: explode('@', $email)[0];
        $phone = preg_replace('/\D/', '', (string) $request->input('phone', ''));
        if (strlen($accountName) < 2) {
            return response()->json(['success' => false, 'error' => 'Full name is required.', 'message' => 'Full name is required.'], 400);
        }
        if (strlen($phone) < 10 || strlen($phone) > 15) {
            return response()->json(['success' => false, 'error' => 'Valid phone number is required (10–15 digits).', 'message' => 'Valid phone number is required (10–15 digits).'], 400);
        }
        $apiKey = config('services.sprintpay.key');
        $apiSecret = config('services.sprintpay.secret');

        // Development stub: when SprintPay is not configured but app is in debug mode, create a fake VA for testing
        if ((empty($apiKey) || empty($apiSecret)) && config('app.debug')) {
            $fakeAccountNo = 'DEV' . str_pad((string) $user->id, 10, '0');
            VirtualAccount::updateOrCreate(
                ['user_id' => $user->id],
                [
                    'email' => $email,
                    'account_no' => $fakeAccountNo,
                    'account_name' => $accountName,
                    'bank_name' => 'SprintPay (Dev)',
                    'phone' => $phone ?: null,
                ]
            );
            return response()->json([
                'success' => true,
                'account_no' => $fakeAccountNo,
                'account_name' => $accountName,
                'bank_name' => 'SprintPay (Dev)',
                'amount' => (float) ($request->input('amount', 0)),
                'existing' => false,
            ]);
        }

        if (empty($apiKey) || empty($apiSecret)) {
            return response()->json([
                'success' => false,
                'error' => 'SprintPay API not configured. Set SPRINTPAY_API_KEY and SPRINTPAY_SECRET in backend .env.',
                'message' => 'SprintPay API not configured. Set SPRINTPAY_API_KEY and SPRINTPAY_SECRET in backend .env.',
            ], 503);
        }
        $res = Http::withHeaders([
            'Content-Type' => 'application/json',
            'api-key' => $apiKey,
            'Authorization' => 'Bearer ' . $apiSecret,
        ])->post('https://web.sprintpay.online/api/generate-virtual-account', [
            'email' => $email,
            'account_name' => $accountName,
            'key' => $apiKey,
        ]);
        $data = $res->json();
        $status = $data['status'] ?? $data['data']['status'] ?? null;
        $errMsg = $data['message'] ?? $data['error'] ?? 'Failed to generate account';
        if (!$res->successful() || $status === false) {
            return response()->json(['success' => false, 'error' => $errMsg, 'message' => $errMsg], 400);
        }
        $accountNumber = $data['data']['account_number'] ?? $data['account_number'] ?? null;
        $accountNameRes = $data['data']['account_name'] ?? $data['account_name'] ?? $accountName;
        $bankName = $data['data']['bank_name'] ?? $data['bank_name'] ?? 'SprintPay';
        if (!$accountNumber) {
            return response()->json(['success' => false, 'error' => 'Invalid response from payment provider.', 'message' => 'Invalid response from payment provider.'], 502);
        }
        VirtualAccount::updateOrCreate(
            ['user_id' => $user->id],
            [
                'email' => $email,
                'account_no' => $accountNumber,
                'account_name' => $accountNameRes,
                'bank_name' => $bankName,
                'phone' => $phone ?: null,
            ]
        );
        return response()->json([
            'success' => true,
            'account_no' => $accountNumber,
            'account_name' => $accountNameRes,
            'bank_name' => $bankName,
            'amount' => (float) ($request->input('amount', 0)),
            'existing' => false,
        ]);
    }
}
