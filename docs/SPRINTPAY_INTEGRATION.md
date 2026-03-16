# SprintPay Integration Guide

This document describes how to integrate **SprintPay** in another project for:

1. **Pay any amount (redirect flow)** – User enters an amount, is redirected to SprintPay to pay, then returns to your app.
2. **Virtual account** – Generate a dedicated bank account number per user for bank transfers; when they pay to that account, you get notified via webhook and credit their balance.

Base URL: `https://web.sprintpay.online`

---

## Prerequisites

- **API Key** and **Secret** from SprintPay (dashboard or support).
- A **webhook URL** on your server that SprintPay can POST to when a payment succeeds (used for both redirect and virtual-account payments).
- HTTPS for your webhook in production.

---

## 1. Pay Any Amount (Redirect Flow)

User chooses an amount → you redirect them to SprintPay’s hosted page → they pay → SprintPay redirects back to your app and calls your webhook to confirm payment.

### 1.1 Redirect URL

Build this URL and send the user there (e.g. `window.location.href = payUrl`):

```
GET https://web.sprintpay.online/pay?amount={amount}&key={apiKey}&ref={reference}&email={email}
```

| Query param | Required | Description |
|-------------|----------|-------------|
| `amount`   | Yes | Amount in NGN (number, no decimals or with decimals). |
| `key`      | Yes | Your SprintPay API key. |
| `ref`      | Yes | Unique reference for this payment (e.g. `sp-{userId}-{timestamp}`). Used to avoid double-crediting. |
| `email`    | Yes | Payer’s email (used by webhook to find the user and credit wallet). |

**Example (frontend):**

```javascript
const amount = 5000; // NGN
const apiKey = import.meta.env.VITE_SPRINTPAY_API_KEY; // or from your backend
const ref = `sp-${userId}-${Date.now()}`;
const email = encodeURIComponent(userEmail);
const payUrl = `https://web.sprintpay.online/pay?amount=${amount}&key=${apiKey}&ref=${ref}&email=${email}`;
window.location.href = payUrl;
```

**Security note:** If the key is only on the backend, your backend should expose an endpoint that returns the redirect URL (or a one-time link) instead of putting the API key in the frontend.

### 1.2 Return URL (after payment)

SprintPay redirects the user back to your app. Typical pattern:

- **Success:** e.g. `https://yourapp.com/dashboard?ref=...&payment=success`
- **Cancel/fail:** e.g. `https://yourapp.com/dashboard?payment=cancelled` (confirm exact params with SprintPay)

On your dashboard/frontend, on load:

1. Read `ref` and `payment` from the query string.
2. If `payment === 'success'` and `ref` is present:
   - Optionally call your backend to refresh wallet/balance (webhook may have already credited the user).
   - Show a success message and clear the query params (e.g. `history.replaceState` so the user doesn’t resubmit on refresh).

**Example (frontend):**

```javascript
const params = new URLSearchParams(window.location.search);
const ref = params.get("ref");
const payment = params.get("payment");
if (ref && payment === "success") {
  window.history.replaceState({}, "", "/dashboard");
  // Refresh wallet balance and show success
  const walletRes = await api("/wallet");
  setBalance(walletRes.balance);
  setShowPaymentSuccess(true);
}
```

### 1.3 Webhook (crediting the user)

SprintPay will send a POST request to your **webhook URL** when the payment succeeds. You must:

1. Accept POST (JSON or form).
2. Read amount, email, and reference (ref/order_id/session_id).
3. Idempotency: if a transaction with that reference already exists, return 200 and do nothing.
4. Find the user (e.g. by email), credit their wallet, create a transaction record.
5. Return 200 with a success payload.

See **Section 3 (Webhook)** below for a single webhook that handles both redirect and virtual-account payments.

---

## 2. Virtual Account Flow

Each user gets a **unique bank account number**. They transfer money to that account; when SprintPay detects the payment, they call your webhook with `account_no` and amount; you find the user by `account_no` and credit them.

### 2.1 Generate virtual account (backend)

Call SprintPay to create (or retrieve) a virtual account for the user.

**Endpoint:** `POST https://web.sprintpay.online/api/generate-virtual-account`

**Headers:**

| Header           | Value                    |
|------------------|--------------------------|
| `Content-Type`   | `application/json`       |
| `api-key`        | Your SprintPay API key   |
| `Authorization`  | `Bearer {your_secret}`   |

**Body (JSON):**

| Field         | Required | Description                    |
|---------------|----------|--------------------------------|
| `email`       | Yes      | User’s email                  |
| `account_name`| Yes      | Name to show on the account   |
| `key`         | Yes      | Same as API key (for reference)|

**Example request (e.g. Laravel/PHP):**

```php
$res = Http::withHeaders([
    'Content-Type' => 'application/json',
    'api-key' => $apiKey,
    'Authorization' => 'Bearer ' . $apiSecret,
])->post('https://web.sprintpay.online/api/generate-virtual-account', [
    'email' => $user->email,
    'account_name' => $accountName, // e.g. user full name
    'key' => $apiKey,
]);
$data = $res->json();
```

**Example response (success):**

```json
{
  "status": true,
  "data": {
    "account_number": "9012345678",
    "account_name": "John Doe",
    "bank_name": "SprintPay"
  }
}
```

(or the same fields at top level: `account_number`, `account_name`, `bank_name`)

**Your backend should:**

1. Store the virtual account per user (e.g. `virtual_accounts` table: `user_id`, `account_no`, `account_name`, `bank_name`) so you can return it again without calling SprintPay every time.
2. If the user already has a virtual account in your DB, return that instead of calling the API again.
3. Return to the client: `account_no`, `account_name`, `bank_name` (and optionally `amount` they intend to pay).

**Example backend logic (pseudo):**

```text
1. If user already has a row in virtual_accounts → return that row (account_no, account_name, bank_name).
2. Else call SprintPay POST /api/generate-virtual-account with email, account_name, key.
3. On success: save to virtual_accounts, return account_no, account_name, bank_name.
4. On failure: return 400/502 with message from SprintPay or "Invalid response from payment provider".
```

### 2.2 Show details to the user

On the frontend, show:

- Bank name  
- Account name  
- Account number (with a “Copy” button)  
- Optional: “Transfer the amount above to this account; your wallet will be credited automatically.”

No redirect: the user pays via their bank app or USSD; SprintPay notifies you via webhook.

### 2.3 Webhook (virtual account payment)

When someone pays to the virtual account, SprintPay sends the same webhook with (among other fields) `account_no` and amount. You:

1. Look up `virtual_accounts` by `account_no` to get `user_id`.
2. Credit that user’s wallet and create a transaction (and enforce idempotency by reference/transaction id if provided).

See **Section 3** for a unified webhook example.

---

## 3. Webhook (Shared for Redirect + Virtual Account)

SprintPay calls **one** webhook URL for both flows. Your handler should accept POST and support both:

- **Redirect flow:** payload usually has `email`, `ref` / `order_id` / `session_id`, `amount`.
- **Virtual account flow:** payload has `account_no`, `amount` (and possibly same reference fields).

### 3.1 Suggested payload mapping

Read from body (and optionally query if SprintPay sends duplicate data as query params):

| Your use          | Possible payload keys                          |
|-------------------|-------------------------------------------------|
| Amount            | `payload.amount`, `payload.amount_paid`, `payload.total`, `body.amount` |
| Email             | `payload.email`, `payload.customer_email`, `body.email` |
| Reference         | `payload.order_id`, `payload.ref`, `payload.reference`, `body.order_id`, `payload.session_id`, `body.session_id` |
| Virtual account   | `payload.account_no`, `body.account_no`        |

### 3.2 Idempotency

- If you already have a transaction with that `reference` (or matching rule from SprintPay), return `200` with e.g. `{ "message": "Already processed" }` and do not credit again.
- Optionally treat “same amount + same user in last N minutes” as duplicate if no reference is sent (document SprintPay’s behaviour for your case).

### 3.3 Resolving the user

- If `email` is present: find user by email.
- If no user found and `account_no` is present: find `virtual_accounts` by `account_no` and take `user_id`.
- If still no user: return 404 and do not credit.

### 3.4 Crediting

- Get or create wallet for `user_id`.
- Add amount to balance.
- Insert a transaction row (user_id, amount, type=credit, description, reference).
- Return 200 with e.g. `{ "success": true, "message": "Credited ₦...", "new_balance": ... }`.

### 3.5 Example webhook (PHP-style logic)

```php
// 1. Parse body (and optionally query)
$body = $request->all();
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

// 2. Idempotency
if ($reference && Transaction::where('reference', $reference)->exists()) {
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

// 3. Credit wallet
$wallet = Wallet::firstOrCreate(['user_id' => $userId], ['currency' => 'NGN']);
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
```

---

## 4. Environment Variables

**Backend (.env):**

```env
# SprintPay – used for virtual account generation and (optionally) redirect key
SPRINTPAY_API_KEY=your_api_key
SPRINTPAY_SECRET=your_secret
```

**Frontend (if redirect link is built on client):**

```env
# Only if you build the pay URL in the frontend (not recommended for production)
VITE_SPRINTPAY_API_KEY=your_api_key
```

Prefer building the redirect URL on the backend and returning a link or redirect to the client.

---

## 5. Database (Virtual Account)

Minimal table for storing one virtual account per user:

```sql
CREATE TABLE virtual_accounts (
    id CHAR(36) PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL,
    account_no VARCHAR(64) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    bank_name VARCHAR(128) NOT NULL,
    phone VARCHAR(32) NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

---

## 6. Checklist

**Redirect (pay any amount):**

- [ ] Build redirect URL: `https://web.sprintpay.online/pay?amount=...&key=...&ref=...&email=...`
- [ ] Send user to that URL; handle return (e.g. `?payment=success&ref=...`).
- [ ] Expose a webhook endpoint; in SprintPay dashboard set webhook URL to it.
- [ ] Webhook: parse amount, email, ref → idempotency → find user by email → credit wallet → return 200.

**Virtual account:**

- [ ] Backend: store SprintPay API key and secret; implement “get or create” virtual account (DB + call to SprintPay).
- [ ] Call `POST https://web.sprintpay.online/api/generate-virtual-account` with headers and body above.
- [ ] Save and return `account_no`, `account_name`, `bank_name` to the client.
- [ ] Same webhook: on `account_no` in payload, resolve user from `virtual_accounts`, then credit and return 200.

**Security:**

- [ ] Do not log or expose API secret; use it only in backend and webhook.
- [ ] Validate webhook (e.g. signature or IP) if SprintPay provides it.
- [ ] Use HTTPS for the webhook URL in production.

---

## 7. Quick reference

| Flow              | User action        | Your backend / frontend                    | SprintPay                      |
|-------------------|--------------------|---------------------------------------------|--------------------------------|
| Pay any amount    | Clicks “Pay”       | Redirect to `/pay?amount&key&ref&email`     | Hosted page → redirect back + webhook |
| Virtual account   | Transfers to VA    | Show account number from your API           | Webhook with `account_no` + amount |

| Endpoint / URL    | Method | Purpose                                  |
|-------------------|--------|------------------------------------------|
| `/pay`            | GET    | Redirect user to pay (query params)      |
| `/api/generate-virtual-account` | POST | Create virtual account (headers: api-key, Authorization) |
| Your webhook URL  | POST   | Receive payment notification (redirect + VA) |

This should be enough to implement both “any amount” (redirect) and “virtual account” in another project. Adjust field names and URLs if SprintPay provides an updated API spec.
