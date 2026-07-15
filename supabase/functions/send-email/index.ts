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
    const resendApiKey = Deno.env.get("RESEND_API_KEY_SECRET");

    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY_SECRET non configurée" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { to, type, data } = await req.json();

    if (!to || !type) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let subject = "SikaAds Togo";
    let htmlContent = "";

    // Build email templates based on type
    if (type === "campaign_confirmed") {
      subject = `Confirmation de paiement: ${data.campaignTitle}`;
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <h2 style="color: #4F46E5;">Paiement Confirmé !</h2>
          <p>Bonjour <strong>${data.advertiserName}</strong>,</p>
          <p>Le paiement de <strong>${data.amount} FCFA</strong> pour votre campagne "<strong>${data.campaignTitle}</strong>" a été validé avec succès.</p>
          <p>Votre campagne est maintenant active et diffusée auprès de nos ambassadeurs.</p>
          <br/>
          <p>L'équipe SikaAds Togo</p>
        </div>
      `;
    } else if (type === "withdrawal_approved") {
      subject = `Retrait validé: ${data.amount} FCFA`;
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <h2 style="color: #10B981;">Retrait Envoyé !</h2>
          <p>Bonjour <strong>${data.userName}</strong>,</p>
          <p>Votre demande de retrait de <strong>${data.amount} FCFA</strong> a été validée et le virement a été effectué vers votre compte <strong>${data.provider.toUpperCase()} (${data.phone})</strong>.</p>
          <br/>
          <p>L'équipe SikaAds Togo</p>
        </div>
      `;
    } else if (type === "withdrawal_rejected") {
      subject = `Retrait rejeté: ${data.amount} FCFA`;
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <h2 style="color: #EF4444;">Retrait Rejeté</h2>
          <p>Bonjour <strong>${data.userName}</strong>,</p>
          <p>Votre demande de retrait de <strong>${data.amount} FCFA</strong> a été rejetée. Le montant a été recrédité sur votre solde SikaAds.</p>
          <p>Si vous pensez qu'il s'agit d'une erreur, veuillez contacter le support.</p>
          <br/>
          <p>L'équipe SikaAds Togo</p>
        </div>
      `;
    } else {
      return new Response(JSON.stringify({ error: "Unknown email type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`📧 Sending email to ${to} (Subject: ${subject})`);

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "SikaAds <support@sikaads-togo.com>", // Replace with verified domain if needed
        to: [to],
        subject: subject,
        html: htmlContent,
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error("❌ Resend API error:", resendData);
      return new Response(JSON.stringify({ error: "Erreur lors de l'envoi de l'email" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, message: "Email envoyé" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("❌ Error sending email:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
