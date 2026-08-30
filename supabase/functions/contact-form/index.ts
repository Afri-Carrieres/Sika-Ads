import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CONTACT_EMAIL = "team@sika-ads.com";

const TYPES: Record<string, string> = {
  creator: "Créateur de contenu",
  company: "Entreprise / Marque",
  partner: "Partenaire",
  other: "Autre",
};

const SUBJECTS: Record<string, string> = {
  general: "[Contact] Question générale",
  creator: "[Créateur] Demande concernant Sika Ads",
  company: "[Entreprise] Demande concernant Sika Ads",
  account_issue: "[Support] Problème avec mon compte",
  campaign_issue: "[Campagne] Question concernant une campagne",
  payment: "[Paiement] Question concernant une rémunération",
  partnership: "[Partenariat] Proposition de collaboration",
  report: "[Signalement] Problème signalé",
  other: "[Contact] Demande générale",
};

const MAX_MESSAGE = 5000;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Basic rate limiter (per edge instance, best effort)
const rateBuckets = new Map<string, { count: number; resetAt: number }>();
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 5;

const isRateLimited = (ip: string): boolean => {
  const now = Date.now();
  const bucket = rateBuckets.get(ip);
  if (!bucket || bucket.resetAt < now) {
    rateBuckets.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  bucket.count += 1;
  return bucket.count > RATE_MAX;
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const baseLayout = (content: string) => `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background-color:#f4f5f7;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
    <div style="text-align:center;padding-bottom:24px;">
      <span style="font-size:22px;font-weight:900;color:#118a88;letter-spacing:-0.5px;">Sika</span><span style="font-size:22px;font-weight:900;color:#f3661e;letter-spacing:-0.5px;"> Ads</span>
    </div>
    <div style="background-color:#ffffff;border-radius:16px;padding:32px;border:1px solid #e5e7eb;">
      ${content}
    </div>
    <p style="text-align:center;font-size:11px;color:#9ca3af;padding-top:20px;">Lomé, Togo — Sika Ads</p>
  </div>
</body>
</html>`;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Méthode non autorisée." }, 405);
  }

  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") || "unknown";
    if (isRateLimited(ip)) {
      return json({ error: "Trop de demandes récentes. Veuillez réessayer dans quelques minutes." }, 429);
    }

    let payload: Record<string, unknown>;
    try {
      payload = await req.json();
    } catch {
      return json({ error: "Requête invalide." }, 400);
    }

    // Honeypot: silently accept, send nothing
    if (typeof payload.company_website === "string" && payload.company_website.trim() !== "") {
      return json({ ok: true });
    }

    const type = String(payload.type || "");
    const subjectKey = String(payload.subject || "");
    const firstName = String(payload.firstName || "").trim().slice(0, 60);
    const lastName = String(payload.lastName || "").trim().slice(0, 60);
    const email = String(payload.email || "").trim().toLowerCase();
    const message = String(payload.message || "").trim();

    const errors: string[] = [];
    if (!TYPES[type]) errors.push("Type de contact invalide.");
    if (!SUBJECTS[subjectKey]) errors.push("Sujet invalide.");
    if (!firstName) errors.push("Prénom requis.");
    if (!lastName) errors.push("Nom requis.");
    if (!EMAIL_REGEX.test(email) || email.length > 254) errors.push("Email invalide.");
    if (!message) errors.push("Message requis.");
    if (message.length > MAX_MESSAGE) errors.push("Message trop long.");
    if (errors.length) {
      return json({ error: "Veuillez vérifier les informations saisies." }, 400);
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY_SECRET");
    if (!resendApiKey) {
      console.error("contact-form: RESEND_API_KEY_SECRET non configurée");
      return json({ error: "Le service de contact est temporairement indisponible." }, 500);
    }
    let rawFrom = (Deno.env.get("RESEND_FROM_SECRET") || "onboarding@resend.dev").trim();
    const from = rawFrom.includes("<") ? rawFrom : `Sika Ads <${rawFrom}>`;
    const subject = SUBJECTS[subjectKey];

    const sendViaResend = async (to: string, subj: string, html: string) => {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from, to: [to], subject: subj, html }),
      });
      if (!res.ok) {
        const detail = await res.text();
        console.error("Resend error", res.status, detail);
        throw new Error("Resend delivery failed");
      }
    };

    const now = new Date().toLocaleString("fr-FR", { timeZone: "Africa/Lome" });
    const adminHtml = baseLayout(`
      <h2 style="margin:0 0 20px;font-size:18px;color:#0f172a;">Nouveau message depuis Sika Ads</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px;color:#334155;">
        <tr><td style="padding:8px 0;font-weight:bold;color:#0f172a;width:140px;">Type</td><td style="padding:8px 0;">${escapeHtml(TYPES[type])}</td></tr>
        <tr><td style="padding:8px 0;font-weight:bold;color:#0f172a;">Sujet</td><td style="padding:8px 0;">${escapeHtml(SUBJECTS[subjectKey])}</td></tr>
        <tr><td style="padding:8px 0;font-weight:bold;color:#0f172a;">Nom</td><td style="padding:8px 0;">${escapeHtml(firstName)} ${escapeHtml(lastName)}</td></tr>
        <tr><td style="padding:8px 0;font-weight:bold;color:#0f172a;">Email</td><td style="padding:8px 0;"><a href="mailto:${escapeHtml(email)}" style="color:#118a88;">${escapeHtml(email)}</a></td></tr>
        <tr><td style="padding:8px 0;font-weight:bold;color:#0f172a;">Date</td><td style="padding:8px 0;">${escapeHtml(now)}</td></tr>
      </table>
      <div style="margin-top:20px;padding:16px;background-color:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;">
        <p style="margin:0 0 8px;font-weight:bold;color:#0f172a;font-size:13px;">Message</p>
        <p style="margin:0;white-space:pre-wrap;line-height:1.6;color:#334155;">${escapeHtml(message)}</p>
      </div>`);

    await sendViaResend(CONTACT_EMAIL, subject, adminHtml);

    const replyHtml = baseLayout(`
      <h2 style="margin:0 0 16px;font-size:18px;color:#0f172a;">Nous avons bien reçu votre message</h2>
      <p style="font-size:14px;line-height:1.7;color:#334155;">Bonjour ${escapeHtml(firstName)},</p>
      <p style="font-size:14px;line-height:1.7;color:#334155;">Nous avons bien reçu votre message. Notre équipe va prendre connaissance de votre demande et vous répondra à l'adresse :</p>
      <p style="font-size:14px;font-weight:bold;color:#118a88;">${escapeHtml(email)}</p>
      <p style="font-size:14px;line-height:1.7;color:#334155;">Merci d'avoir contacté Sika Ads.</p>
      <p style="font-size:14px;color:#334155;">L'équipe Sika Ads</p>`);

    // Best-effort auto-reply: a failure here must not fail the request
    sendViaResend(email, "Nous avons bien reçu votre message — Sika Ads", replyHtml).catch((err) =>
      console.error("contact-form: auto-reply failed", err)
    );

    return json({ ok: true });
  } catch (err) {
    console.error("contact-form error", err);
    return json({ error: "Une erreur est survenue. Veuillez réessayer." }, 500);
  }
});
