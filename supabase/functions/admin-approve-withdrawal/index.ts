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
    const privateKey = Deno.env.get("GOMBO_PRIVATE_KEY_SECRET");
    const publicKey = Deno.env.get("GOMBO_PUBLIC_KEY_SECRET");
    const gomboBaseUrl = Deno.env.get("GOMBO_BASE_URL") || "https://api.gomboplus.com";

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { withdrawalId } = await req.json();

    if (!withdrawalId) {
      return new Response(JSON.stringify({ error: "Missing withdrawalId" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fetch withdrawal
    const { data: withdrawal, error: wErr } = await supabase
      .from("withdrawals")
      .select("*, users!inner(email, name)")
      .eq("id", withdrawalId)
      .single();

    if (wErr || !withdrawal) {
      return new Response(JSON.stringify({ error: "Withdrawal not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (withdrawal.status === "completed") {
      return new Response(JSON.stringify({ success: true, message: "Already completed" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Call GomboPlus API to send money (CashOut) if API keys are present
    let reference = `WD-${withdrawalId}-${Date.now()}`;
    if (privateKey && publicKey) {
      const gomboPayload = {
        amount: withdrawal.amount,
        currency: "XOF",
        country: "TG", // Toujours MAJUSCULE selon doc
        operator: String(withdrawal.provider).toLowerCase(), // Toujours minuscule (yas/moov)
        number: withdrawal.phone?.replace(/\s+/g, '').replace('+', ''),
        recipient_number: withdrawal.phone?.replace(/\s+/g, '').replace('+', ''), // Format doc
        transaction_ref: reference,
        callback_url: `${supabaseUrl}/functions/v1/gombo-webhook`,
      };

      console.log("📤 Sending cashout request to GomboPlus:", gomboPayload);
      const gomboResponse = await fetch(`${gomboBaseUrl}/api/mobile-services/mobile-withdrawal/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Public-Key": publicKey,
          "X-Private-Key": privateKey,
        },
        body: JSON.stringify(gomboPayload),
      });

      const gomboData = await gomboResponse.json();
      console.log("📥 GomboPlus Cashout Response:", gomboData);

      if (!gomboResponse.ok) {
        throw new Error(gomboData?.message || "Erreur API GomboPlus lors du virement");
      }

      // IMPORTANT: On récupère la référence générée par Gombo (GOMBOYAS-...) 
      // pour la réconciliation future dans le webhook
      reference = gomboData.content?.reference || gomboData.content?.id || reference;
    } else {
      console.warn("⚠️ GOMBO_API_KEY non configurée. Validation manuelle enregistrée.");
    }

    // Update withdrawal status
    await supabase
      .from("withdrawals")
      .update({
        status: "completed",
        updatedAt: new Date().toISOString(),
        transactionReference: reference,
      })
      .eq("id", withdrawalId);

    // Send confirmation email
    if (withdrawal.users?.email) {
      fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          to: withdrawal.users.email,
          type: "withdrawal_approved",
          data: {
            userName: withdrawal.users.name || "Ambassadeur",
            amount: withdrawal.amount,
            phone: withdrawal.phone,
            provider: withdrawal.provider,
          },
        }),
      }).catch(console.error);
    }

    return new Response(JSON.stringify({ success: true, reference }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("❌ Error approving withdrawal:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
