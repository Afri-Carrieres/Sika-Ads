// ============================================================
// supabase/functions/send-onesignal-push/index.ts
// Supabase Edge Function pour l'envoi de Push via l'API REST OneSignal
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://www.sika-ads.com",
  "https://sikaads-7b9bc.web.app",
  "https://sikaads-7b9bc.firebaseapp.com",
  "http://localhost:5173",
  "http://localhost:3000",
];

serve(async (req: Request) => {
  const origin = req.headers.get("Origin");
  const corsHeaders: Record<string, string> = {
    "Access-Control-Allow-Origin": origin && ALLOWED_ORIGINS.includes(origin) ? origin : "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      global: { headers: { Authorization: authHeader || "" } },
    });

    // 1. Vérification de la session de l'expéditeur
    const { data: authData } = await supabase.auth.getUser();
    let isStaff = false;

    if (authData?.user?.id) {
      const { data: callerProfile } = await supabase
        .from("users")
        .select("role")
        .eq("id", authData.user.id)
        .single();
      isStaff = callerProfile?.role === "ADMIN" || callerProfile?.role === "MODERATOR";
    }

    // 2. Vérification de la clé OneSignal
    const oneSignalAppId = Deno.env.get("ONESIGNAL_APP_ID") || Deno.env.get("VITE_ONESIGNAL_APP_ID");
    const oneSignalRestApiKey = Deno.env.get("ONESIGNAL_REST_API_KEY");

    if (!oneSignalAppId || !oneSignalRestApiKey) {
      console.warn("OneSignal App ID ou REST API Key non configurée dans Deno.env");
      return new Response(
        JSON.stringify({
          error: "OneSignal non configuré sur le serveur (ONESIGNAL_REST_API_KEY manquante).",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const body = await req.json();
    const { title, message, url, segment, targetUserIds } = body;

    if (!title || !message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields ('title' or 'message')" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 3. Préparer le payload OneSignal REST API
    const oneSignalPayload: Record<string, any> = {
      app_id: oneSignalAppId,
      headings: { fr: title, en: title },
      contents: { fr: message, en: message },
      url: url ? (url.startsWith("http") ? url : `https://www.sika-ads.com${url}`) : "https://www.sika-ads.com",
    };

    if (targetUserIds && Array.isArray(targetUserIds) && targetUserIds.length > 0) {
      // Cibler des utilisateurs spécifiques par leur External ID Supabase
      oneSignalPayload.include_aliases = { external_id: targetUserIds };
      oneSignalPayload.target_channel = "push";
    } else {
      // Ciblage par segment (remplacer 'All' par 'Subscribed Users' pour l'API REST OneSignal v1)
      const targetSegment = (!segment || segment === "All") ? "Subscribed Users" : segment;
      oneSignalPayload.included_segments = [targetSegment];
    }

    console.log("[OneSignal Edge] Envoi notification payload:", JSON.stringify(oneSignalPayload));

    // 4. Exécuter la requête HTTP vers OneSignal
    const osResponse = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${oneSignalRestApiKey}`,
      },
      body: JSON.stringify(oneSignalPayload),
    });

    const osData = await osResponse.json();

    if (!osResponse.ok) {
      console.error("❌ OneSignal API error:", osData);
      return new Response(
        JSON.stringify({ error: "Erreur API OneSignal", details: osData }),
        {
          status: osResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Notification transmise à OneSignal", data: osData }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("❌ Erreur serveur Edge Function OneSignal:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Erreur interne Edge Function" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
