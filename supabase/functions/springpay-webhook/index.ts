import { serve } from "https://deno.land/x/sift@0.6.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const SPRINT_API_KEY = Deno.env.get("SPRINTPAY_API_KEY") ?? "";

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  try {
    // Parse incoming webhook body
    const body = await req.json();
    console.log("SprintPay webhook received:", JSON.stringify(body));

    const payload = body?.payload;

    // Only process pay_in events
    if (payload?.event !== "pay_in") {
      console.log("Ignoring event:", payload?.event);
      return new Response(
        JSON.stringify({ message: "Ignored event: " + payload?.event }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Extract payment details from payload
    const email = payload?.email;
    const amount = Number(payload?.amount);
    const reference = payload?.order_id;
    const senderName = payload?.sender_name || "";
    const senderBank = payload?.sender_bank || "";

    console.log(`Payment received: ₦${amount} from ${email} | ref: ${reference}`);

    // Validate required fields
    if (!email || !amount || !reference) {
      console.error("Missing fields:", { email, amount, reference });
      return new Response(
        JSON.stringify({ error: "Missing email, amount or order_id" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // ✅ Verify payment with SprintPay before doing anything
    console.log("Verifying payment with SprintPay...");
    const verifyRes = await fetch(
      `https://web.sprintpay.online/api/verify-transaction?ref=${reference}&apikey=${SPRINT_API_KEY}`
    );
    const verifyData = await verifyRes.json();
    console.log("SprintPay verify response:", JSON.stringify(verifyData));

    // Check verification status
    const isSuccess =
      verifyData?.status === "success" ||
      verifyData?.data?.status === "success" ||
      verifyData?.data?.status === "completed" ||
      verifyData?.message?.toLowerCase().includes("success");

    if (!isSuccess) {
      console.error("Payment verification failed:", verifyData);
      return new Response(
        JSON.stringify({ error: "Payment not verified", data: verifyData }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("Payment verified successfully ✅");

    // Init Supabase with service role key (bypasses RLS)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // ✅ Prevent double credit — check if ref already processed
    const { data: existingTx } = await supabase
      .from("transactions")
      .select("id")
      .eq("reference", reference)
      .maybeSingle();

    if (existingTx) {
      console.log("Transaction already processed, skipping:", reference);
      return new Response(
        JSON.stringify({ message: "Already processed" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Find user by email
    console.log("Looking up user by email:", email);
    const { data: authData } = await supabase.auth.admin.listUsers();
    const user = authData?.users?.find(
      (u: any) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (!user) {
      console.error("User not found for email:", email);
      return new Response(
        JSON.stringify({ error: "User not found for email: " + email }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;
    console.log("Found user:", userId);

    // Get current wallet balance
    const { data: wallet, error: walletFetchError } = await supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", userId)
      .single();

    if (walletFetchError) {
      console.error("Failed to fetch wallet:", walletFetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch wallet" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const currentBalance = Number(wallet?.balance || 0);
    const newBalance = currentBalance + amount;
    console.log(`Updating balance: ₦${currentBalance} → ₦${newBalance}`);

    // Credit the wallet
    const { error: walletUpdateError } = await supabase
      .from("wallets")
      .update({ balance: newBalance })
      .eq("user_id", userId);

    if (walletUpdateError) {
      console.error("Failed to update wallet:", walletUpdateError);
      return new Response(
        JSON.stringify({ error: "Failed to update wallet" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Record the transaction
    const { error: txError } = await supabase
      .from("transactions")
      .insert({
        user_id: userId,
        amount,
        type: "credit",
        description: `Wallet top-up via SprintPay — ${senderName} (${senderBank})`,
        reference,
      });

    if (txError) {
      console.error("Failed to insert transaction record:", txError);
      // Don't return error here — wallet already credited, just log it
    }

    console.log(`✅ Successfully credited ₦${amount} to user ${userId} (${email})`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Credited ₦${amount} to ${email}`,
        new_balance: newBalance,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );

  } catch (err: any) {
    console.error("Unhandled webhook error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
