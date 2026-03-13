// Generate or return existing SprintPay virtual account for the authenticated user
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-user-token",
};

const jsonRes = (body: object, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonRes({ success: false, error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
    const userToken = req.headers.get("X-User-Token") || req.headers.get("x-user-token");
    // Use X-User-Token if present (user identity); else Bearer (gateway may require anon key as Bearer)
    const tokenToUse = (userToken && userToken.trim()) ? userToken.trim() : (authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null);
    if (!tokenToUse) {
      return jsonRes({ success: false, error: "Not authenticated" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const apiKey = Deno.env.get("SPRINTPAY_API_KEY") ?? Deno.env.get("PALMPAYKEY") ?? "";
    const apiSecret = Deno.env.get("SPRINTPAY_SECRET") ?? Deno.env.get("PALSEC") ?? "";

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${tokenToUse}` } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return jsonRes({ success: false, error: "Invalid session. Try signing out and back in." }, 401);
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const email = user.email ?? "";
    if (!email) return jsonRes({ success: false, error: "User email is required" }, 400);

    // Body: { amount?: number, account_name?: string, phone?: string } — name and phone required for new accounts
    let body: { amount?: number; account_name?: string; phone?: string } = {};
    try {
      body = await req.json();
    } catch {
      // empty body ok
    }
    const accountName = body.account_name?.trim() || user.user_metadata?.name || user.user_metadata?.full_name || email.split("@")[0] || "";
    const phone = body.phone?.trim()?.replace(/\D/g, "") || "";

    // Return existing virtual account if any
    const { data: existing } = await admin
      .from("virtual_accounts")
      .select("account_no, account_name, bank_name, created_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      return jsonRes({
        success: true,
        account_no: existing.account_no,
        account_name: existing.account_name,
        bank_name: existing.bank_name,
        amount: body.amount ?? 0,
        existing: true,
      }, 200);
    }

    // New account requires full name and phone
    if (!accountName || accountName.length < 2) {
      return jsonRes({ success: false, error: "Full name is required" }, 400);
    }
    if (!phone || phone.length < 10 || phone.length > 15) {
      return jsonRes({ success: false, error: "Valid phone number is required (10–15 digits)" }, 400);
    }

    // Generate new virtual account via SprintPay
    if (!apiKey || !apiSecret) {
      return jsonRes({ success: false, error: "SprintPay API not configured" }, 503);
    }

    const res = await fetch("https://web.sprintpay.online/api/generate-virtual-account", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
        "Authorization": `Bearer ${apiSecret}`,
      },
      body: JSON.stringify({
        email,
        account_name: accountName,
        key: apiKey,
      }),
    });

    const data = await res.json();
    const status = data?.status ?? data?.data?.status;
    const errMsg = data?.message ?? data?.error ?? "Failed to generate account";

    if (!res.ok || status === false) {
      console.error("SprintPay generate-virtual-account error:", data);
      return jsonRes({ success: false, error: errMsg }, 400);
    }

    const accountNumber = data?.data?.account_number ?? data?.account_number;
    const accountNameRes = data?.data?.account_name ?? data?.account_name ?? accountName;
    const bankName = data?.data?.bank_name ?? data?.bank_name ?? "SprintPay";

    if (!accountNumber) {
      return jsonRes({ success: false, error: "Invalid response from payment provider" }, 502);
    }

    const { error: upsertErr } = await admin.from("virtual_accounts").upsert(
      {
        user_id: user.id,
        email,
        account_no: accountNumber,
        account_name: accountNameRes,
        bank_name: bankName,
        phone: phone || null,
      },
      { onConflict: "user_id" }
    );

    if (upsertErr) {
      console.error("virtual_accounts upsert error:", upsertErr);
      return jsonRes({
        success: false,
        error: upsertErr.message || "Database error. Ensure the virtual_accounts table exists and has a phone column (run migrations).",
      }, 500);
    }

    return jsonRes({
      success: true,
      account_no: accountNumber,
      account_name: accountNameRes,
      bank_name: bankName,
      amount: body.amount ?? 0,
      existing: false,
    }, 200);
  } catch (err) {
    console.error("generate-virtual-account error:", err);
    return jsonRes({ success: false, error: (err as Error).message ?? "Internal error" }, 500);
  }
});
