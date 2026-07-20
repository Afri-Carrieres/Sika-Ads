import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─────────────────────────────────────────────
//  HELPERS TEMPLATES
// ─────────────────────────────────────────────

const baseLayout = (content: string) => `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>SikaAds Togo</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:900;letter-spacing:-0.5px;">
                💼 SikaAds Togo
              </h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.75);font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">
                Plateforme de Marketing d'Influence
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:40px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:24px 40px;text-align:center;border-top:1px solid #e5e7eb;">
              <p style="margin:0;color:#9ca3af;font-size:11px;">
                © ${new Date().getFullYear()} SikaAds Togo · Tous droits réservés
              </p>
              <p style="margin:6px 0 0;color:#d1d5db;font-size:11px;">
                Vous recevez cet email car vous êtes inscrit sur SikaAds Togo.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

const badge = (text: string, color: string) =>
    `<span style="display:inline-block;padding:4px 12px;background:${color}20;color:${color};border-radius:999px;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;">${text}</span>`;

const button = (text: string, href: string, color = '#4f46e5') =>
    `<a href="${href}" style="display:inline-block;margin-top:24px;padding:14px 32px;background:${color};color:#ffffff;border-radius:12px;font-size:13px;font-weight:800;text-decoration:none;letter-spacing:0.5px;">${text}</a>`;

const statBox = (label: string, value: string, color = '#4f46e5') => `
  <td style="text-align:center;padding:16px;background:${color}10;border-radius:12px;">
    <p style="margin:0;font-size:22px;font-weight:900;color:${color};">${value}</p>
    <p style="margin:4px 0 0;font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;">${label}</p>
  </td>
`;

// ─────────────────────────────────────────────
//  SERVER REQUEST HANDLER
// ─────────────────────────────────────────────

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

    const payload = await req.json();
    let { to, type, data } = payload;

    // Map frontend fields `{ type: 'verification', email, name }` to common variables
    if (!to && payload.email) {
      to = payload.email;
    }
    if (!data) {
      data = payload.data || {};
    }
    if (payload.name && !data.name) {
      data.name = payload.name;
    }

    if (!to || !type) {
      return new Response(JSON.stringify({ error: "Missing required fields ('to' or 'type')" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let subject = "SikaAds Togo";
    let htmlContent = "";

    // ─────────────────────────────────────────────
    //  TEMPLATES SELECTION
    // ─────────────────────────────────────────────

    if (type === "verification" || type === "welcome") {
      subject = `Bienvenue sur SikaAds Togo, ${data.name || "Ambassadeur"} ! 🎉`;
      htmlContent = baseLayout(`
        <h2 style="margin:0 0 8px;font-size:22px;font-weight:900;color:#111827;">
          Bienvenue, ${data.name || "Ambassadeur"} ! 🎉
        </h2>
        <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.6;">
          Ton compte <strong>SikaAds Togo</strong> a été créé avec succès. Tu fais maintenant partie de notre réseau d'ambassadeurs !
        </p>

        <table width="100%" cellpadding="8" cellspacing="0">
          <tr>
            ${statBox('Statut', 'Actif ✓', '#10b981')}
            <td width="16"></td>
            ${statBox('Rôle', 'Ambassadeur', '#4f46e5')}
            <td width="16"></td>
            ${statBox('Solde initial', '0 FCFA', '#f59e0b')}
          </tr>
        </table>

        <div style="margin-top:28px;padding:20px;background:#f0fdf4;border-radius:16px;border-left:4px solid #10b981;">
          <p style="margin:0;font-size:13px;font-weight:700;color:#065f46;">🚀 Prochaines étapes</p>
          <ul style="margin:12px 0 0;padding-left:20px;color:#374151;font-size:13px;line-height:2;">
            <li>Parcourir les campagnes disponibles</li>
            <li>Soumettre tes premières preuves de partage</li>
            <li>Gagner des FCFA directement sur ton compte</li>
          </ul>
        </div>

        <div style="text-align:center;">
          ${button('Accéder à mon espace', 'https://www.sika-ads.com/')}
        </div>
      `);
    } else if (type === "campaign_confirmed" || type === "payment_success") {
      subject = `Confirmation de paiement: ${data.campaignTitle}`;
      htmlContent = baseLayout(`
        <div style="text-align:center;margin-bottom:28px;">
          <div style="display:inline-block;background:#d1fae5;border-radius:50%;padding:20px;margin-bottom:16px;">
            <span style="font-size:36px;">💳</span>
          </div>
          <h2 style="margin:0 0 8px;font-size:22px;font-weight:900;color:#111827;">Paiement reçu ! 🎉</h2>
          <p style="margin:0;color:#6b7280;font-size:14px;">Bonjour <strong>${data.advertiserName || "Annonceur"}</strong>,</p>
          <p style="margin:0 0 20px;color:#6b7280;font-size:14px;">Le paiement de votre campagne a été validé avec succès.</p>
        </div>

        <div style="padding:20px;background:#eef2ff;border-radius:16px;margin-bottom:16px;">
          <p style="margin:0;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;">Campagne</p>
          <p style="margin:6px 0 0;font-size:18px;font-weight:900;color:#4f46e5;">${data.campaignTitle}</p>
        </div>

        <table width="100%" cellpadding="8" cellspacing="0" style="margin-bottom:24px;">
          <tr>
            ${statBox('Montant payé', `${Number(data.amount || 0).toLocaleString()} F`, '#10b981')}
            <td width="16"></td>
            ${statBox('Statut', 'Payé & Active', '#10b981')}
          </tr>
        </table>

        <div style="padding:16px;background:#f0fdf4;border-radius:16px;">
          <p style="margin:0;font-size:13px;color:#065f46;line-height:1.6;">
            🚀 Votre campagne est maintenant active et diffusée auprès de nos ambassadeurs.
          </p>
        </div>

        <div style="text-align:center;">
          ${button('Voir mes campagnes', 'https://www.sika-ads.com/app?tab=marketplace#/app/marketplace')}
        </div>
      `);
    } else if (type === "campaign_created") {
      subject = `📣 Votre campagne "${data.campaignTitle}" est en cours de validation`;
      htmlContent = baseLayout(`
        <div style="text-align:center;margin-bottom:28px;">
          <div style="display:inline-block;background:#ede9fe;border-radius:50%;padding:20px;margin-bottom:16px;">
            <span style="font-size:36px;">📣</span>
          </div>
          <h2 style="margin:0 0 8px;font-size:22px;font-weight:900;color:#111827;">Campagne créée !</h2>
          <p style="margin:0;color:#6b7280;font-size:14px;">
            Bonjour ${data.advertiserName || "Annonceur"}, votre campagne est en attente de validation du paiement.
          </p>
        </div>

        <div style="padding:20px;background:#eef2ff;border-radius:16px;margin-bottom:16px;">
          <p style="margin:0;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;">Titre de la campagne</p>
          <p style="margin:6px 0 0;font-size:18px;font-weight:900;color:#4f46e5;">${data.campaignTitle}</p>
        </div>

        <table width="100%" cellpadding="8" cellspacing="0" style="margin-bottom:24px;">
          <tr>
            ${statBox('Budget', `${Number(data.budget || data.amount || 0).toLocaleString()} F`, '#4f46e5')}
            <td width="16"></td>
            ${statBox('Pack', data.pack || 'Standard', '#7c3aed')}
            <td width="16"></td>
            ${statBox('Statut', 'En attente', '#f59e0b')}
          </tr>
        </table>

        <div style="padding:16px;background:#fffbeb;border-radius:16px;">
          <p style="margin:0;font-size:13px;color:#92400e;line-height:1.6;">
            ⏳ Notre équipe vérifiera votre paiement et activera la campagne sous <strong>24h ouvrées</strong>.
            Vous recevrez un email de confirmation dès l'activation.
          </p>
        </div>
      `);
    } else if (type === "withdrawal_request") {
      subject = `💸 Demande de retrait de ${Number(data.amount || 0).toLocaleString()} FCFA reçue`;
      htmlContent = baseLayout(`
        <div style="text-align:center;margin-bottom:28px;">
          <div style="display:inline-block;background:#ede9fe;border-radius:50%;padding:20px;margin-bottom:16px;">
            <span style="font-size:36px;">💸</span>
          </div>
          <h2 style="margin:0 0 8px;font-size:22px;font-weight:900;color:#111827;">Demande de retrait reçue</h2>
          <p style="margin:0;color:#6b7280;font-size:14px;">Bonjour ${data.userName || "Ambassadeur"}, ta demande est en cours de traitement.</p>
        </div>

        <table width="100%" cellpadding="8" cellspacing="0" style="margin-bottom:24px;">
          <tr>
            ${statBox('Montant', `${Number(data.amount || 0).toLocaleString()} F`, '#7c3aed')}
            <td width="16"></td>
            ${statBox('Opérateur', data.provider || 'Mobile Money', '#4f46e5')}
            <td width="16"></td>
            ${statBox('Statut', 'En attente', '#f59e0b')}
          </tr>
        </table>

        <div style="padding:20px;background:#f5f3ff;border-radius:16px;">
          <table width="100%">
            <tr>
              <td style="color:#6b7280;font-size:13px;">Numéro de réception</td>
              <td style="text-align:right;font-weight:800;color:#111827;font-size:13px;">${data.phone || ''}</td>
            </tr>
            <tr>
              <td style="color:#6b7280;font-size:13px;padding-top:10px;">Délai de traitement</td>
              <td style="text-align:right;font-weight:800;color:#111827;font-size:13px;padding-top:10px;">24 à 48h ouvrées</td>
            </tr>
          </table>
        </div>

        <div style="margin-top:20px;padding:16px;background:#fffbeb;border-radius:16px;">
          <p style="margin:0;font-size:13px;color:#92400e;">
            ℹ️ Tu recevras un autre email dès que ton retrait sera traité par notre équipe.
          </p>
        </div>
      `);
    } else if (type === "withdrawal_approved") {
      subject = `🎉 Paiement de ${Number(data.amount || 0).toLocaleString()} FCFA envoyé !`;
      htmlContent = baseLayout(`
        <div style="text-align:center;margin-bottom:28px;">
          <div style="display:inline-block;background:#d1fae5;border-radius:50%;padding:20px;margin-bottom:16px;">
            <span style="font-size:36px;">🎉</span>
          </div>
          <h2 style="margin:0 0 8px;font-size:22px;font-weight:900;color:#111827;">Retrait Envoyé !</h2>
          <p style="margin:0;color:#6b7280;font-size:14px;">Bonjour <strong>${data.userName || "Ambassadeur"}</strong>,</p>
          <p style="margin:0 0 20px;color:#6b7280;font-size:14px;">Votre demande de retrait de <strong>${Number(data.amount || 0).toLocaleString()} FCFA</strong> a été validée et le virement a été effectué vers votre compte <strong>${(data.provider || "").toUpperCase()} (${data.phone || ""})</strong>.</p>
        </div>

        <div style="padding:24px;background:#f0fdf4;border-radius:16px;text-align:center;">
          <p style="margin:0;font-size:32px;font-weight:900;color:#10b981;">
            +${Number(data.amount || 0).toLocaleString()} FCFA
          </p>
          <p style="margin:8px 0 0;font-size:12px;font-weight:700;color:#065f46;text-transform:uppercase;letter-spacing:1px;">
            Paiement envoyé
          </p>
        </div>

        <div style="text-align:center;">
          ${button('Voir mon tableau de bord', 'https://www.sika-ads.com/', '#10b981')}
        </div>
      `);
    } else if (type === "withdrawal_rejected") {
      subject = `⚠️ Retrait de ${Number(data.amount || 0).toLocaleString()} FCFA rejeté`;
      htmlContent = baseLayout(`
        <div style="text-align:center;margin-bottom:28px;">
          <div style="display:inline-block;background:#fee2e2;border-radius:50%;padding:20px;margin-bottom:16px;">
            <span style="font-size:36px;">⚠️</span>
          </div>
          <h2 style="margin:0 0 8px;font-size:22px;font-weight:900;color:#111827;">Retrait Rejeté</h2>
          <p style="margin:0;color:#6b7280;font-size:14px;">Bonjour <strong>${data.userName || "Ambassadeur"}</strong>,</p>
          <p style="margin:0 0 20px;color:#6b7280;font-size:14px;">Votre demande de retrait de <strong>${Number(data.amount || 0).toLocaleString()} FCFA</strong> a été rejetée. Le montant a été recrédité sur votre solde SikaAds.</p>
        </div>

        <div style="padding:24px;background:#fef2f2;border-radius:16px;text-align:center;">
          <p style="margin:0;font-size:32px;font-weight:900;color:#ef4444;">
            ${Number(data.amount || 0).toLocaleString()} FCFA
          </p>
          <p style="margin:8px 0 0;font-size:12px;font-weight:700;color:#991b1b;text-transform:uppercase;letter-spacing:1px;">
            Montant recrédité
          </p>
        </div>

        <div style="text-align:center;">
          ${button('Voir mon tableau de bord', 'https://www.sika-ads.com/', '#4f46e5')}
        </div>
      `);
    } else if (type === "proof_validated") {
      const earnings = Number(data.earnings || 0);
      subject = `✅ Preuve validée · +${earnings.toLocaleString()} FCFA crédités`;
      htmlContent = baseLayout(`
        <div style="text-align:center;margin-bottom:28px;">
          <div style="display:inline-block;background:#d1fae5;border-radius:50%;padding:20px;margin-bottom:16px;">
            <span style="font-size:36px;">✅</span>
          </div>
          <h2 style="margin:0 0 8px;font-size:22px;font-weight:900;color:#111827;">Preuve validée !</h2>
          <p style="margin:0;color:#6b7280;font-size:14px;">Félicitations ${data.userName || "Ambassadeur"}, ta preuve a été approuvée.</p>
        </div>

        <table width="100%" cellpadding="8" cellspacing="0" style="margin-bottom:24px;">
          <tr>
            ${statBox('Vues validées', Number(data.views || 0).toLocaleString(), '#4f46e5')}
            <td width="16"></td>
            ${statBox('Gains crédités', `+${earnings.toLocaleString()} F`, '#10b981')}
          </tr>
        </table>

        <div style="padding:20px;background:#eef2ff;border-radius:16px;">
          <p style="margin:0;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;">Campagne</p>
          <p style="margin:6px 0 0;font-size:16px;font-weight:800;color:#4f46e5;">${data.campaignTitle || "Campagne"}</p>
        </div>

        <div style="text-align:center;">
          ${button('Voir mon solde', 'https://www.sika-ads.com/')}
        </div>
      `);
    } else if (type === "proof_rejected") {
      subject = `❌ Preuve refusée · ${data.campaignTitle || "Campagne"}`;
      htmlContent = baseLayout(`
        <div style="text-align:center;margin-bottom:28px;">
          <div style="display:inline-block;background:#fee2e2;border-radius:50%;padding:20px;margin-bottom:16px;">
            <span style="font-size:36px;">❌</span>
          </div>
          <h2 style="margin:0 0 8px;font-size:22px;font-weight:900;color:#111827;">Preuve refusée</h2>
          <p style="margin:0;color:#6b7280;font-size:14px;">Bonjour ${data.userName || "Ambassadeur"}, ta preuve n'a pas pu être validée.</p>
        </div>

        <div style="padding:20px;background:#eef2ff;border-radius:16px;margin-bottom:16px;">
          <p style="margin:0;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;">Campagne</p>
          <p style="margin:6px 0 0;font-size:16px;font-weight:800;color:#4f46e5;">${data.campaignTitle || "Campagne"}</p>
        </div>

        <div style="padding:20px;background:#fef2f2;border-radius:16px;border-left:4px solid #ef4444;margin-bottom:16px;">
          <p style="margin:0;font-size:12px;font-weight:700;color:#991b1b;text-transform:uppercase;letter-spacing:0.8px;">Motif du refus</p>
          <p style="margin:8px 0 0;font-size:14px;color:#374151;line-height:1.6;">${data.reason || "Non précisé"}</p>
        </div>

        <div style="padding:16px;background:#fffbeb;border-radius:16px;">
          <p style="margin:0;font-size:13px;color:#92400e;line-height:1.6;">
            💡 Tu peux soumettre une nouvelle preuve en t'assurant qu'elle respecte bien les critères de la campagne.
          </p>
        </div>

        <div style="text-align:center;">
          ${button('Soumettre une nouvelle preuve', 'https://www.sika-ads.com/', '#ef4444')}
        </div>
      `);
    } else if (type === "admin_notification") {
      const titles = {
        withdrawal: '💸 Nouvelle demande de retrait',
        campaign: '📣 Nouvelle campagne à valider',
        proof: '🖼 Nouvelle preuve soumise',
      };
      const typeKey = (data.adminNotifType || 'campaign') as 'withdrawal' | 'campaign' | 'proof';
      subject = titles[typeKey] || 'Notification Administration';

      const rows = Object.entries(data.details || {})
        .map(([k, v]) => `
          <tr>
            <td style="padding:8px 0;color:#6b7280;font-size:13px;border-bottom:1px solid #f3f4f6;">${k}</td>
            <td style="padding:8px 0;text-align:right;font-weight:800;color:#111827;font-size:13px;border-bottom:1px solid #f3f4f6;">${v}</td>
          </tr>
        `).join('');

      htmlContent = baseLayout(`
        <div style="display:inline-block;margin-bottom:20px;">${badge(typeKey.toUpperCase(), '#4f46e5')}</div>
        <h2 style="margin:0 0 24px;font-size:20px;font-weight:900;color:#111827;">${titles[typeKey]}</h2>
        <table width="100%" cellpadding="0" cellspacing="0">${rows}</table>
        <div style="text-align:center;">
          ${button('Ouvrir le panel admin', 'https://www.sika-ads.com/')}
        </div>
      `);
    } else if (type === "payment_success") {
      subject = `💳 Paiement confirmé pour votre campagne : ${data.campaignTitle}`;
      htmlContent = baseLayout(`
        <div style="text-align:center;margin-bottom:28px;">
          <div style="display:inline-block;background:#d1fae5;border-radius:50%;padding:20px;margin-bottom:16px;">
            <span style="font-size:36px;">💳</span>
          </div>
          <h2 style="margin:0 0 8px;font-size:22px;font-weight:900;color:#111827;">Paiement reçu ! 🎉</h2>
          <p style="margin:0;color:#6b7280;font-size:14px;">Bonjour ${data.advertiserName || "Annonceur"}, votre paiement a été validé avec succès.</p>
        </div>

        <div style="padding:20px;background:#eef2ff;border-radius:16px;margin-bottom:16px;">
          <p style="margin:0;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;">Campagne</p>
          <p style="margin:6px 0 0;font-size:18px;font-weight:900;color:#4f46e5;">${data.campaignTitle}</p>
        </div>

        <table width="100%" cellpadding="8" cellspacing="0" style="margin-bottom:24px;">
          <tr>
            ${statBox('Montant payé', `${Number(data.amount || 0).toLocaleString()} F`, '#10b981')}
            <td width="16"></td>
            ${statBox('Statut', 'Payé', '#10b981')}
          </tr>
        </table>

        <div style="padding:16px;background:#f0fdf4;border-radius:16px;">
          <p style="margin:0;font-size:13px;color:#065f46;line-height:1.6;">
            🚀 Votre campagne est maintenant en cours d'activation. Nos équipes finalisent la configuration pour 
            garantir une visibilité maximale. Vous recevrez une notification dès qu'elle sera en ligne.
          </p>
        </div>

        <div style="text-align:center;">
          ${button('Voir mes campagnes', 'https://www.sika-ads.com/app?tab=marketplace#/app/marketplace')}
        </div>
      `);
    } else if (type === "payment_failed") {
      subject = `❌ Échec du paiement pour votre campagne : ${data.campaignTitle}`;
      htmlContent = baseLayout(`
        <div style="text-align:center;margin-bottom:28px;">
          <div style="display:inline-block;background:#fee2e2;border-radius:50%;padding:20px;margin-bottom:16px;">
            <span style="font-size:36px;">❌</span>
          </div>
          <h2 style="margin:0 0 8px;font-size:22px;font-weight:900;color:#111827;">Échec du paiement</h2>
          <p style="margin:0;color:#6b7280;font-size:14px;">Bonjour ${data.advertiserName || "Annonceur"}, nous avons rencontré un problème avec votre paiement.</p>
        </div>

        <div style="padding:20px;background:#fef2f2;border-radius:16px;margin-bottom:16px;border-left:4px solid #ef4444;">
          <p style="margin:0;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;">Campagne</p>
          <p style="margin:6px 0 0;font-size:18px;font-weight:900;color:#b91c1c;">${data.campaignTitle}</p>
        </div>

        ${data.error ? `
        <div style="padding:16px;background:#f9fafb;border-radius:12px;margin-bottom:16px;">
          <p style="margin:0;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;">Détails de l'erreur</p>
          <p style="margin:4px 0 0;font-size:14px;color:#374151;">${data.error}</p>
        </div>
        ` : ""}

        <div style="padding:16px;background:#fffbeb;border-radius:16px;">
          <p style="margin:0;font-size:13px;color:#92400e;line-height:1.6;">
            💡 Ne vous inquiétez pas, vous pouvez réessayer le paiement depuis votre tableau de bord. 
            Si le problème persiste, n'hésitez pas à contacter notre support ou votre opérateur.
          </p>
        </div>

        <div style="text-align:center;">
          ${button("Réessayer le paiement", "https://www.sika-ads.com/app?tab=create-campaign#/app/create-campaign", "#ef4444")}
        </div>
      `);
    } else {
      return new Response(JSON.stringify({ error: `Unknown email type: ${type}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fromAddress = Deno.env.get("RESEND_FROM_SECRET") || "onboarding@resend.dev";
    const from = `SikaAds Togo <${fromAddress}>`;

    console.log(`📧 Sending email to ${to} (Subject: ${subject}) via Resend`);

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: from,
        to: [to],
        subject: subject,
        html: htmlContent,
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error("❌ Resend API error:", resendData);
      return new Response(JSON.stringify({ error: "Erreur lors de l'envoi de l'email via Resend API" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, message: "Email envoyé", data: resendData }), {
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
