import {defineSecret} from "firebase-functions/params";
import {Resend} from "resend";
import * as logger from "firebase-functions/logger";

export const RESEND_API_KEY_SECRET = defineSecret("RESEND_API_KEY_SECRET");
export const RESEND_FROM_SECRET = defineSecret("RESEND_FROM_SECRET");

let resendClient: Resend | null = null;

// ─────────────────────────────────────────────
//  CONFIGURATION & VALIDATION
// ─────────────────────────────────────────────

function validateConfig() {
    const apiKey = RESEND_API_KEY_SECRET.value();
    const fromAddress = RESEND_FROM_SECRET.value();

    if (!apiKey) {
        logger.error("❌ RESEND_API_KEY_SECRET not defined in secrets!");
        throw new Error("RESEND_API_KEY_SECRET not defined");
    }

    if (!fromAddress) {
        logger.warn("⚠️  RESEND_FROM_SECRET not defined, using default: no-reply@sikaads.app");
    }

    logger.info("✅ Resend configuration validated", {
        apiKeySet: !!apiKey,
        fromAddress: fromAddress || "no-reply@sikaads.app",
    });
}

function getResendClient() {
    if (resendClient) return resendClient;

    validateConfig();
    const apiKey = RESEND_API_KEY_SECRET.value();
    if (!apiKey) throw new Error("RESEND_API_KEY_SECRET is undefined");

    resendClient = new Resend(apiKey);
    logger.info("✅ Resend client initialized");
    return resendClient;
}

function getFromAddress() {
    // ✅ Utiliser onboarding@resend.dev pour les tests (domaine par défaut Resend)
    // Tant que sikaads.app n'est pas vérifié sur Resend, utilisez: onboarding@resend.dev
    const from = RESEND_FROM_SECRET.value();
    const address = from.includes("sikaads.app") ? "onboarding@resend.dev" : (from || "onboarding@resend.dev");

    return `SikaAds Togo <${address}>`;
}

// ─────────────────────────────────────────────
//  RETRY HELPER
// ─────────────────────────────────────────────

async function sendEmailWithRetry(
    to: string,
    subject: string,
    html: string,
    maxRetries = 3
) {
    const client = getResendClient();
    let lastError: unknown = "";

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            logger.info(`📧 Sending email (attempt ${attempt}/${maxRetries})`, {
                to,
                subject,
                from: getFromAddress(),
            });

            const response = await client.emails.send({
                from: getFromAddress(),
                to,
                subject,
                html,
            });

            if (response.error) {
                throw new Error(`Resend API error: ${JSON.stringify(response.error)}`);
            }

            logger.info("✅ Email sent successfully", {
                to,
                subject,
                emailId: response.data?.id,
            });

            return response;
        } catch (error) {
            lastError = error;
            logger.warn(`⚠️  Email send failed (attempt ${attempt}/${maxRetries})`, {
                to,
                subject,
                error: error instanceof Error ? error.message : String(error),
            });

            if (attempt < maxRetries) {
                // Wait before retry (exponential backoff)
                const delay = Math.pow(2, attempt) * 1000;
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }
    }

    throw new Error(`Failed to send email after ${maxRetries} attempts: ${lastError}`);
}

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
//  1. CONFIRMATION D'INSCRIPTION
// ─────────────────────────────────────────────
export const sendWelcomeEmail = async (to: string, name: string) => {
    const html = baseLayout(`
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:900;color:#111827;">
      Bienvenue, ${name} ! 🎉
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
      ${button('Accéder à mon espace', 'https://sikaads-7b9bc.web.app/dashboard')}
    </div>
  `);

    return sendEmailWithRetry(
        to,
        `Bienvenue sur SikaAds Togo, ${name} ! 🎉`,
        html
    );
};

// ─────────────────────────────────────────────
//  2. VALIDATION DE PREUVE
// ─────────────────────────────────────────────
export const sendProofValidatedEmail = async (
    to: string,
    name: string,
    campaignTitle: string,
    views: number,
    earnings: number
) => {
    const html = baseLayout(`
    <div style="text-align:center;margin-bottom:28px;">
      <div style="display:inline-block;background:#d1fae5;border-radius:50%;padding:20px;margin-bottom:16px;">
        <span style="font-size:36px;">✅</span>
      </div>
      <h2 style="margin:0 0 8px;font-size:22px;font-weight:900;color:#111827;">Preuve validée !</h2>
      <p style="margin:0;color:#6b7280;font-size:14px;">Félicitations ${name}, ta preuve a été approuvée.</p>
    </div>

    <table width="100%" cellpadding="8" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        ${statBox('Vues validées', views.toLocaleString(), '#4f46e5')}
        <td width="16"></td>
        ${statBox('Gains crédités', `+${earnings.toLocaleString()} F`, '#10b981')}
      </tr>
    </table>

    <div style="padding:20px;background:#eef2ff;border-radius:16px;">
      <p style="margin:0;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;">Campagne</p>
      <p style="margin:6px 0 0;font-size:16px;font-weight:800;color:#4f46e5;">${campaignTitle}</p>
    </div>

    <div style="text-align:center;">
      ${button('Voir mon solde', 'https://sikaads-7b9bc.web.app/dashboard')}
    </div>
  `);

    return sendEmailWithRetry(
        to,
        `✅ Preuve validée · +${earnings.toLocaleString()} FCFA crédités`,
        html
    );
};

// ─────────────────────────────────────────────
//  3. REJET DE PREUVE
// ─────────────────────────────────────────────
export const sendProofRejectedEmail = async (
    to: string,
    name: string,
    campaignTitle: string,
    reason: string
) => {
    const html = baseLayout(`
    <div style="text-align:center;margin-bottom:28px;">
      <div style="display:inline-block;background:#fee2e2;border-radius:50%;padding:20px;margin-bottom:16px;">
        <span style="font-size:36px;">❌</span>
      </div>
      <h2 style="margin:0 0 8px;font-size:22px;font-weight:900;color:#111827;">Preuve refusée</h2>
      <p style="margin:0;color:#6b7280;font-size:14px;">Bonjour ${name}, ta preuve n'a pas pu être validée.</p>
    </div>

    <div style="padding:20px;background:#eef2ff;border-radius:16px;margin-bottom:16px;">
      <p style="margin:0;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;">Campagne</p>
      <p style="margin:6px 0 0;font-size:16px;font-weight:800;color:#4f46e5;">${campaignTitle}</p>
    </div>

    <div style="padding:20px;background:#fef2f2;border-radius:16px;border-left:4px solid #ef4444;">
      <p style="margin:0;font-size:12px;font-weight:700;color:#991b1b;text-transform:uppercase;letter-spacing:0.8px;">Motif du refus</p>
      <p style="margin:8px 0 0;font-size:14px;color:#374151;line-height:1.6;">${reason}</p>
    </div>

    <div style="margin-top:20px;padding:16px;background:#fffbeb;border-radius:16px;">
      <p style="margin:0;font-size:13px;color:#92400e;line-height:1.6;">
        💡 Tu peux soumettre une nouvelle preuve en t'assurant qu'elle respecte bien les critères de la campagne.
      </p>
    </div>

    <div style="text-align:center;">
      ${button('Soumettre une nouvelle preuve', 'https://sikaads-7b9bc.web.app/dashboard', '#ef4444')}
    </div>
  `);

    return sendEmailWithRetry(
        to,
        `❌ Preuve refusée · ${campaignTitle}`,
        html
    );
};

// ─────────────────────────────────────────────
//  4. DEMANDE DE RETRAIT
// ─────────────────────────────────────────────
export const sendWithdrawalRequestEmail = async (
    to: string,
    name: string,
    amount: number,
    provider: string,
    phone: string
) => {
    const html = baseLayout(`
    <div style="text-align:center;margin-bottom:28px;">
      <div style="display:inline-block;background:#ede9fe;border-radius:50%;padding:20px;margin-bottom:16px;">
        <span style="font-size:36px;">💸</span>
      </div>
      <h2 style="margin:0 0 8px;font-size:22px;font-weight:900;color:#111827;">Demande de retrait reçue</h2>
      <p style="margin:0;color:#6b7280;font-size:14px;">Bonjour ${name}, ta demande est en cours de traitement.</p>
    </div>

    <table width="100%" cellpadding="8" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        ${statBox('Montant', `${amount.toLocaleString()} F`, '#7c3aed')}
        <td width="16"></td>
        ${statBox('Opérateur', provider, '#4f46e5')}
        <td width="16"></td>
        ${statBox('Statut', 'En attente', '#f59e0b')}
      </tr>
    </table>

    <div style="padding:20px;background:#f5f3ff;border-radius:16px;">
      <table width="100%">
        <tr>
          <td style="color:#6b7280;font-size:13px;">Numéro de réception</td>
          <td style="text-align:right;font-weight:800;color:#111827;font-size:13px;">${phone}</td>
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

    return sendEmailWithRetry(
        to,
        `💸 Demande de retrait de ${amount.toLocaleString()} FCFA reçue`,
        html
    );
};

// ─────────────────────────────────────────────
//  5. RETRAIT VALIDÉ / REJETÉ
// ─────────────────────────────────────────────
export const sendWithdrawalStatusEmail = async (
    to: string,
    name: string,
    amount: number,
    status: 'completed' | 'failed'
) => {
    const isOk = status === 'completed';
    const html = baseLayout(`
    <div style="text-align:center;margin-bottom:28px;">
      <div style="display:inline-block;background:${isOk ? '#d1fae5' : '#fee2e2'};border-radius:50%;padding:20px;margin-bottom:16px;">
        <span style="font-size:36px;">${isOk ? '🎉' : '⚠️'}</span>
      </div>
      <h2 style="margin:0 0 8px;font-size:22px;font-weight:900;color:#111827;">
        Retrait ${isOk ? 'effectué' : 'rejeté'}
      </h2>
      <p style="margin:0;color:#6b7280;font-size:14px;">
        ${isOk
            ? `Bonjour ${name}, ton paiement de ${amount.toLocaleString()} FCFA a été envoyé avec succès.`
            : `Bonjour ${name}, ton retrait n'a pas pu être traité. Le montant a été recrédité sur ton solde.`
        }
      </p>
    </div>

    <div style="padding:24px;background:${isOk ? '#f0fdf4' : '#fef2f2'};border-radius:16px;text-align:center;">
      <p style="margin:0;font-size:32px;font-weight:900;color:${isOk ? '#10b981' : '#ef4444'};">
        ${isOk ? '+' : ''}${amount.toLocaleString()} FCFA
      </p>
      <p style="margin:8px 0 0;font-size:12px;font-weight:700;color:${isOk ? '#065f46' : '#991b1b'};text-transform:uppercase;letter-spacing:1px;">
        ${isOk ? 'Paiement envoyé' : 'Montant recrédité'}
      </p>
    </div>

    <div style="text-align:center;">
      ${button('Voir mon tableau de bord', 'https://sikaads-7b9bc.web.app/dashboard', isOk ? '#10b981' : '#4f46e5')}
    </div>
  `);

    return sendEmailWithRetry(
        to,
        isOk
            ? `🎉 Paiement de ${amount.toLocaleString()} FCFA envoyé !`
            : `⚠️ Retrait de ${amount.toLocaleString()} FCFA rejeté`,
        html
    );
};

// ─────────────────────────────────────────────
//  6. CRÉATION DE CAMPAGNE (confirmation annonceur)
// ─────────────────────────────────────────────
export const sendCampaignCreatedEmail = async (
    to: string,
    advertiserName: string,
    campaignTitle: string,
    budget: number,
    pack: string
) => {
    const html = baseLayout(`
    <div style="text-align:center;margin-bottom:28px;">
      <div style="display:inline-block;background:#ede9fe;border-radius:50%;padding:20px;margin-bottom:16px;">
        <span style="font-size:36px;">📣</span>
      </div>
      <h2 style="margin:0 0 8px;font-size:22px;font-weight:900;color:#111827;">Campagne créée !</h2>
      <p style="margin:0;color:#6b7280;font-size:14px;">
        Bonjour ${advertiserName}, votre campagne est en attente de validation du paiement.
      </p>
    </div>

    <div style="padding:20px;background:#eef2ff;border-radius:16px;margin-bottom:16px;">
      <p style="margin:0;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;">Titre de la campagne</p>
      <p style="margin:6px 0 0;font-size:18px;font-weight:900;color:#4f46e5;">${campaignTitle}</p>
    </div>

    <table width="100%" cellpadding="8" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        ${statBox('Budget', `${budget.toLocaleString()} F`, '#4f46e5')}
        <td width="16"></td>
        ${statBox('Pack', pack, '#7c3aed')}
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

    return sendEmailWithRetry(
        to,
        `📣 Votre campagne "${campaignTitle}" est en cours de validation`,
        html
    );
};

// ─────────────────────────────────────────────
//  7. NOTIFICATION ADMIN (nouvelle demande)
// ─────────────────────────────────────────────
export const sendAdminNotificationEmail = async (
    adminEmail: string,
    type: 'withdrawal' | 'campaign' | 'proof',
    details: Record<string, string | number>
) => {
    const titles = {
        withdrawal: '💸 Nouvelle demande de retrait',
        campaign: '📣 Nouvelle campagne à valider',
        proof: '🖼 Nouvelle preuve soumise',
    };

    const rows = Object.entries(details)
        .map(([k, v]) => `
      <tr>
        <td style="padding:8px 0;color:#6b7280;font-size:13px;border-bottom:1px solid #f3f4f6;">${k}</td>
        <td style="padding:8px 0;text-align:right;font-weight:800;color:#111827;font-size:13px;border-bottom:1px solid #f3f4f6;">${v}</td>
      </tr>
    `).join('');

    const html = baseLayout(`
    <div style="display:inline-block;margin-bottom:20px;">${badge(type.toUpperCase(), '#4f46e5')}</div>
    <h2 style="margin:0 0 24px;font-size:20px;font-weight:900;color:#111827;">${titles[type]}</h2>
    <table width="100%" cellpadding="0" cellspacing="0">${rows}</table>
    <div style="text-align:center;">
      ${button('Ouvrir le panel admin', 'https://sikaads-7b9bc.web.app/admin')}
    </div>
  `);

    return sendEmailWithRetry(
        adminEmail,
        titles[type],
        html
    );
};

// ─────────────────────────────────────────────
//  8. RÉINITIALISATION DE MOT DE PASSE (custom)
// ─────────────────────────────────────────────
export const sendPasswordResetEmail = async (to: string, name: string, link: string) => {
    const html = baseLayout(`
    <div style="text-align:center;margin-bottom:28px;">
      <div style="display:inline-block;background:#ede9fe;border-radius:50%;padding:20px;margin-bottom:16px;">
        <span style="font-size:36px;">🔐</span>
      </div>
      <h2 style="margin:0 0 8px;font-size:22px;font-weight:900;color:#111827;">Réinitialisation du mot de passe</h2>
      <p style="margin:0;color:#6b7280;font-size:14px;">Bonjour ${name}, vous avez demandé à réinitialiser votre mot de passe SikaAds.</p>
    </div>

    <div style="padding:24px;background:#f9fafb;border-radius:16px;text-align:center;">
      <p style="margin:0;color:#4b5563;font-size:15px;line-height:1.6;">
        Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe. 
        Ce lien expirera bientôt pour votre sécurité.
      </p>
      
      <div style="text-align:center;margin-top:12px;">
        ${button('Choisir un nouveau mot de passe', link, '#4f46e5')}
      </div>
    </div>

    <div style="margin-top:20px;padding:16px;background:#fffbeb;border-radius:16px;">
      <p style="margin:0;font-size:13px;color:#92400e;">
        ℹ️ Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email en toute sécurité. 
        Votre mot de passe actuel restera inchangé.
      </p>
    </div>
  `);

    return sendEmailWithRetry(
        to,
        `🔐 Réinitialisation de votre mot de passe SikaAds`,
        html
    );
};

// ─────────────────────────────────────────────
//  9. PAIEMENT RÉUSSI (annonçeur)
// ─────────────────────────────────────────────
export const sendPaymentSuccessEmail = async (
    to: string,
    name: string,
    campaignTitle: string,
    amount: number
) => {
    const html = baseLayout(`
    <div style="text-align:center;margin-bottom:28px;">
      <div style="display:inline-block;background:#d1fae5;border-radius:50%;padding:20px;margin-bottom:16px;">
        <span style="font-size:36px;">💳</span>
      </div>
      <h2 style="margin:0 0 8px;font-size:22px;font-weight:900;color:#111827;">Paiement reçu ! 🎉</h2>
      <p style="margin:0;color:#6b7280;font-size:14px;">Bonjour ${name}, votre paiement a été validé avec succès.</p>
    </div>

    <div style="padding:20px;background:#eef2ff;border-radius:16px;margin-bottom:16px;">
      <p style="margin:0;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;">Campagne</p>
      <p style="margin:6px 0 0;font-size:18px;font-weight:900;color:#4f46e5;">${campaignTitle}</p>
    </div>

    <table width="100%" cellpadding="8" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        ${statBox('Montant payé', `${amount.toLocaleString()} F`, '#10b981')}
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
      ${button('Voir mes campagnes', 'https://sikaads-7b9bc.web.app/dashboard')}
    </div>
  `);

    return sendEmailWithRetry(
        to,
        `💳 Paiement confirmé pour votre campagne : ${campaignTitle}`,
        html
    );
};

// ─────────────────────────────────────────────
//  10. VÉRIFICATION D'EMAIL (custom)
// ─────────────────────────────────────────────
export const sendEmailVerificationEmail = async (to: string, name: string, link: string) => {
    const html = baseLayout(`
    <div style="text-align:center;margin-bottom:28px;">
      <div style="display:inline-block;background:#ede9fe;border-radius:50%;padding:20px;margin-bottom:16px;">
        <span style="font-size:36px;">✉️</span>
      </div>
      <h2 style="margin:0 0 8px;font-size:22px;font-weight:900;color:#111827;">Confirmez votre adresse email</h2>
      <p style="margin:0;color:#6b7280;font-size:14px;">Bienvenue sur SikaAds, ${name} !</p>
    </div>

    <div style="padding:24px;background:#f9fafb;border-radius:16px;text-align:center;">
      <p style="margin:0;color:#4b5563;font-size:15px;line-height:1.6;">
        Pour finaliser la création de votre compte et accéder à toutes nos fonctionnalités, 
        veuillez confirmer votre adresse email en cliquant sur le bouton ci-dessous.
      </p>
      
      <div style="text-align:center;margin-top:12px;">
        ${button('Confirmer mon adresse email', link, '#4f46e5')}
      </div>
    </div>

    <div style="margin-top:20px;padding:16px;background:#fffbeb;border-radius:16px;">
      <p style="margin:0;font-size:13px;color:#92400e;">
        ℹ️ Ce lien est valable pour une durée limitée. Si vous n'avez pas créé de compte sur SikaAds Togo, 
        vous pouvez ignorer cet email.
      </p>
    </div>
  `);

    return sendEmailWithRetry(
        to,
        `✉️ Confirmez votre adresse email SikaAds`,
        html
    );
};
// ─────────────────────────────────────────────
//  11. ÉCHEC DE PAIEMENT (annonçeur)
// ─────────────────────────────────────────────
export const sendPaymentFailedEmail = async (
    to: string,
    name: string,
    campaignTitle: string,
    error?: string
) => {
    const html = baseLayout(`
    <div style="text-align:center;margin-bottom:28px;">
      <div style="display:inline-block;background:#fee2e2;border-radius:50%;padding:20px;margin-bottom:16px;">
        <span style="font-size:36px;">❌</span>
      </div>
      <h2 style="margin:0 0 8px;font-size:22px;font-weight:900;color:#111827;">Échec du paiement</h2>
      <p style="margin:0;color:#6b7280;font-size:14px;">Bonjour ${name}, nous avons rencontré un problème avec votre paiement.</p>
    </div>

    <div style="padding:20px;background:#fef2f2;border-radius:16px;margin-bottom:16px;border-left:4px solid #ef4444;">
      <p style="margin:0;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;">Campagne</p>
      <p style="margin:6px 0 0;font-size:18px;font-weight:900;color:#b91c1c;">${campaignTitle}</p>
    </div>

    ${error ? `
    <div style="padding:16px;background:#f9fafb;border-radius:12px;margin-bottom:16px;">
      <p style="margin:0;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;">Détails de l'erreur</p>
      <p style="margin:4px 0 0;font-size:14px;color:#374151;">${error}</p>
    </div>
    ` : ""}

    <div style="padding:16px;background:#fffbeb;border-radius:16px;">
      <p style="margin:0;font-size:13px;color:#92400e;line-height:1.6;">
        💡 Ne vous inquiétez pas, vous pouvez réessayer le paiement depuis votre tableau de bord. 
        Si le problème persiste, n'hésitez pas à contacter notre support ou votre opérateur.
      </p>
    </div>

    <div style="text-align:center;">
      ${button("Réessayer le paiement", "https://sikaads-7b9bc.web.app/dashboard", "#ef4444")}
    </div>
  `);

    return sendEmailWithRetry(
        to,
        `❌ Échec du paiement pour votre campagne : ${campaignTitle}`,
        html
    );
};
