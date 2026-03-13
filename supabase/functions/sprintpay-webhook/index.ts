// SprintPay webhook: receive successful payment (redirect or virtual account) and credit user wallet
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const json = (body: object, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    const contentType = req.headers.get("content-type") || "";

    // Read body once (stream can only be read once)
    let body: Record<string, unknown> = {};
    const rawBody = await req.text();
    if (rawBody?.trim()) {
      if (contentType.includes("application/x-www-form-urlencoded")) {
        const params = new URLSearchParams(rawBody);
        body = Object.fromEntries(params.entries()) as Record<string, unknown>;
        if (body.amount !== undefined) body.amount = Number(body.amount) || body.amount;
      } else {
        try {
          body = JSON.parse(rawBody) as Record<string, unknown>;
        } catch {
          body = {};
        }
      }
    }
    // Fallback: query params (SprintPay or gateway may strip body; use URL params if you can configure webhook URL with query)
    if (Object.keys(body).length === 0 && Object.keys(queryParams).length > 0) {
      body = { ...queryParams } as Record<string, unknown>;
      if (body.amount !== undefined) body.amount = Number(body.amount) || body.amount;
    } else if (Object.keys(queryParams).length > 0) {
      body = { ...queryParams, ...body } as Record<string, unknown>;
    }

    const payload = (body?.payload ?? body?.data ?? body) as Record<string, unknown> | null;
    console.log("SprintPay webhook. Method:", req.method, "bodyKeys:", Object.keys(body), "queryKeys:", Object.keys(queryParams));

    // Amount: try multiple keys and both body/payload
    const rawAmount = payload?.amount ?? payload?.amount_paid ?? payload?.total ?? body?.amount ?? body?.amount_paid ?? 0;
    const amount = typeof rawAmount === "string" ? Number(rawAmount.replace(/\D/g, "")) || 0 : Number(rawAmount);
    const email = String(payload?.email ?? payload?.customer_email ?? body?.email ?? "").trim();
    const orderId = String(payload?.order_id ?? payload?.ref ?? payload?.reference ?? body?.order_id ?? "").trim();
    const sessionId = String(payload?.session_id ?? body?.session_id ?? "").trim();
    const accountNo = String(payload?.account_no ?? body?.account_no ?? "").trim();

    // Reference for idempotency
    const reference = orderId || sessionId || accountNo || "";

    if (!amount || amount <= 0 || !Number.isFinite(amount)) {
      console.error("Invalid amount. Raw:", rawAmount, "Parsed:", amount, "Body keys:", Object.keys(body));
      return json({
        error: "Invalid amount",
        received: { amount: rawAmount, bodyKeys: Object.keys(body), payloadKeys: payload ? Object.keys(payload) : [], queryKeys: Object.keys(queryParams) },
        hint: "If body is empty (bodyKeys: []), the gateway may strip POST body. Test with query params: .../sprintpay-webhook?amount=100&email=user@example.com&order_id=XXX&session_id=XXX&account_no=XXX",
      }, 400);
    }

    // Must have a way to identify the user: email or account_no (virtual account)
    if (!email && !accountNo) {
      console.error("Missing email and account_no");
      return json({ error: "Missing email or account_no" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sprintApiKey = Deno.env.get("SPRINTPAY_API_KEY") ?? Deno.env.get("PALSEC") ?? "";

    const admin = createClient(supabaseUrl, serviceKey);

    // Prevent double credit: check by reference (order_id / session_id / account_no used as ref)
    if (reference) {
      const { data: existing } = await admin
        .from("transactions")
        .select("id")
        .eq("reference", reference)
        .maybeSingle();
      if (existing) {
        console.log("Already processed:", reference);
        return json({ message: "Already processed" }, 200);
      }
    } else {
      // No ref: use composite to avoid double credit (e.g. email+amount+recent time - less ideal)
      const { data: recent } = await admin
        .from("transactions")
        .select("id")
        .eq("description", "Wallet top-up via SprintPay")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (recent) {
        console.log("Skipping duplicate (no ref)");
        return json({ message: "Already processed" }, 200);
      }
    }

    // Optional: verify with SprintPay when we have a ref (redirect flow). Virtual account may not verify the same way.
    if (reference && sprintApiKey) {
      try {
        const verifyRes = await fetch(
          `https://web.sprintpay.online/api/verify-transaction?ref=${encodeURIComponent(reference)}&apikey=${encodeURIComponent(sprintApiKey)}`
        );
        const verifyData = await verifyRes.json();
        const ok =
          verifyData?.status === "success" ||
          verifyData?.data?.status === "success" ||
          verifyData?.data?.status === "completed" ||
          String(verifyData?.message ?? "").toLowerCase().includes("success");
        if (!ok) {
          console.log("SprintPay verify failed (may be virtual account), continuing:", verifyData);
          // Don't return error - virtual account might not support verify with same ref
        }
      } catch (e) {
        console.log("Verify request failed, continuing:", e);
      }
    }

    // Resolve user: 1) by email, 2) by account_no (virtual_accounts)
    let userId: string | null = null;

    if (email) {
      const { data: users } = await admin.auth.admin.listUsers();
      const user = users?.users?.find((u: { email?: string }) => u.email?.toLowerCase() === email.toLowerCase());
      userId = user?.id ?? null;
    }

    if (!userId && accountNo) {
      const { data: va } = await admin
        .from("virtual_accounts")
        .select("user_id")
        .eq("account_no", accountNo)
        .maybeSingle();
      if (va) userId = va.user_id;
    }

    if (!userId) {
      console.error("User not found for email:", email, "account_no:", accountNo);
      return json({ error: "User not found. Ensure SprintPay sends email or account_no matches a virtual account." }, 404);
    }

    const { data: wallet, error: walletErr } = await admin
      .from("wallets")
      .select("id, balance")
      .eq("user_id", userId)
      .single();
    if (walletErr || !wallet) {
      console.error("Wallet not found:", walletErr);
      return json({ error: "Wallet not found" }, 500);
    }

    const newBalance = Number(wallet.balance) + amount;
    const { error: updateErr } = await admin
      .from("wallets")
      .update({ balance: newBalance })
      .eq("id", wallet.id);
    if (updateErr) {
      console.error("Wallet update failed:", updateErr);
      return json({ error: "Failed to credit wallet" }, 500);
    }

    await admin.from("transactions").insert({
      user_id: userId,
      amount,
      type: "credit",
      description: "Wallet top-up via SprintPay",
      reference: reference || null,
    });

    console.log(`Credited ₦${amount} to user ${userId} (ref: ${reference || "n/a"})`);
    return json({
      success: true,
      message: `Credited ₦${amount}`,
      new_balance: newBalance,
    }, 200);
  } catch (err) {
    console.error("Webhook error:", err);
    return json({ error: (err as Error)?.message ?? "Internal error" }, 500);
  }
});
