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

    const { campaignId, transactionReference } = await req.json();

    if (!campaignId || !transactionReference) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: campaignId, transactionReference" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ Validating payment for campaignId:", campaignId);
    console.log("📋 Transaction reference received:", transactionReference);

    // ─── BUG FIX: GOMBOYAS-CMP-xxx vs CMP-xxx ────────────────────────────────
    // GomboPlus prefixes the reference with the operator name (GOMBOYAS- or GOMBOMOOV-)
    // but the stored reference in DB may lack this prefix.
    // We strip the prefix to get the base reference for matching.
    const stripGomboPrefix = (ref: string): string => {
      return ref
        .replace(/^GOMBOYAS-/i, "")
        .replace(/^GOMBOMOOV-/i, "")
        .replace(/^GOMBOMTK-/i, "")
        .trim();
    };

    const baseRef = stripGomboPrefix(transactionReference);
    console.log("🔑 Base reference (stripped):", baseRef);

    // Find the campaign — try exact match first, then partial match
    const { data: campaign, error: campErr } = await supabase
      .from("campaigns")
      .select("id, title, totalBudget, paymentStatus, paymentReference, advertiserEmail, advertiserName")
      .eq("id", campaignId)
      .single();

    if (campErr || !campaign) {
      console.error("❌ Campaign not found:", campErr);
      return new Response(
        JSON.stringify({ error: "Campaign not found", details: campErr?.message }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If already paid, return success immediately (idempotent)
    if (campaign.paymentStatus === "paid") {
      console.log("ℹ️ Campaign already marked as paid, skipping update");
      return new Response(
        JSON.stringify({ success: true, campaignId, message: "Campaign already validated" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the reference matches (accounting for prefix difference)
    const storedRef = campaign.paymentReference || "";
    const storedBase = stripGomboPrefix(storedRef);
    const refMatches =
      storedRef === transactionReference ||
      storedBase === baseRef ||
      storedRef.includes(baseRef) ||
      transactionReference.includes(storedBase);

    if (!refMatches) {
      console.warn(
        `⚠️ Reference mismatch: stored="${storedRef}" vs received="${transactionReference}"`
      );
      // We log but still proceed if campaignId matches — the webhook is authoritative
    }

    // Update campaign to active + paid
    const { error: updateErr } = await supabase
      .from("campaigns")
      .update({
        status: "active",
        paymentStatus: "paid",
        paymentConfirmed: true,
        paymentConfirmedAt: new Date().toISOString(),
        campaignPaymentStatus: "payment_verified",
        paymentReference: transactionReference, // store the full GomboPlus reference
        updatedAt: new Date().toISOString(),
      })
      .eq("id", campaignId);

    if (updateErr) {
      console.error("❌ Error updating campaign:", updateErr);
      return new Response(
        JSON.stringify({ error: "Failed to update campaign", details: updateErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ Campaign validated and activated:", campaignId);

    // Insert a global announcement for all users
    await supabase.from('announcements').insert([{
      title: `Campagne activée : ${campaign.title}`,
      content: `La campagne "${campaign.title}" est maintenant payée et active. Les ambassadeurs peuvent commencer à la promouvoir dès maintenant.`,
      createdAt: new Date().toISOString(),
    }]);

    // Send a global push notification to all subscribed users
    fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        broadcast: true,
        title: 'Nouvelle campagne activée',
        body: `La campagne "${campaign.title}" est maintenant active. Découvrez-la dès maintenant !`,
        icon: '/Web-Icon.png',
        data: {
          type: 'announcement',
          url: '/#/app',
        },
      }),
    }).catch((e) => console.warn('Push broadcast failed (non-blocking):', e.message));

    // Send confirmation email (fire and forget)
    if (campaign.advertiserEmail) {
      const emailPayload = {
        to: campaign.advertiserEmail,
        type: "campaign_confirmed",
        data: {
          advertiserName: campaign.advertiserName || "Annonceur",
          campaignTitle: campaign.title,
          amount: campaign.totalBudget,
          campaignId,
        },
      };

      fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify(emailPayload),
      }).catch((e) => console.warn("Email send failed (non-blocking):", e.message));
    }

    return new Response(
      JSON.stringify({ success: true, campaignId, message: "Campaign payment validated and campaign activated" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("❌ Error in validate-campaign-payment:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
