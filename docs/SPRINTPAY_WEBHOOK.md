# SprintPay webhook integration (Ace Log backend)

This document describes what **your SprintPay dashboard** (or payment flow) must send to this Laravel app so wallet top-ups are credited **safely**.

The handler is: `App\Http\Controllers\Api\WebhookController::sprintpay`.

---

## 1. Webhook URL (what to register in SprintPay)

Use your public API base URL + path:

```text
POST https://<YOUR_BACKEND_DOMAIN>/api/webhooks/sprintpay
```

Examples:

- `https://backend.predoz.com/api/webhooks/sprintpay`
- If the API is behind a prefix (e.g. `/public`), include that segment exactly as browsers hit it.

**Content-Type:** `application/json` is recommended. The controller also tolerates form-style bodies when `Content-Type` contains `form`.

---

## 2. Authentication (required)

The endpoint **does not** credit wallets unless a shared secret is configured and sent.

### Server-side (`.env` on Laravel)

```env
SPRINTPAY_WEBHOOK_SECRET=<long random string>
```

- Generate a strong secret (e.g. 32+ random bytes, hex or base64).
- After changing `.env`, run: `php artisan config:clear` (and `config:cache` in production if you use it).

### What SprintPay (or your HTTP client) must send

The request must include **the same secret** in **one** of these places (first match wins in code):

| Method | Example |
|--------|---------|
| Header `X-Auth-Token` | `X-Auth-Token: <your-secret>` |
| Header `X-Webhook-Secret` | `X-Webhook-Secret: <your-secret>` |
| Header `Authorization` | `Authorization: Bearer <your-secret>` |
| Header `X-SprintPay-Token` | `X-SprintPay-Token: <your-secret>` |

Use **timing-safe** comparison on the server (already implemented via `hash_equals`).

If `SPRINTPAY_WEBHOOK_SECRET` is **missing** or empty, the API responds with **503** and **never** credits a wallet.

If the secret is **wrong**, the API responds with **401**.

---

## 3. JSON body: fields we read

The controller normalizes the body like this:

```text
payload = body.payload  OR  body.data  OR  body (root)
```

Amount and identifiers are taken from `payload` first, then from the root `body` where noted.

### Required logic

| Requirement | Details |
|-------------|---------|
| **Amount** | Must be `> 0`. Read from (in order): `payload.amount`, `payload.amount_paid`, `payload.total`, `amount` (root). |
| **Payment reference (idempotency)** | Must be non-empty after trimming. Built as: `order_id` **or** `session_id` **or** `account_no` (see below). Same reference → second call returns **200** `"Already processed"` and does **not** double-credit. |
| **User lookup** | At least one of **email** or **account_no** must be present so we can find the user. |

### Reference fields (first non-empty wins)

1. `payload.order_id` or `payload.ref` or `payload.reference` or root `order_id`
2. Else `payload.session_id` or root `session_id`
3. Else `payload.account_no` or root `account_no`

### Email (optional if `account_no` is present)

- `payload.email` or `payload.customer_email` or root `email`

### Virtual account (optional if `email` matches a user)

- `payload.account_no` or root `account_no` — must match a row in `virtual_accounts.account_no` for the user.

### User resolution order

1. If `email` is set → find `users.email`
2. Else if `account_no` is set → find `virtual_accounts.account_no` → `user_id`

If no user is found → **404** `{"error":"User not found."}`

---

## 4. Example `curl` (for testing)

Replace placeholders:

```bash
curl -sS -X POST 'https://YOUR_DOMAIN/api/webhooks/sprintpay' \
  -H 'Content-Type: application/json' \
  -H 'X-Auth-Token: YOUR_SPRINTPAY_WEBHOOK_SECRET' \
  -d '{
    "amount": 5000,
    "email": "customer@example.com",
    "order_id": "UNIQUE_REF_12345"
  }'
```

Minimum fields for success:

- Valid secret header
- `amount` > 0
- A unique `order_id` / `session_id` / `account_no` (reference)
- `email` and/or `account_no` to resolve the user

---

## 5. HTTP responses (summary)

| Code | Meaning |
|------|---------|
| **200** | Success (`success`, `new_balance`, …) **or** duplicate reference (`message`: already processed) |
| **400** | Invalid amount, or missing reference, or missing email/account_no |
| **401** | Webhook secret missing or wrong |
| **404** | No user for given email / virtual account |
| **503** | `SPRINTPAY_WEBHOOK_SECRET` not configured on server |

---

## 6. Operational notes

- **Rate limiting:** Route uses `throttle:60,1` (60 requests per minute per IP by default). Adjust in `routes/api.php` if SprintPay sends bursts.
- **Locks:** Reference is deduped with a cache lock + DB transaction to reduce double credits under concurrency.
- **SprintPay product docs:** If SprintPay documents a **different** header (e.g. HMAC signature), align their dashboard with one of the supported headers above, or extend `WebhookController::validWebhookSecret()` to verify HMAC as well.

---

## 7. Related env vars (virtual account API, not the webhook)

Used elsewhere (e.g. generating virtual accounts):

```env
SPRINTPAY_API_KEY=...
SPRINTPAY_SECRET=...
```

These are **not** the same as `SPRINTPAY_WEBHOOK_SECRET` unless you intentionally set them equal. Prefer a **dedicated** webhook secret for callbacks.
