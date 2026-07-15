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

  // Helper interne pour simuler le gomboFetch de ton code Firebase
  const gomboFetch = async (baseUrl: string, path: string, publicKey: string, privateKey: string, body: any) => {
    const url = `${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
    console.log(`🚀 Appel GomboPlus: ${url}`, JSON.stringify(body));

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Public-Key": publicKey,
        "X-Private-Key": privateKey,
      },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    let json: any = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      // ignore parsing error
    }

    if (!res.ok) {
      const message = json && typeof json === "object" && json.message
        ? String(json.message)
        : `gombo_http_${res.status}`;

      // On jette une erreur structurée pour le catch global
      const errorInfo = {
        message,
        status: res.status,
        details: json
      };
      throw new Error(JSON.stringify(errorInfo));
    }

    return json;
  };

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const privateKey = Deno.env.get("GOMBO_PRIVATE_KEY_SECRET");
    const publicKey = Deno.env.get("GOMBO_PUBLIC_KEY_SECRET");
    const gomboBaseUrl = Deno.env.get("GOMBO_BASE_URL") || "https://api.gomboplus.com";

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Les données envoyées par ton frontend (PaymentPage.tsx)
    const body = await req.json();
    console.log("📥 Payload reçu du frontend:", JSON.stringify(body));

    const { amount, recipient_number, operator, campaignId, country = "TG" } = body;

    if (!amount || !recipient_number || !operator || !campaignId) {
      const missingFields = [];
      if (!amount) missingFields.push("amount");
      if (!recipient_number) missingFields.push("recipient_number");
      if (!operator) missingFields.push("operator");
      if (!campaignId) missingFields.push("campaignId");

      return new Response(JSON.stringify({ error: `Champs obligatoires manquants: ${missingFields.join(", ")}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (!publicKey || !privateKey) {
      throw new Error("Clés API GomboPlus non configurées dans les secrets");
    }

    // 1. Création d'une référence locale temporaire
    const localRef = `CMP-${campaignId.substring(0, 8)}-${Date.now()}`;

    // 2. Préparation du payload (en s'inspirant de ta logique Firebase)
    const cleanNumber = recipient_number.replace(/\s+/g, '').replace('+', '');

    const gomboPayload = {
      amount: Math.round(Number(amount)), // Arrondi comme dans ton code Firebase
      currency: "XOF",
      number: cleanNumber,
      recipient_number: cleanNumber,
      country: country.toUpperCase(),
      operator: operator.toLowerCase(),
      transaction_ref: localRef,
      transaction_reference: localRef, // Double sécurité sur le nom du champ
      callback_url: `${supabaseUrl}/functions/v1/gombo-webhook`,
    };

    // 3. Appel API via le helper standardisé
    // On utilise "api/..." au lieu de "/api/..." pour laisser le helper gérer le slash
    const gomboData = await gomboFetch(
      gomboBaseUrl,
      "api/mobile-services/mobile-deposit/",
      publicKey,
      privateKey,
      gomboPayload
    );

    console.log("📥 Réponse GomboPlus succès:", JSON.stringify(gomboData));

    // 4. Récupération de la référence finale
    // On vérifie content.reference en priorité, sinon la racine, sinon localRef
    const finalReference =
      gomboData.content?.reference ||
      gomboData.reference ||
      gomboData.content?.id ||
      localRef;

    await supabase
      .from("campaigns")
      .update({
        paymentReference: finalReference,
        paymentOperator: operator,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", campaignId);

    return new Response(JSON.stringify(gomboData), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("❌ Erreur gombo-create-mobile-deposit:", err);

    let status = 500;
    let errorPayload = { error: err.message };

    // Si c'est une erreur venant de gomboFetch (JSON stringifié)
    try {
      const parsedError = JSON.parse(err.message);
      status = parsedError.status || 500;
      errorPayload = {
        error: parsedError.message,
        details: parsedError.details
      };
    } catch { /* pas un JSON, on garde l'erreur brute */ }

    return new Response(JSON.stringify(errorPayload), {
      status: status, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});