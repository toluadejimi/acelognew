import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const jsonRes = (body: object, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonRes({ success: false, error: "Not authenticated" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // User client to get identity
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return jsonRes({ success: false, error: "Invalid session" }, 401);
    }

    // Admin client
    const admin = createClient(supabaseUrl, serviceKey);

    const { product_id, quantity = 1 } = await req.json();
    if (!product_id) return jsonRes({ success: false, error: "product_id is required" }, 400);

    // 1. Get product
    const { data: product, error: prodErr } = await admin
      .from("products").select("*").eq("id", product_id).eq("is_active", true).single();
    if (prodErr || !product) return jsonRes({ success: false, error: "Product not found or inactive" }, 400);

    // 2. Check stock
    if (product.stock < quantity) return jsonRes({ success: false, error: "Not enough stock available" }, 400);

    const totalPrice = product.price * quantity;

    // 3. Get wallet
    const { data: wallet, error: walletErr } = await admin
      .from("wallets").select("*").eq("user_id", user.id).single();
    if (walletErr || !wallet) return jsonRes({ success: false, error: "Wallet not found. Please contact support." }, 400);

    // 4. Check balance
    if (Number(wallet.balance) < totalPrice) {
      return jsonRes({ success: false, error: "Insufficient balance", required: totalPrice, current: Number(wallet.balance) }, 402); // 402 Payment Required
    }

    // 5. Deduct balance
    const newBalance = Number(wallet.balance) - totalPrice;
    const { error: balErr } = await admin.from("wallets").update({ balance: newBalance }).eq("id", wallet.id);
    if (balErr) return jsonRes({ success: false, error: "Failed to deduct balance" });

    // 6. Decrement stock
    const { error: stockErr } = await admin.from("products").update({ stock: product.stock - quantity }).eq("id", product.id);
    if (stockErr) {
      await admin.from("wallets").update({ balance: wallet.balance }).eq("id", wallet.id);
      return jsonRes({ success: false, error: "Failed to update stock" });
    }

    // 7. Create order
    const { data: order, error: orderErr } = await admin.from("orders").insert({
      user_id: user.id, product_id: product.id, product_title: product.title,
      product_platform: product.platform, total_price: totalPrice, quantity,
      currency: product.currency, status: "completed",
    }).select().single();

    if (orderErr) {
      await admin.from("wallets").update({ balance: wallet.balance + totalPrice }).eq("id", wallet.id);
      await admin.from("products").update({ stock: product.stock }).eq("id", product.id);
      return jsonRes({ success: false, error: "Failed to create order" });
    }

    // 8. Assign account logs to order
    const { data: logs, error: logsErr } = await admin
      .from("account_logs")
      .select("id, login, password")
      .eq("product_id", product.id)
      .eq("is_sold", false)
      .limit(quantity);

    if (logsErr || !logs || logs.length < quantity) {
      // Rollback
      await admin.from("orders").delete().eq("id", order.id);
      await admin.from("wallets").update({ balance: wallet.balance + totalPrice }).eq("id", wallet.id);
      await admin.from("products").update({ stock: product.stock }).eq("id", product.id);
      return jsonRes({ success: false, error: "Critical error: No logs available for this product." });
    }

    const logIds = logs.map((l: { id: string }) => l.id);
    const { error: updateLogsErr } = await admin
      .from("account_logs")
      .update({ is_sold: true, order_id: order.id })
      .in("id", logIds);

    if (updateLogsErr) {
      // Rollback
      await admin.from("orders").delete().eq("id", order.id);
      await admin.from("wallets").update({ balance: wallet.balance + totalPrice }).eq("id", wallet.id);
      await admin.from("products").update({ stock: product.stock }).eq("id", product.id);
      return jsonRes({ success: false, error: "Failed to assign accounts. Please contact support." });
    }

    // 9. Transaction record
    await admin.from("transactions").insert({
      user_id: user.id, amount: totalPrice, type: "debit",
      description: `Purchase: ${product.title} (x${quantity})`, reference: order.id,
    });

    return jsonRes({
      success: true,
      order_id: order.id,
      new_balance: newBalance,
      accounts: logs, // Return the credentials so frontend can display them immediately
      message: "Purchase successful"
    });
  } catch (err) {
    console.error("Purchase error:", err);
    return jsonRes({ success: false, error: "Internal server error" });
  }
});
