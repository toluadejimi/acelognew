<?php
/**
 * SprintPay webhook proxy for Namecheap (or any PHP hosting).
 * Receives POST with JSON body from SprintPay and forwards to Supabase as query params.
 *
 * Upload this file to your hosting (e.g. public_html/sprintpay-webhook-proxy.php).
 * In SprintPay, set webhook URL to: https://yourdomain.com/sprintpay-webhook-proxy.php
 *
 * Optional: set SUPABASE_WEBHOOK_URL in .htaccess or edit the constant below.
 */
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$SUPABASE_WEBHOOK_URL = getenv('SUPABASE_WEBHOOK_URL') ?: 'https://psqamfhkxigzoviebcmu.supabase.co/functions/v1/sprintpay-webhook';

$raw = file_get_contents('php://input');
$body = json_decode($raw, true) ?: [];
$payload = $body['payload'] ?? $body['data'] ?? $body;

$amount    = $payload['amount'] ?? $body['amount'] ?? '';
$email     = $payload['email'] ?? $body['email'] ?? '';
$order_id  = $payload['order_id'] ?? $body['order_id'] ?? '';
$session_id = $payload['session_id'] ?? $body['session_id'] ?? '';
$account_no = $payload['account_no'] ?? $body['account_no'] ?? '';

$params = array_filter([
    'amount'     => $amount !== '' && $amount !== null ? (string) $amount : null,
    'email'      => $email ?: null,
    'order_id'   => $order_id ?: null,
    'session_id' => $session_id ?: null,
    'account_no' => $account_no ?: null,
]);

$query = http_build_query($params);
$url = $SUPABASE_WEBHOOK_URL . '?' . $query;

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 15,
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
]);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

http_response_code($httpCode ?: 500);
echo $response ?: json_encode(['error' => 'No response from Supabase']);