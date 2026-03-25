# VTU & bills (SprintPay → VTpass)

End users buy **airtime, data, cable TV, and electricity** from your app. Your **Laravel API** debits the user’s **in-app wallet** and calls **SprintPay** with your partner token. SprintPay debits its ledger and fulfils via **VTpass**. You do **not** call VTpass from this codebase.

## Environment

| Variable | Purpose |
|----------|---------|
| `WEBKEY` | SprintPay merchant key sent as `key` on merchant/vas and catalog calls |
| `SPRINTPAY_API_BASE` | API root, default `https://web.sprintpay.online/api` |
| `SPRINTPAY_WEBHOOK_SECRET` | Used for webhook validation and default Bearer token for merchant/vas calls |
| `SPRINTPAY_API_TOKEN` | Optional explicit Bearer token override (otherwise falls back to `SPRINTPAY_WEBHOOK_SECRET`) |
| `SPRINTPAY_VTU_ENABLED` | `true` to send real HTTP requests to SprintPay |
| `SPRINTPAY_VTU_MOCK` | `true` to simulate success **without** calling SprintPay (UI / wallet flow testing) |
| `SPRINTPAY_VTU_PATH_*` | Override path segments if SprintPay’s docs use different URLs |

**Do not** enable both mock and production debugging with real money without understanding wallet debits: mock still **debits the user wallet** on “success” so you can test the full UX.

## Authenticated routes (Sanctum)

| Method | Route | Description |
|--------|--------|-------------|
| POST | `/api/vtu/airtime` | `network`, `phone`, `amount` |
| GET | `/api/vtu/catalog/data-networks` | Proxy of SprintPay `GET /get-data` |
| GET | `/api/vtu/catalog/data-variations` | Proxy of SprintPay `GET /get-data-variations?network=...` |
| GET | `/api/vtu/catalog/cable-plans` | Proxy of SprintPay `GET /cable-plan` |
| GET | `/api/vtu/catalog/electricity-variations` | Proxy of SprintPay `GET /get-electricity-variations` |
| POST | `/api/vtu/data` | `network`, `phone`, `amount`, optional `variation_code`, `service_id`, `plan_code` |
| GET | `/api/vtu/cable/validate` | `provider`, `smartcard_number` |
| POST | `/api/vtu/cable/buy` | `provider`, `smartcard_number`, `product_code`, `amount` |
| GET | `/api/vtu/electricity/validate` | `disco`, `meter_type` (`prepaid`\|`postpaid`), `meter_number` |
| POST | `/api/vtu/electricity/buy` | same + `amount` |

Request bodies must match **SprintPay’s** documented field names. If their API expects different keys, merge static fields via `config/services.php` → `sprintpay.vtu_payload_extra.*` or change `VtuController` payloads.

## Webhook (wallet top-up)

Credits to the merchant stack when SprintPay pays you use `POST /api/webhooks/sprintpay` — separate from VTU vend. See existing webhook docs in the repo.

## References

- [SprintPay API reference](https://sprintpay.readme.io/reference/new-endpoint)
- [web.sprintpay.online](https://web.sprintpay.online/)
