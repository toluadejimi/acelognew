<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

/**
 * Server-side calls toward SprintPay bill/VTU APIs.
 * Fulfilment is SprintPay → VTpass; this app never calls VTpass directly.
 *
 * Configure paths to match SprintPay’s current Readme (names vary by product).
 * @see docs/VTU_SPRINTPAY.md
 */
class SprintPayVtuService
{
    public function configured(): bool
    {
        return $this->webkey() !== '' && $this->authToken() !== '';
    }

    public function isMock(): bool
    {
        return (bool) config('services.sprintpay.vtu_mock', false);
    }

    public function isEnabled(): bool
    {
        return (bool) config('services.sprintpay.vtu_enabled', false);
    }

    /**
     * POST JSON to SprintPay API (relative path, e.g. /partner/vtu/airtime).
     *
     * @return array<string, mixed>
     */
    public function post(string $path, array $payload): array
    {
        if ($this->isMock()) {
            return $this->mockPost($path, $payload);
        }

        if (! $this->isEnabled()) {
            return ['_error' => 'not_configured', '_message' => 'SPRINTPAY_VTU_ENABLED is false or SprintPay token missing.'];
        }

        $token = $this->authToken();
        if ($token === null || $token === '') {
            return ['_error' => 'not_configured', '_message' => 'Set SPRINTPAY_API_TOKEN (or SPRINTPAY_API_KEY) for VTU calls.'];
        }

        $base = rtrim((string) config('services.sprintpay.base_url'), '/');
        $url = $base.'/'.ltrim($path, '/');

        $payload = $this->attachWebkeyToBody($payload);

        $response = Http::timeout((int) config('services.sprintpay.vtu_timeout', 90))
            ->withHeaders([
                'Accept' => 'application/json',
                'Content-Type' => 'application/json',
            ])
            ->withToken((string) $token)
            ->post($url, $payload);

        if (! $response->successful()) {
            return [
                '_error' => 'upstream',
                '_status' => $response->status(),
                '_body' => $response->json() ?? $response->body(),
            ];
        }

        return $response->json() ?? [];
    }

    /**
     * GET (e.g. validate meter / smartcard).
     *
     * @return array<string, mixed>
     */
    public function get(string $path, array $query = []): array
    {
        if ($this->isMock()) {
            return $this->mockGet($path, $query);
        }

        if (! $this->isEnabled()) {
            return ['_error' => 'not_configured', '_message' => 'SPRINTPAY_VTU_ENABLED is false or SprintPay token missing.'];
        }

        $token = $this->authToken();
        if ($token === null || $token === '') {
            return ['_error' => 'not_configured', '_message' => 'Set SPRINTPAY_API_TOKEN (or SPRINTPAY_API_KEY) for VTU calls.'];
        }

        $base = rtrim((string) config('services.sprintpay.base_url'), '/');
        $url = $base.'/'.ltrim($path, '/');

        $query = $this->attachWebkeyToQuery($query);

        $response = Http::timeout((int) config('services.sprintpay.vtu_timeout', 90))
            ->withHeaders(['Accept' => 'application/json'])
            ->withToken((string) $token)
            ->get($url, $query);

        if (! $response->successful()) {
            return [
                '_error' => 'upstream',
                '_status' => $response->status(),
                '_body' => $response->json() ?? $response->body(),
            ];
        }

        return $response->json() ?? [];
    }

    /**
     * GET catalog/listing endpoints (e.g. get-data, get-data-variations) — no purchase.
     * Uses merchant `key` query param when set; adds Bearer token if configured (SprintPay may require either or both).
     *
     * @return array<string, mixed>
     */
    public function catalogGet(string $path, array $query = []): array
    {
        if ($this->isMock()) {
            return $this->mockCatalogGet($path, $query);
        }

        if (! (bool) config('services.sprintpay.vtu_catalog_enabled', true)) {
            return ['_error' => 'not_configured', '_message' => 'VTU catalog is disabled (SPRINTPAY_VTU_CATALOG_ENABLED).'];
        }

        $token = $this->authToken();
        $merchantKey = $this->webkey();
        if (($merchantKey === null || $merchantKey === '') && ($token === null || $token === '')) {
            return ['_error' => 'not_configured', '_message' => 'Set SPRINTPAY_API_KEY (public key) and/or SPRINTPAY_API_TOKEN for catalog GET requests.'];
        }

        $base = rtrim((string) config('services.sprintpay.base_url'), '/');
        $url = $base.'/'.ltrim($path, '/');

        $q = $this->attachWebkeyToQuery($query);

        $http = Http::timeout((int) config('services.sprintpay.vtu_timeout', 90))
            ->withHeaders(['Accept' => 'application/json']);

        if ($token !== null && $token !== '') {
            $http = $http->withToken((string) $token);
        }

        $response = $http->get($url, $q);

        if (! $response->successful()) {
            return [
                '_error' => 'upstream',
                '_status' => $response->status(),
                '_body' => $response->json() ?? $response->body(),
            ];
        }

        return $response->json() ?? [];
    }

    /**
     * SprintPay responses can be inconsistent across products; normalize success checks.
     *
     * @param  array<string, mixed>  $body
     */
    public function responseIndicatesSuccess(array $body): bool
    {
        if ($this->isMock()) {
            return true;
        }
        if (($body['success'] ?? null) === true) {
            return true;
        }
        $status = strtolower((string) ($body['status'] ?? ''));
        if (in_array($status, ['success', 'successful', 'ok', '1', 'true'], true)) {
            return true;
        }
        if ((string) ($body['code'] ?? '') === '0') {
            return true;
        }

        return false;
    }

    /**
     * @param  array<string, mixed>  $body
     */
    public function extractMessage(array $body, string $fallback = 'Request failed'): string
    {
        $msg = $body['message'] ?? $body['error'] ?? $body['msg'] ?? $fallback;

        return is_string($msg) && $msg !== '' ? $msg : $fallback;
    }

    /**
     * @return array<string, mixed>
     */
    protected function mockCatalogGet(string $path, array $query): array
    {
        $p = strtolower($path);
        $isVariations = str_contains($p, 'variation') || str_contains($p, 'get-data-variations');

        if ($isVariations) {
            $net = strtolower((string) ($query['network'] ?? 'mtn'));

            return [
                'success' => true,
                'data' => [
                    ['name' => '100MB (1 day) — mock', 'variation_code' => 'mock-'.$net.'-100mb', 'variation_amount' => '100'],
                    ['name' => '1GB (7 days) — mock', 'variation_code' => 'mock-'.$net.'-1gb', 'variation_amount' => '500'],
                    ['name' => '5GB (30 days) — mock', 'variation_code' => 'mock-'.$net.'-5gb', 'variation_amount' => '2500'],
                ],
            ];
        }

        return [
            'success' => true,
            'data' => [
                ['name' => 'MTN Data', 'service_id' => 'mtn-data', 'network' => 'mtn'],
                ['name' => 'Airtel Data', 'service_id' => 'airtel-data', 'network' => 'airtel'],
                ['name' => 'Glo Data', 'service_id' => 'glo-data', 'network' => 'glo'],
                ['name' => '9mobile Data', 'service_id' => '9mobile-data', 'network' => '9mobile'],
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    protected function mockPost(string $path, array $payload): array
    {
        $ref = 'MOCK-'.Str::upper(Str::random(10));

        return [
            'success' => true,
            'status' => 'success',
            'message' => 'Mock VTU success (SPRINTPAY_VTU_MOCK=true). No call to SprintPay.',
            'reference' => $ref,
            'data' => array_merge(['mock' => true, 'path' => $path], $payload),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    protected function mockGet(string $path, array $query): array
    {
        return [
            'success' => true,
            'status' => 'success',
            'customer_name' => 'MOCK CUSTOMER',
            'address' => 'Mock address, Lagos',
            'data' => array_merge(['mock' => true, 'path' => $path], $query),
        ];
    }

    private function authToken(): string
    {
        return (string) (config('services.sprintpay.token') ?? '');
    }

    private function webkey(): string
    {
        return (string) (config('services.sprintpay.webkey') ?? config('services.sprintpay.key') ?? '');
    }

    /**
     * @param  array<string, mixed>  $query
     * @return array<string, mixed>
     */
    private function attachWebkeyToQuery(array $query): array
    {
        $key = $this->webkey();
        if ($key !== '' && ! isset($query['key'])) {
            $query['key'] = $key;
        }

        return $query;
    }

    /**
     * @param  array<string, mixed>  $body
     * @return array<string, mixed>
     */
    private function attachWebkeyToBody(array $body): array
    {
        $key = $this->webkey();
        if ($key !== '' && ! isset($body['key'])) {
            $body['key'] = $key;
        }

        return $body;
    }
}
