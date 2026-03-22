<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Transaction;
use App\Models\Wallet;
use App\Services\SprintPayVtuService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * User VTU / bills — wallet debited here; SprintPay debits partner ledger & fulfils via VTpass.
 */
class VtuController extends Controller
{
    public function __construct(
        protected SprintPayVtuService $sprintPay
    ) {}

    /**
     * Proxy: SprintPay GET /get-data — list data networks / services (no purchase).
     */
    public function catalogDataNetworks(Request $request): JsonResponse
    {
        $path = (string) config('services.sprintpay.vtu_catalog_paths.data_networks', 'get-data');
        $out = $this->sprintPay->catalogGet($path, []);
        if (isset($out['_error'])) {
            return $this->vtuErrorResponse($out);
        }

        return response()->json(['success' => true, 'catalog' => $out]);
    }

    /**
     * Proxy: SprintPay GET /get-data-variations?network=mtn — bundles for one network (no purchase).
     */
    public function catalogDataVariations(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'network' => ['required', 'string', 'max:40'],
        ]);
        $path = (string) config('services.sprintpay.vtu_catalog_paths.data_variations', 'get-data-variations');
        $out = $this->sprintPay->catalogGet($path, [
            'network' => strtolower($validated['network']),
        ]);
        if (isset($out['_error'])) {
            return $this->vtuErrorResponse($out);
        }

        return response()->json(['success' => true, 'catalog' => $out]);
    }

    public function airtime(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'network' => ['required', 'string', 'in:mtn,airtel,glo,9mobile,MTN,AIRTEL,GLO,9MOBILE'],
            'phone' => ['required', 'string', 'min:10', 'max:15'],
            'amount' => ['required', 'numeric', 'min:50'],
        ]);
        $amount = round((float) $validated['amount'], 2);
        $network = strtoupper($validated['network']);
        $phone = preg_replace('/\D/', '', $validated['phone']);

        $path = (string) config('services.sprintpay.vtu_paths.airtime', 'bill/airtime');
        $payload = array_merge([
            'network' => $network,
            'phone' => $phone,
            'amount' => $amount,
            'reference' => 'AIR-'.Str::uuid()->toString(),
        ], (array) config('services.sprintpay.vtu_payload_extra.airtime', []));

        return $this->executeVend($request, $amount, "Airtime {$network} ₦{$amount} → {$phone}", $path, $payload);
    }

    public function data(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'network' => ['required', 'string', 'in:mtn,airtel,glo,9mobile,MTN,AIRTEL,GLO,9MOBILE'],
            'phone' => ['required', 'string', 'min:10', 'max:15'],
            'amount' => ['required', 'numeric', 'min:50'],
            'plan_code' => ['nullable', 'string', 'max:120'],
            'variation_code' => ['nullable', 'string', 'max:120'],
            'service_id' => ['nullable', 'string', 'max:160'],
        ]);
        $amount = round((float) $validated['amount'], 2);
        $network = strtoupper($validated['network']);
        $phone = preg_replace('/\D/', '', $validated['phone']);

        $path = (string) config('services.sprintpay.vtu_paths.data', 'bill/data');
        $payload = array_merge([
            'network' => $network,
            'phone' => $phone,
            'amount' => $amount,
            'reference' => 'DAT-'.Str::uuid()->toString(),
        ], (array) config('services.sprintpay.vtu_payload_extra.data', []));
        if (! empty($validated['service_id'])) {
            $payload['service_id'] = $validated['service_id'];
        }
        if (! empty($validated['variation_code'])) {
            $payload['variation_code'] = $validated['variation_code'];
        }
        if (! empty($validated['plan_code'])) {
            $payload['plan_code'] = $validated['plan_code'];
        } elseif (! empty($validated['variation_code'])) {
            // Many gateways accept plan_code as alias for VTpass variation_code
            $payload['plan_code'] = $validated['variation_code'];
        }

        return $this->executeVend($request, $amount, "Data {$network} ₦{$amount} → {$phone}", $path, $payload);
    }

    public function validateCable(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'provider' => ['required', 'string', 'in:dstv,gotv,startimes,DSTV,GOTV,STARTIMES'],
            'smartcard_number' => ['required', 'string', 'min:8', 'max:20'],
        ]);
        $path = (string) config('services.sprintpay.vtu_paths.cable_validate', 'bill/cable/validate');
        $query = [
            'provider' => strtoupper($validated['provider']),
            'smartcard_number' => $validated['smartcard_number'],
        ];

        $out = $this->sprintPay->get($path, $query);
        if (isset($out['_error'])) {
            return $this->vtuErrorResponse($out);
        }

        return response()->json(['success' => true, 'data' => $out]);
    }

    public function buyCable(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'provider' => ['required', 'string', 'in:dstv,gotv,startimes,DSTV,GOTV,STARTIMES'],
            'smartcard_number' => ['required', 'string', 'min:8', 'max:20'],
            'product_code' => ['required', 'string', 'max:120'],
            'amount' => ['required', 'numeric', 'min:100'],
        ]);
        $amount = round((float) $validated['amount'], 2);
        $path = (string) config('services.sprintpay.vtu_paths.cable_buy', 'bill/cable/pay');
        $payload = array_merge([
            'provider' => strtoupper($validated['provider']),
            'smartcard_number' => $validated['smartcard_number'],
            'product_code' => $validated['product_code'],
            'amount' => $amount,
            'reference' => 'CBL-'.Str::uuid()->toString(),
        ], (array) config('services.sprintpay.vtu_payload_extra.cable', []));

        return $this->executeVend(
            $request,
            $amount,
            'Cable TV '.strtoupper($validated['provider']).' ₦'.$amount,
            $path,
            $payload
        );
    }

    public function validateElectricity(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'disco' => ['required', 'string', 'max:40'],
            'meter_type' => ['required', 'string', 'in:prepaid,postpaid,PREPAID,POSTPAID'],
            'meter_number' => ['required', 'string', 'min:6', 'max:20'],
        ]);
        $path = (string) config('services.sprintpay.vtu_paths.electricity_validate', 'bill/electricity/validate');
        $query = [
            'disco' => $validated['disco'],
            'meter_type' => strtolower($validated['meter_type']),
            'meter_number' => $validated['meter_number'],
        ];

        $out = $this->sprintPay->get($path, $query);
        if (isset($out['_error'])) {
            return $this->vtuErrorResponse($out);
        }

        return response()->json(['success' => true, 'data' => $out]);
    }

    public function buyElectricity(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'disco' => ['required', 'string', 'max:40'],
            'meter_type' => ['required', 'string', 'in:prepaid,postpaid,PREPAID,POSTPAID'],
            'meter_number' => ['required', 'string', 'min:6', 'max:20'],
            'amount' => ['required', 'numeric', 'min:100'],
        ]);
        $amount = round((float) $validated['amount'], 2);
        $path = (string) config('services.sprintpay.vtu_paths.electricity_buy', 'bill/electricity/pay');
        $payload = array_merge([
            'disco' => $validated['disco'],
            'meter_type' => strtolower($validated['meter_type']),
            'meter_number' => $validated['meter_number'],
            'amount' => $amount,
            'reference' => 'ELC-'.Str::uuid()->toString(),
        ], (array) config('services.sprintpay.vtu_payload_extra.electricity', []));

        return $this->executeVend(
            $request,
            $amount,
            'Electricity '.$validated['disco'].' ₦'.$amount.' ('.$validated['meter_number'].')',
            $path,
            $payload
        );
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    protected function executeVend(Request $request, float $amount, string $description, string $path, array $payload): JsonResponse
    {
        $user = $request->user();
        $wallet = $user->wallet;
        if (! $wallet) {
            $wallet = Wallet::create(['user_id' => $user->id]);
        }
        if ((float) $wallet->balance < $amount) {
            return response()->json([
                'success' => false,
                'message' => 'Insufficient wallet balance. Add funds first.',
                'new_balance' => (float) $wallet->balance,
            ], 422);
        }

        $upstream = $this->sprintPay->post($path, $payload);
        if (isset($upstream['_error'])) {
            return $this->vtuErrorResponse($upstream);
        }

        if (! $this->vendLooksSuccessful($upstream)) {
            return response()->json([
                'success' => false,
                'message' => (string) ($upstream['message'] ?? $upstream['error'] ?? 'VTU request was not successful.'),
                'provider' => $upstream,
                'new_balance' => (float) $wallet->balance,
            ], 422);
        }

        return DB::transaction(function () use ($user, $wallet, $amount, $description, $upstream, $payload) {
            $wallet->decrement('balance', $amount);
            $ref = $payload['reference'] ?? Str::uuid()->toString();
            Transaction::create([
                'user_id' => $user->id,
                'amount' => -$amount,
                'currency' => 'NGN',
                'type' => 'debit',
                'description' => $description,
                'reference' => $ref,
            ]);
            $newBalance = (float) $wallet->fresh()->balance;

            return response()->json([
                'success' => true,
                'message' => (string) ($upstream['message'] ?? 'Purchase successful.'),
                'new_balance' => $newBalance,
                'provider' => $upstream,
            ]);
        });
    }

    /**
     * @param  array<string, mixed>  $out
     */
    protected function vtuErrorResponse(array $out): JsonResponse
    {
        if (($out['_error'] ?? '') === 'not_configured') {
            return response()->json([
                'success' => false,
                'code' => 'vtu_not_configured',
                'message' => $out['_message'] ?? 'VTU is not configured. Set SPRINTPAY_VTU_ENABLED=true and paths in .env, or use SPRINTPAY_VTU_MOCK=true for UI testing.',
            ], 503);
        }

        return response()->json([
            'success' => false,
            'code' => 'vtu_upstream_error',
            'message' => 'SprintPay returned an error. Check logs and API paths.',
            'details' => $out,
        ], 502);
    }

    /**
     * @param  array<string, mixed>  $upstream
     */
    protected function vendLooksSuccessful(array $upstream): bool
    {
        if ($this->sprintPay->isMock()) {
            return true;
        }
        if (isset($upstream['success']) && $upstream['success'] === true) {
            return true;
        }
        if (isset($upstream['status']) && in_array(strtolower((string) $upstream['status']), ['success', 'successful', 'ok', '1'], true)) {
            return true;
        }
        if (isset($upstream['code']) && (string) $upstream['code'] === '0') {
            return true;
        }

        return false;
    }
}
