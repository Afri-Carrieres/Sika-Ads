import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const privateKey = Deno.env.get("GOMBO_PRIVATE_KEY_SECRET");
    const publicKey = Deno.env.get("GOMBO_PUBLIC_KEY_SECRET");
    const gomboBaseUrl = Deno.env.get("GOMBO_BASE_URL") || "https://api.gomboplus.com";

    if (!privateKey || !publicKey) {
      return new Response(
        JSON.stringify({ error: "GOMBO_PRIVATE_KEY_SECRET or GOMBO_PUBLIC_KEY_SECRET not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { transaction_reference } = await req.json();

    if (!transaction_reference) {
      return new Response(
        JSON.stringify({ error: "Missing required field: transaction_reference" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("🔍 Checking status for reference:", transaction_reference);

    // Call GomboPlus API to check transaction status
    // Suppression du slash final pour éviter l'erreur 400 (Données invalides)
    const gomboResponse = await fetch(`${gomboBaseUrl}/api/mobile-services/check-transaction-status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Public-Key": publicKey,
        "X-Private-Key": privateKey,
      },
      body: JSON.stringify({ transaction_reference }),
    });

    const gomboData = await gomboResponse.json();
    console.log("📥 GomboPlus Status Response:", JSON.stringify(gomboData));

    if (!gomboResponse.ok) {
      return new Response(
        JSON.stringify({
          error: gomboData?.message || "GomboPlus API error",
          gomboStatus: gomboResponse.status, // On renvoie le code original dans le body
          status: "unknown",
        }),
        // On force le statut à 502 pour savoir que c'est Gombo qui a échoué
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalize status from GomboPlus
    const content = gomboData.content || gomboData || {};
    const rawStatus = String(content.status || content.status_message || "pending");

    return new Response(
      JSON.stringify({
        reference: transaction_reference,
        status: rawStatus,
        message: gomboData.message || "",
        amount: content.amount,
        fees: content.fees,
        total_amount: content.total_amount,
        operator: content.operator,
        number: content.number || content.recipient_number,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("❌ Error in gombo-check-transaction-status:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
