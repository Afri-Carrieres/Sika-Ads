import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://www.sika-ads.com",
  "https://sikaads-7b9bc.web.app",
  "https://sikaads-7b9bc.firebaseapp.com",
  "http://localhost:5173",
  "http://localhost:3000",
];

function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin");
  return {
    "Access-Control-Allow-Origin":
      origin && ALLOWED_ORIGINS.includes(origin)
        ? origin
        : "https://www.sika-ads.com",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
  corsHeaders: Record<string, string>
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

serve(async (req: Request) => {
  const corsHeaders = corsHeadersFor(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") as string;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      console.error("[track-share] Missing Supabase env vars");
      return jsonResponse({ success: false, error: "configuration_error" }, 500, corsHeaders);
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    let campaignId: string | null = null;
    let platform: string | null = null;
    let ref: string | null = null;

    if (req.method === "POST") {
      // Accept JSON body for share tracking from the frontend
      const body = await req.json().catch(() => ({}));
      campaignId = body.campaignId ?? null;
      platform = body.platform ?? null;
      ref = body.ref ?? null;
    } else {
      // Fallback: accept query params (e.g. from a redirect link)
      const url = new URL(req.url);
      campaignId = url.searchParams.get("campaignId");
      platform = url.searchParams.get("platform");
      ref = url.searchParams.get("ref");
    }

    if (!campaignId) {
      return jsonResponse({ success: false, error: "campaignId_required" }, 400, corsHeaders);
    }

    const userAgent = req.headers.get("user-agent") || null;
    const ip =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      null;

    const { error } = await supabase.from("campaign_shares").insert([
      {
        campaign_id: campaignId,
        platform,
        referrer: ref,
        user_agent: userAgent,
        ip,
        shared_at: new Date().toISOString(),
      },
    ]);

    if (error) {
      console.error("[track-share] Failed to insert share event:", error);
      return jsonResponse({ success: false, error: "insert_failed" }, 500, corsHeaders);
    }

    console.log(`[track-share] Share recorded for campaign ${campaignId} via ${platform ?? "unknown"}`);

    return jsonResponse({ success: true, campaignId, platform }, 200, corsHeaders);
  } catch (err) {
    console.error("[track-share] Unexpected error:", err);
    return jsonResponse({ success: false, error: "internal_error" }, 500, corsHeaders);
  }
});
