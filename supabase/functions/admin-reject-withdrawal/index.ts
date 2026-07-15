import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { withdrawalId } = await req.json();

    if (!withdrawalId) {
      return new Response(JSON.stringify({ error: "Missing withdrawalId" }), { status: 400, headers: corsHeaders });
    }

    // Fetch withdrawal
    const { data: withdrawal, error: wErr } = await supabase
      .from("withdrawals")
      .select("*, users!inner(id, balance, email, name)")
      .eq("id", withdrawalId)
      .single();

    if (wErr || !withdrawal) {
      return new Response(JSON.stringify({ error: "Withdrawal not found" }), { status: 404, headers: corsHeaders });
    }

    if (withdrawal.status === "failed" || withdrawal.status === "rejected") {
      return new Response(JSON.stringify({ success: true, message: "Already rejected" }), { status: 200, headers: corsHeaders });
    }

    // Refund the user's balance
    const currentBalance = withdrawal.users.balance || 0;
    const newBalance = currentBalance + withdrawal.amount;

    const { error: refundErr } = await supabase
      .from("users")
      .update({ balance: newBalance })
      .eq("id", withdrawal.users.id);

    if (refundErr) {
      throw new Error("Failed to refund user balance");
    }

    // Update withdrawal status
    await supabase
      .from("withdrawals")
      .update({
        status: "failed", // or rejected
        updatedAt: new Date().toISOString(),
      })
      .eq("id", withdrawalId);

    // Send rejection email
    if (withdrawal.users?.email) {
      fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          to: withdrawal.users.email,
          type: "withdrawal_rejected",
          data: {
            userName: withdrawal.users.name || "Ambassadeur",
            amount: withdrawal.amount,
          },
        }),
      }).catch(console.error);
    }

    return new Response(JSON.stringify({ success: true, message: "Withdrawal rejected and balance refunded" }), { status: 200, headers: corsHeaders });
  } catch (err: any) {
    console.error("❌ Error rejecting withdrawal:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
