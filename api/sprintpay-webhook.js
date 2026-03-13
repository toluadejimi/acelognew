/**
 * Proxy for SprintPay webhook: receives POST with JSON body and forwards to Supabase
 * Edge Function as query params (Supabase gateway often strips POST body).
 *
 * Deploy to Vercel: your app will have https://your-app.vercel.app/api/sprintpay-webhook
 * Set that URL in SprintPay as the webhook URL.
 *
 * Env: SUPABASE_WEBHOOK_URL = https://psqamfhkxigzoviebcmu.supabase.co/functions/v1/sprintpay-webhook
 */
const SUPABASE_WEBHOOK_URL = process.env.SUPABASE_WEBHOOK_URL || "https://psqamfhkxigzoviebcmu.supabase.co/functions/v1/sprintpay-webhook";

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = typeof req.body === "object" && req.body !== null ? req.body : {};
    const payload = body.payload ?? body.data ?? body;
    const amount = payload?.amount ?? body?.amount ?? 0;
    const email = payload?.email ?? body?.email ?? "";
    const order_id = payload?.order_id ?? body?.order_id ?? "";
    const session_id = payload?.session_id ?? body?.session_id ?? "";
    const account_no = payload?.account_no ?? body?.account_no ?? "";

    const params = new URLSearchParams();
    if (amount !== undefined && amount !== "") params.set("amount", String(amount));
    if (email) params.set("email", email);
    if (order_id) params.set("order_id", order_id);
    if (session_id) params.set("session_id", session_id);
    if (account_no) params.set("account_no", account_no);

    const url = `${SUPABASE_WEBHOOK_URL}?${params.toString()}`;
    const forward = await fetch(url, { method: "POST" });
    const data = await forward.json();

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(forward.status).json(data);
  } catch (err) {
    console.error("SprintPay webhook proxy error:", err);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(500).json({ error: err.message || "Proxy error" });
  }
}
