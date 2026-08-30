# Contact Page + Multistep Form — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a native-feeling `/contact` page to Sika Ads with a 4-step premium form that emails `team@sika-ads.com` (dynamic subject per topic) plus an auto-reply, with server-side validation and anti-spam.

**Architecture:** Vite + React SPA (NOT Next.js). Routing is a `parsePathname` whitelist + view switch in root `App.tsx`; content pages own their header and render `components/Footer.tsx`. Email is delivered by a NEW Supabase Edge Function `contact-form` that reuses the exact same Resend provider + secrets (`RESEND_API_KEY_SECRET`, `RESEND_FROM_SECRET`) as the existing `send-email` function (send-email takes an arbitrary `to` from the caller and cannot be safely exposed to a public form; contact-form hardcodes the recipient and adds validation, honeypot, rate limiting, HTML escaping). Frontend mirrors `views/AboutView.tsx` (fixed header + MobileDrawer + slate-950 hero + SEOHead + Footer) and `views/TermsView.tsx` (bottom CTA), with form recipes from `views/LoginView.tsx`.

**Tech Stack:** React 18 + TS, react-router-dom v7 (view-state routing), Tailwind 3.4 (raw utility classes, no UI kit), lucide-react icons, Supabase JS `functions.invoke`, Resend REST API from Deno edge runtime. No new dependencies.

## Global Constraints

- Official contact email: `team@sika-ads.com`. Official location display: `Lomé, Togo`. NEVER invent phone, hours, socials, postal address beyond what already exists in the repo.
- Do NOT reuse or modify `supabase/functions/send-email` (keep it untouched for transactional flows).
- Secrets NEVER in frontend code; edge function reads `Deno.env.get("RESEND_API_KEY_SECRET")` / `RESEND_FROM_SECRET`.
- Typography: `font-heading` (Space Grotesk) for H1/H2/step titles, Inter (`font-body`/sans) for everything else. Brand colors in use: hero `bg-slate-950`, CTA orange `#f55d05`/`#ea580c`, teal accents `#128785`/`#118a88`, secondary indigo `indigo-600`. No new palette.
- Site is French-only (no i18n layer) — all copy in French, hardcoded like every other view.
- All views render their OWN header (shared `components/Header.tsx` is commented out in App.tsx); do not re-enable it.
- No test framework exists. Verification = `npm run build` succeeds AND `npx tsc --noEmit` shows no NEW errors (baseline: pre-existing errors ONLY in `views/updateInComming.jsx`).
- Message max length: 5000 chars, with live `0 / 5000` counter.
- Step state must persist when navigating back; errors only after the user attempts an action.
- Do not modify homepage/dashboard/campaign/payment/auth/profile logic except: `App.tsx` routing wiring and `Footer.tsx`/`AboutView.tsx`/`LegalView.tsx`/`TermsView.tsx` prop-union widening (add `'contact'`).
- Commits: use `git add <specific files>` + conventional messages (`feat: ...`), matching repo style.

---

### Task 1: Supabase Edge Function `contact-form` (backend, email delivery, anti-spam)

**Files:**
- Create: `supabase/functions/contact-form/index.ts`

**Interfaces:**
- Consumes: Supabase project secrets `RESEND_API_KEY_SECRET`, `RESEND_FROM_SECRET` (already used by `send-email`); Resend REST `https://api.resend.com/emails`.
- Produces: HTTP endpoint invoked as `supabase.functions.invoke('contact-form', { body: ContactFormPayload })` returning JSON `{"ok": true}` on success or `{"error": "<french message>"}` with 4xx on validation failure. Payload type:

```ts
{
  type: 'creator' | 'company' | 'partner' | 'other'
  subject: 'general' | 'creator' | 'company' | 'account_issue' | 'campaign_issue' | 'payment' | 'partnership' | 'report' | 'other'
  firstName: string
  lastName: string
  email: string
  message: string
  company_website?: string   // honeypot, must stay empty
}
```

- [ ] **Step 1: Create the edge function**

Write `supabase/functions/contact-form/index.ts` with EXACTLY this content:

```ts
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
```

- [ ] **Step 2: Sanity-check it does not break the frontend build**

Run: `npm run build`
Expected: SUCCESS (the `supabase/` folder is not compiled by Vite — this just confirms nothing leaked).

- [ ] **Step 3: Commit**

```powershell
git add supabase/functions/contact-form/index.ts
git commit -m "feat(contact): add contact-form edge function with resend delivery, honeypot + rate limiting"
```

**Deploy note (report to user at the end, do NOT run):** `supabase functions deploy contact-form` — uses the already-configured `RESEND_API_KEY_SECRET` / `RESEND_FROM_SECRET` project secrets.

---

### Task 2: `views/ContactView.tsx` — page + multistep form

**Files:**
- Create: `views/ContactView.tsx`

**Interfaces:**
- Consumes: `Footer`, `SEOHead`, `MobileDrawer` (relative imports `../components/...`); `supabase` named export from `../supabase`; Task 1 endpoint `contact-form` with the payload shape above.
- Produces: `ContactView` default export with props `{ onNavigate: (view: 'landing' | 'about' | 'legal' | 'terms' | 'contact') => void; onStart?: () => void }`.

- [ ] **Step 1: Add a `functions` stub to the dev fallback client**

Edit `supabase.ts`: inside the `supabaseClient = {` stub object (the fallback used when env vars are missing), add a `functions` key so `supabase.functions.invoke` never throws a TypeError:

```ts
    supabaseClient = {
        auth: authStub,
        from: fromStub,
        channel: channelStub,
        removeChannel: (_c: any) => {},
        functions: {
            invoke: async () => ({ data: null, error: new Error('Supabase not configured') }),
        },
        storage: {
            from: () => ({ getPublicUrl: () => ({ publicURL: '' }) }),
        },
    };
```

- [ ] **Step 2: Create `views/ContactView.tsx`**

Write the file with EXACTLY this content:

```tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building2,
  Camera,
  Check,
  CheckCircle2,
  Compass,
  Handshake,
  Loader2,
  LogInIcon,
  Mail,
  MapPin,
  Menu,
  Pencil,
  Send,
} from 'lucide-react';
import Footer from '../components/Footer';
import SEOHead from '../components/SEOHead';
import MobileDrawer from '../components/MobileDrawer';
import { supabase } from '../supabase';

export type ContactViewName = 'landing' | 'about' | 'legal' | 'terms' | 'contact';

interface ContactViewProps {
  onNavigate: (view: ContactViewName) => void;
  onStart?: () => void;
}

type ContactType = 'creator' | 'company' | 'partner' | 'other';
type ContactSubject =
  | 'general'
  | 'creator'
  | 'company'
  | 'account_issue'
  | 'campaign_issue'
  | 'payment'
  | 'partnership'
  | 'report'
  | 'other';

interface FormState {
  type: ContactType | '';
  subject: ContactSubject | '';
  firstName: string;
  lastName: string;
  email: string;
  message: string;
}

interface FieldErrors {
  type?: string;
  subject?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  message?: string;
}

const CONTACT_TYPES: { id: ContactType; label: string; description: string; icon: React.FC<{ size?: number; className?: string }> }[] = [
  { id: 'creator', label: 'Créateur de contenu', description: 'Vous monétisez vos réseaux sociaux ou vous souhaitez commencer.', icon: Camera },
  { id: 'company', label: 'Entreprise / Marque', description: 'Vous voulez promouvoir vos produits ou services.', icon: Building2 },
  { id: 'partner', label: 'Partenaire', description: 'Vous envisagez une collaboration avec Sika Ads.', icon: Handshake },
  { id: 'other', label: 'Autre', description: 'Tout simplement une question ou une idée à partager.', icon: Compass },
];

const SUBJECTS: { id: ContactSubject; label: string }[] = [
  { id: 'general', label: 'Question générale' },
  { id: 'creator', label: 'Je suis créateur' },
  { id: 'company', label: 'Je suis une entreprise / marque' },
  { id: 'account_issue', label: 'Problème avec mon compte' },
  { id: 'campaign_issue', label: 'Problème avec une campagne' },
  { id: 'payment', label: 'Paiement / rémunération' },
  { id: 'partnership', label: 'Partenariat' },
  { id: 'report', label: 'Signaler un problème' },
  { id: 'other', label: 'Autre' },
];

const STEPS = [
  { id: 1, label: 'Vous' },
  { id: 2, label: 'Sujet' },
  { id: 3, label: 'Coordonnées' },
  { id: 4, label: 'Message' },
];

const MAX_MESSAGE = 5000;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const typeLabel = (t: ContactType | '') => CONTACT_TYPES.find((c) => c.id === t)?.label || '—';
const subjectLabel = (s: ContactSubject | '') => SUBJECTS.find((c) => c.id === s)?.label || '—';

const ContactView: React.FC<ContactViewProps> = ({ onNavigate, onStart }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>({
    type: '',
    subject: '',
    firstName: '',
    lastName: '',
    email: '',
    message: '',
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [submitError, setSubmitError] = useState<string>('');
  const honeypotRef = useRef<HTMLInputElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Move focus to the step heading on step change (a11y)
  useEffect(() => {
    headingRef.current?.focus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validateStep = (s: number): FieldErrors => {
    const e: FieldErrors = {};
    if (s === 1 && !form.type) e.type = 'Veuillez sélectionner une option.';
    if (s === 2 && !form.subject) e.subject = 'Veuillez sélectionner un sujet.';
    if (s === 3) {
      if (!form.firstName.trim()) e.firstName = 'Veuillez saisir votre prénom.';
      if (!form.lastName.trim()) e.lastName = 'Veuillez saisir votre nom.';
      if (!form.email.trim()) e.email = 'Veuillez saisir votre adresse email.';
      else if (!EMAIL_REGEX.test(form.email.trim())) e.email = 'Cette adresse email ne semble pas valide.';
    }
    if (s === 4) {
      if (!form.message.trim()) e.message = 'Veuillez décrire votre demande.';
      else if (form.message.length > MAX_MESSAGE) e.message = `Votre message ne peut pas dépasser ${MAX_MESSAGE} caractères.`;
    }
    return e;
  };

  const handleNext = () => {
    const e = validateStep(step);
    setErrors(e);
    if (Object.keys(e).length === 0) setStep((s) => Math.min(s + 1, 4));
  };

  const handleBack = () => setStep((s) => Math.max(s - 1, 1));

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const e = validateStep(4);
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    setStatus('loading');
    setSubmitError('');
    try {
      const { error } = await supabase.functions.invoke('contact-form', {
        body: {
          type: form.type,
          subject: form.subject,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          message: form.message.trim(),
          company_website: honeypotRef.current?.value || '',
        },
      });
      if (error) throw error;
      setStatus('success');
    } catch (err) {
      console.error('Contact form submission failed:', err);
      setStatus('error');
      setSubmitError('Une erreur est survenue. Vérifiez vos informations et réessayez.');
    }
  };

  const resetForm = () => {
    setForm({ type: '', subject: '', firstName: '', lastName: '', email: '', message: '' });
    setErrors({});
    setSubmitError('');
    setStep(1);
    setStatus('idle');
  };

  const navLinks = [
    { href: 'landing', label: 'Accueil' },
    { href: 'legal', label: 'Mentions Légales' },
    { href: 'terms', label: 'Conditions & CGU' },
  ];

  const stepTitles: Record<number, string> = {
    1: 'Parlez-nous de vous',
    2: 'Quel est le sujet de votre demande ?',
    3: 'Comment pouvons-nous vous répondre ?',
    4: 'Votre message',
  };

  return (
    <div className="bg-white min-h-screen pt-10 flex flex-col">
      <SEOHead
        title="Contactez Sika Ads | Une question ? Parlons-en"
        description="Contactez l'équipe Sika Ads pour une question, un problème, un partenariat ou une demande concernant nos services. Sika Ads est basé à Lomé, au Togo."
        canonicalPath="/contact"
        type="website"
      />

      {/* ── NAV (mirrors AboutView) ── */}
      <header
        className={`fixed top-0 inset-x-0 z-40 transition-all duration-300 ${
          scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm' : 'bg-white/80 backdrop-blur-md'
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          <button
            onClick={() => onNavigate('landing')}
            className="flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 rounded-lg"
          >
            <img className="w-36 sm:w-40 h-auto object-contain" src="/Header-LogoSika-Ads.png" alt="Logo Sika Ads" />
          </button>

          <nav className="hidden md:flex items-center gap-8" aria-label="Navigation principale">
            <button
              onClick={() => onNavigate('landing')}
              className="text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors duration-200"
            >
              Accueil
            </button>
            <button
              onClick={() => onNavigate('legal')}
              className="text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors duration-200"
            >
              Mentions Légales
            </button>
            <button
              onClick={() => onNavigate('terms')}
              className="text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors duration-200"
            >
              Conditions
            </button>
            <span aria-current="page" className="text-sm font-bold text-[#128785]">
              Contact
            </span>
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={onStart}
              style={{ backgroundColor: '#ea580c' }}
              className="flex gap-1 items-center justify-center py-2 px-4 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
            >
              Commencer
              <LogInIcon className="w-4" />
            </button>
          </div>

          <button
            onClick={() => setMenuOpen(true)}
            className="md:hidden w-11 h-11 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
            aria-label="Ouvrir le menu"
          >
            <Menu className="w-6 h-6 text-[#ea580c]" />
          </button>
        </div>
      </header>

      <MobileDrawer
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        navLinks={navLinks}
        onNavigate={(href) => onNavigate(href as ContactViewName)}
        onCtaClick={() => {
          if (onStart) onStart();
        }}
        ctaText="Commencer"
      />

      <main className="flex flex-col flex-1">
        {/* ── HERO ── */}
        <section className="relative py-24 sm:py-28 overflow-hidden bg-slate-950">
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[140px] pointer-events-none" />
          <div className="absolute -bottom-32 right-0 w-[400px] h-[400px] text-[#128785] opacity-10 pointer-events-none" />
          <div className="container mx-auto px-6 relative z-10">
            <div className="max-w-3xl">
              <span className="inline-block px-4 py-2 rounded-full bg-[#128785]/10 border border-[#128785]/25 text-[#2dd4bf] text-[10px] font-black uppercase tracking-[0.2em] mb-6">
                Contactez-nous
              </span>
              <h1 className="font-heading text-4xl md:text-6xl font-black text-white leading-tight mb-6">
                Parlons de votre projet
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2dd4bf] to-indigo-400">.</span>
              </h1>
              <p className="text-lg text-slate-400 leading-relaxed max-w-2xl font-medium">
                Une question, une idée, un problème ou une opportunité ? Envoyez-nous un message et notre équipe vous répondra.
              </p>
            </div>
          </div>
        </section>

        {/* ── CONTACT: INFO + MULTISTEP FORM ── */}
        <section className="py-16 sm:py-20 bg-white">
          <div className="container mx-auto px-6 max-w-6xl">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-14 items-start">
              {/* Left column */}
              <div className="lg:col-span-2 space-y-8">
                <div>
                  <h2 className="font-heading text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tight mb-4">
                    Nous sommes là pour vous aider
                  </h2>
                  <p className="text-slate-600 font-medium leading-relaxed">
                    Que vous soyez créateur, entreprise ou simplement intéressé par Sika Ads, choisissez le sujet de votre demande et contactez notre équipe.
                  </p>
                </div>

                <ul className="space-y-4">
                  <li className="flex items-center gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="w-11 h-11 rounded-xl bg-[#128785]/10 border border-[#128785]/20 flex items-center justify-center shrink-0">
                      <Mail size={20} className="text-[#128785]" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Email</p>
                      <a
                        href="mailto:team@sika-ads.com"
                        className="text-sm font-bold text-slate-900 hover:text-[#128785] transition-colors break-all"
                      >
                        team@sika-ads.com
                      </a>
                    </div>
                  </li>
                  <li className="flex items-center gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                      <MapPin size={20} className="text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Localisation</p>
                      <p className="text-sm font-bold text-slate-900">Lomé, Togo</p>
                    </div>
                  </li>
                </ul>

                <div className="p-6 bg-slate-950 rounded-3xl text-white relative overflow-hidden">
                  <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-[#128785]/20 blur-3xl rounded-full" />
                  <p className="relative text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Vous êtes créateur ?</p>
                  <p className="relative text-sm font-medium text-slate-300 leading-relaxed mb-4">
                    Rejoignez la communauté et monétisez vos réseaux sociaux dès aujourd'hui.
                  </p>
                  <button
                    onClick={onStart}
                    className="relative inline-flex items-center gap-2 px-5 py-3 bg-[#f55d05] text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:scale-105 transition"
                  >
                    Devenir créateur <ArrowRight size={14} />
                  </button>
                </div>
              </div>

              {/* Right column: the form */}
              <div className="lg:col-span-3 w-full">
                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/60 p-6 sm:p-10">
                  {status === 'success' ? (
                    /* ── SUCCESS STATE ── */
                    <div className="text-center py-10" role="status" aria-live="polite">
                      <div className="w-20 h-20 mx-auto rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-6">
                        <CheckCircle2 size={40} className="text-emerald-500" />
                      </div>
                      <h2 className="font-heading text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tight mb-4">
                        Message envoyé !
                      </h2>
                      <p className="text-slate-600 font-medium leading-relaxed max-w-md mx-auto mb-3">
                        Merci pour votre message. Nous avons bien reçu votre demande et notre équipe vous répondra prochainement.
                      </p>
                      <p className="text-sm font-bold text-[#128785] mb-8">
                        Votre message a été envoyé à team@sika-ads.com.
                      </p>
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                        <button
                          onClick={() => onNavigate('landing')}
                          className="w-full sm:w-auto px-8 py-4 bg-slate-900 text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-black transition"
                        >
                          Retour à l'accueil
                        </button>
                        <button
                          onClick={resetForm}
                          className="w-full sm:w-auto px-8 py-4 bg-white border-2 border-slate-200 text-slate-700 rounded-xl text-[11px] font-black uppercase tracking-widest hover:border-[#128785] hover:text-[#128785] transition"
                        >
                          Envoyer un autre message
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h2 className="font-heading text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight mb-6">
                        Contactez-nous
                      </h2>

                      {/* Progress */}
                      <div className="mb-8">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Étape {step} sur 4
                          </p>
                          {STEPS.map((s) => (
                            <span
                              key={s.id}
                              className={`hidden sm:flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${
                                s.id === step ? 'text-[#128785]' : s.id < step ? 'text-slate-500' : 'text-slate-300'
                              }`}
                            >
                              <span
                                className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors ${
                                  s.id < step
                                    ? 'bg-[#128785] border-[#128785] text-white'
                                    : s.id === step
                                    ? 'border-[#128785] text-[#128785]'
                                    : 'border-slate-200 text-slate-300'
                                }`}
                              >
                                {s.id < step ? <Check size={12} /> : `0${s.id}`}
                              </span>
                              {s.label}
                            </span>
                          ))}
                        </div>
                        {/* Mobile bar */}
                        <div className="sm:hidden">
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#128785] rounded-full transition-all duration-300 motion-reduce:transition-none"
                              style={{ width: `${(step / 4) * 100}%` }}
                            />
                          </div>
                        </div>
                        {/* Desktop rail */}
                        <div className="hidden sm:block mt-4 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#128785] to-indigo-500 rounded-full transition-all duration-300 motion-reduce:transition-none"
                            style={{ width: `${(step / 4) * 100}%` }}
                          />
                        </div>
                      </div>

                      <form onSubmit={handleSubmit} noValidate>
                        <h3
                          ref={headingRef}
                          tabIndex={-1}
                          className="font-heading text-lg md:text-xl font-black text-slate-900 mb-1 focus:outline-none"
                        >
                          {stepTitles[step]}
                        </h3>

                        {/* Honeypot (anti-spam) */}
                        <div aria-hidden="true" className="hidden">
                          <label>
                            Ne pas remplir
                            <input ref={honeypotRef} type="text" name="company_website" tabIndex={-1} autoComplete="off" />
                          </label>
                        </div>

                        {/* STEP 1 */}
                        {step === 1 && (
                          <fieldset className="mt-5">
                            <legend className="text-sm font-medium text-slate-500 mb-5">
                              Vous nous contactez en tant que...
                            </legend>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {CONTACT_TYPES.map((opt) => {
                                const selected = form.type === opt.id;
                                const Icon = opt.icon;
                                return (
                                  <label
                                    key={opt.id}
                                    className={`flex items-start gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all duration-200 motion-reduce:transition-none focus-within:ring-4 focus-within:ring-teal-100 ${
                                      selected
                                        ? 'border-[#128785] bg-[#128785]/5'
                                        : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                                    }`}
                                  >
                                    <input
                                      type="radio"
                                      name="contact-type"
                                      value={opt.id}
                                      checked={selected}
                                      onChange={() => setField('type', opt.id)}
                                      className="sr-only"
                                    />
                                    <span
                                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                                        selected ? 'bg-[#128785] text-white' : 'bg-white border border-slate-200 text-slate-400'
                                      }`}
                                    >
                                      <Icon size={18} />
                                    </span>
                                    <span>
                                      <span className="block text-sm font-bold text-slate-900">{opt.label}</span>
                                      <span className="block text-xs font-medium text-slate-500 leading-relaxed mt-1">
                                        {opt.description}
                                      </span>
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                            {errors.type && (
                              <p className="mt-3 flex items-center gap-2 text-xs font-bold text-red-600" role="alert">
                                <AlertCircle size={14} /> {errors.type}
                              </p>
                            )}
                          </fieldset>
                        )}

                        {/* STEP 2 */}
                        {step === 2 && (
                          <fieldset className="mt-5">
                            <legend className="sr-only">Sujet de votre demande</legend>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {SUBJECTS.map((opt) => {
                                const selected = form.subject === opt.id;
                                return (
                                  <label
                                    key={opt.id}
                                    className={`flex items-center gap-3 px-5 py-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 motion-reduce:transition-none focus-within:ring-4 focus-within:ring-teal-100 ${
                                      selected
                                        ? 'border-[#128785] bg-[#128785]/5'
                                        : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                                    }`}
                                  >
                                    <input
                                      type="radio"
                                      name="contact-subject"
                                      value={opt.id}
                                      checked={selected}
                                      onChange={() => setField('subject', opt.id)}
                                      className="sr-only"
                                    />
                                    <span
                                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                        selected ? 'border-[#128785]' : 'border-slate-300'
                                      }`}
                                    >
                                      {selected && <span className="w-2 h-2 rounded-full bg-[#128785]" />}
                                    </span>
                                    <span className="text-sm font-bold text-slate-900">{opt.label}</span>
                                  </label>
                                );
                              })}
                            </div>
                            {errors.subject && (
                              <p className="mt-3 flex items-center gap-2 text-xs font-bold text-red-600" role="alert">
                                <AlertCircle size={14} /> {errors.subject}
                              </p>
                            )}
                          </fieldset>
                        )}

                        {/* STEP 3 */}
                        {step === 3 && (
                          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label htmlFor="contact-first-name" className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                                Prénom
                              </label>
                              <input
                                id="contact-first-name"
                                type="text"
                                value={form.firstName}
                                onChange={(e) => setField('firstName', e.target.value)}
                                aria-invalid={!!errors.firstName}
                                aria-describedby={errors.firstName ? 'err-firstName' : undefined}
                                autoComplete="given-name"
                                className="w-full h-14 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#128785] focus:ring-4 focus:ring-teal-100 transition"
                                placeholder="Votre prénom"
                              />
                              {errors.firstName && (
                                <p id="err-firstName" className="mt-2 flex items-center gap-1.5 text-xs font-bold text-red-600" role="alert">
                                  <AlertCircle size={13} /> {errors.firstName}
                                </p>
                              )}
                            </div>
                            <div>
                              <label htmlFor="contact-last-name" className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                                Nom
                              </label>
                              <input
                                id="contact-last-name"
                                type="text"
                                value={form.lastName}
                                onChange={(e) => setField('lastName', e.target.value)}
                                aria-invalid={!!errors.lastName}
                                aria-describedby={errors.lastName ? 'err-lastName' : undefined}
                                autoComplete="family-name"
                                className="w-full h-14 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#128785] focus:ring-4 focus:ring-teal-100 transition"
                                placeholder="Votre nom"
                              />
                              {errors.lastName && (
                                <p id="err-lastName" className="mt-2 flex items-center gap-1.5 text-xs font-bold text-red-600" role="alert">
                                  <AlertCircle size={13} /> {errors.lastName}
                                </p>
                              )}
                            </div>
                            <div className="sm:col-span-2">
                              <label htmlFor="contact-email" className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                                Adresse email
                              </label>
                              <input
                                id="contact-email"
                                type="email"
                                value={form.email}
                                onChange={(e) => setField('email', e.target.value)}
                                aria-invalid={!!errors.email}
                                aria-describedby={errors.email ? 'err-email' : undefined}
                                autoComplete="email"
                                className="w-full h-14 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#128785] focus:ring-4 focus:ring-teal-100 transition"
                                placeholder="vous@exemple.com"
                              />
                              {errors.email && (
                                <p id="err-email" className="mt-2 flex items-center gap-1.5 text-xs font-bold text-red-600" role="alert">
                                  <AlertCircle size={13} /> {errors.email}
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* STEP 4 + SUMMARY */}
                        {step === 4 && (
                          <div className="mt-5 space-y-6">
                            <div>
                              <label htmlFor="contact-message" className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                                Votre message
                              </label>
                              <textarea
                                id="contact-message"
                                value={form.message}
                                onChange={(e) => setField('message', e.target.value)}
                                aria-invalid={!!errors.message}
                                aria-describedby={errors.message ? 'err-message' : 'message-hint'}
                                rows={6}
                                maxLength={MAX_MESSAGE}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#128785] focus:ring-4 focus:ring-teal-100 transition resize-y"
                                placeholder="Décrivez votre question, votre problème ou votre projet..."
                              />
                              <div className="flex items-center justify-between mt-2">
                                {errors.message ? (
                                  <p id="err-message" className="flex items-center gap-1.5 text-xs font-bold text-red-600" role="alert">
                                    <AlertCircle size={13} /> {errors.message}
                                  </p>
                                ) : (
                                  <p id="message-hint" className="text-xs font-medium text-slate-400">
                                    Quelques lignes suffisent.
                                  </p>
                                )}
                                <p className="text-[10px] font-bold text-slate-400 tabular-nums">
                                  {form.message.length} / {MAX_MESSAGE}
                                </p>
                              </div>
                            </div>

                            {/* Récapitulatif avant envoi */}
                            <div className="rounded-2xl bg-slate-50 border border-slate-100 p-5 sm:p-6">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
                                Récapitulatif de votre demande
                              </p>
                              <dl className="space-y-3 text-sm">
                                <div className="flex items-center justify-between gap-4">
                                  <div>
                                    <dt className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</dt>
                                    <dd className="font-bold text-slate-900">{typeLabel(form.type)}</dd>
                                  </div>
                                  <button type="button" onClick={() => setStep(1)} className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#128785] hover:text-teal-700 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 rounded-lg px-2 py-1">
                                    <Pencil size={12} /> Modifier
                                  </button>
                                </div>
                                <div className="flex items-center justify-between gap-4 border-t border-slate-200 pt-3">
                                  <div>
                                    <dt className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sujet</dt>
                                    <dd className="font-bold text-slate-900">{subjectLabel(form.subject)}</dd>
                                  </div>
                                  <button type="button" onClick={() => setStep(2)} className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#128785] hover:text-teal-700 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 rounded-lg px-2 py-1">
                                    <Pencil size={12} /> Modifier
                                  </button>
                                </div>
                                <div className="flex items-center justify-between gap-4 border-t border-slate-200 pt-3">
                                  <div>
                                    <dt className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nom</dt>
                                    <dd className="font-bold text-slate-900">
                                      {form.firstName} {form.lastName}
                                    </dd>
                                    <dt className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Email</dt>
                                    <dd className="font-bold text-slate-900 break-all">{form.email}</dd>
                                  </div>
                                  <button type="button" onClick={() => setStep(3)} className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#128785] hover:text-teal-700 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 rounded-lg px-2 py-1">
                                    <Pencil size={12} /> Modifier
                                  </button>
                                </div>
                              </dl>
                            </div>

                            {status === 'error' && (
                              <div className="flex items-start gap-3 border border-red-100 bg-red-50 p-4 rounded-xl" role="alert">
                                <AlertCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-sm font-black text-red-700">Votre message n'a pas pu être envoyé.</p>
                                  <p className="text-xs font-medium text-red-600 mt-1">{submitError}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* NAV BUTTONS */}
                        <div className="flex items-center justify-between gap-3 mt-8">
                          {step > 1 ? (
                            <button
                              type="button"
                              onClick={handleBack}
                              className="inline-flex items-center gap-2 px-6 py-4 rounded-xl text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                            >
                              <ArrowLeft size={14} /> Retour
                            </button>
                          ) : (
                            <span />
                          )}

                          {step < 4 ? (
                            <button
                              type="button"
                              onClick={handleNext}
                              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-[#f55d05] text-white text-[11px] font-black uppercase tracking-widest shadow-lg shadow-orange-500/20 hover:bg-[#ea580c] hover:scale-[1.02] active:scale-95 transition motion-reduce:hover:scale-100 focus:outline-none focus-visible:ring-4 focus-visible:ring-orange-200"
                            >
                              Continuer <ArrowRight size={14} />
                            </button>
                          ) : (
                            <button
                              type="submit"
                              disabled={status === 'loading'}
                              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-[#f55d05] text-white text-[11px] font-black uppercase tracking-widest shadow-lg shadow-orange-500/20 hover:bg-[#ea580c] hover:scale-[1.02] active:scale-95 transition motion-reduce:hover:scale-100 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 focus:outline-none focus-visible:ring-4 focus-visible:ring-orange-200"
                            >
                              {status === 'loading' ? (
                                <>
                                  <Loader2 size={14} className="animate-spin" /> Envoi en cours...
                                </>
                              ) : status === 'error' ? (
                                <>
                                  <Send size={14} /> Réessayer
                                </>
                              ) : (
                                <>
                                  <Send size={14} /> Envoyer mon message
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </form>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="py-16 sm:py-20 bg-slate-50">
          <div className="container mx-auto px-6 max-w-3xl">
            <h2 className="font-heading text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tight text-center mb-10">
              Questions fréquentes
            </h2>
            <div className="space-y-3">
              {[
                {
                  q: 'Comment contacter Sika Ads ?',
                  a: 'Utilisez le formulaire ci-dessus ou écrivez-nous directement à team@sika-ads.com. Sika Ads est basé à Lomé, au Togo.',
                },
                {
                  q: 'Comment contacter Sika Ads en tant que créateur ?',
                  a: 'Dans le formulaire, sélectionnez le type « Créateur de contenu » puis le sujet « Je suis créateur ». Vous pouvez aussi créer un compte directement sur la plateforme pour rejoindre les campagnes disponibles.',
                },
                {
                  q: 'Comment contacter Sika Ads en tant qu\'entreprise ?',
                  a: 'Sélectionnez le type « Entreprise / Marque » et le sujet correspondant à votre demande. Vous pouvez également lancer une campagne directement depuis la plateforme.',
                },
                {
                  q: 'Comment proposer un partenariat à Sika Ads ?',
                  a: 'Dans le formulaire, choisissez le type « Partenaire » et le sujet « Partenariat », puis décrivez votre proposition. Notre équipe examinera chaque suggestion de collaboration.',
                },
              ].map((item) => (
                <details
                  key={item.q}
                  className="group bg-white rounded-2xl border border-slate-100 px-5 sm:px-6 py-4 open:shadow-md transition-shadow"
                >
                  <summary className="flex items-center justify-between gap-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden text-sm font-black text-slate-900 uppercase tracking-tight py-1">
                    {item.q}
                    <span className="w-6 h-6 shrink-0 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-open:rotate-45 transition-transform" aria-hidden="true">
                      +
                    </span>
                  </summary>
                  <p className="text-sm font-medium text-slate-600 leading-relaxed mt-2 mb-1">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── FINAL CTA ── */}
        <section className="py-24 bg-white">
          <div className="container mx-auto px-6">
            <div className="bg-slate-50 text-center rounded-[4rem] py-16 px-6 sm:px-12">
              <h2 className="font-heading text-3xl font-black text-slate-900 mb-8 max-w-xl mx-auto uppercase tracking-tight">
                Prêt à faire connaître votre marque ?
              </h2>
              <button
                onClick={onStart}
                className="px-12 py-6 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-black hover:scale-105 transition motion-reduce:hover:scale-100"
              >
                Commencer avec Sika Ads
              </button>
            </div>
          </div>
        </section>
      </main>

      <Footer onNavigate={onNavigate} />
    </div>
  );
};

export default ContactView;
```

- [ ] **Step 2 verify:** Run `npx tsc --noEmit` — Expected: ONLY the pre-existing `views/updateInComming.jsx` errors (no new errors from ContactView; ignore edge function — see Step 4 note).

- [ ] **Step 3: Commit**

```powershell
git add views/ContactView.tsx supabase.ts
git commit -m "feat(contact): add contact page with accessible multistep form"
```

- [ ] **Step 4 note:** `supabase/functions/**` is Deno code and is NOT in tsconfig scope; do not try to type it with the project `tsc`. If Deno is installed locally, an optional check is `deno check supabase/functions/contact-form/index.ts`.

---

### Task 3: Route wiring — `App.tsx`

**Files:**
- Modify: `App.tsx` (import near line 33; `AppView` type line 46; whitelist line 63; render chain near line 545-557)

**Interfaces:**
- Consumes: `ContactView` default export from `./views/ContactView` (props `{ onNavigate, onStart }`).
- Produces: working `/contact` URL (Netlify catch-all already serves it client-side — no netlify.toml change needed).

- [ ] **Step 1: Add the import**

After line `import TermsView from './views/TermsView';` add:

```ts
import ContactView from './views/ContactView';
```

- [ ] **Step 2: Extend the `AppView` union (line 46)**

Replace:

```ts
type AppView = 'landing' | 'app' | 'about' | 'legal' | 'terms' | 'advertise' | 'advertise-success' | 'login' | 'register' | 'verification-pending' | 'profile' | 'reset-password';
```

with:

```ts
type AppView = 'landing' | 'app' | 'about' | 'legal' | 'terms' | 'contact' | 'advertise' | 'advertise-success' | 'login' | 'register' | 'verification-pending' | 'profile' | 'reset-password';
```

- [ ] **Step 3: Add `'contact'` to the `parsePathname` whitelist (line 63)**

Replace:

```ts
  if (['about', 'legal', 'terms', 'advertise', 'advertise-success', 'login', 'register', 'verification-pending', 'profile', 'reset-password'].includes(firstPart)) {
```

with:

```ts
  if (['about', 'legal', 'terms', 'contact', 'advertise', 'advertise-success', 'login', 'register', 'verification-pending', 'profile', 'reset-password'].includes(firstPart)) {
```

- [ ] **Step 4: Render the view**

In the render chain, after the `view === 'terms'` branch (which ends with the `TermsView` JSX), insert:

```tsx
        ) : view === 'contact' ? (
          <ContactView
            onNavigate={(v) => setView(v as any)}
            onStart={() => user ? setView('app') : setView('register')}
          />
```

between the `terms` branch and the `view === 'profile'` branch.

- [ ] **Step 5: Do NOT touch `src/routes.tsx`**

It is dead code (`createRoutes` is never imported, and its `./views/...` imports do not even resolve from `src/`). Adding `/contact` there would change nothing and risks noise. Routing lives only in `App.tsx`.

- [ ] **Step 6: Typecheck + build**

Run: `npx tsc --noEmit` → no NEW errors (only pre-existing `updateInComming.jsx` ones).
Run: `npm run build` → exit 0.

- [ ] **Step 7: Manual smoke test**

Run `npm run dev`, open `http://localhost:5173/contact` (or the dev port). Verify: page renders, header+footer present, form steps advance, back keeps selections, validation blocks empty fields, success screen shows only after fake/real submit (without Supabase env, expect the error state — that is correct behavior).

- [ ] **Step 8: Commit**

```powershell
git add App.tsx
git commit -m "feat(contact): wire /contact route"
```

---

### Task 4: Footer "Support Client" → `/contact`, widen nav unions, Header Contact link

**Files:**
- Modify: `components/Footer.tsx:5` (union), `:68` (Support Client), `:54-58` (add Contact to Plateforme column)
- Modify: `views/AboutView.tsx:30`, `views/LegalView.tsx:7`, `views/TermsView.tsx:7` (prop unions)
- Modify: `components/Header.tsx:28-73` (Contact nav item → real route; Header is currently not rendered anywhere, but keep it consistent)

**Interfaces:**
- Consumes: `onNavigate('contact')` handled by App.tsx from Task 3.
- Produces: `'contact'` accepted by `FooterProps['onNavigate']`.

- [ ] **Step 1: `components/Footer.tsx` — widen the prop type (line 5)**

Replace:

```ts
  onNavigate: (view: 'landing' | 'about' | 'legal' | 'terms') => void;
```

with:

```ts
  onNavigate: (view: 'landing' | 'about' | 'legal' | 'terms' | 'contact') => void;
```

- [ ] **Step 2: `components/Footer.tsx` — repoint "Support Client" (line 68)**

Replace:

```tsx
              <li><button onClick={() => navigateToLandingSection('contact')} className="hover:text-indigo-400 transition-colors flex items-center gap-2">Support Client</button></li>
```

with:

```tsx
              <li><button onClick={() => onNavigate('contact')} className="hover:text-indigo-400 transition-colors flex items-center gap-2">Support Client</button></li>
```

- [ ] **Step 3: `components/Footer.tsx` — add an explicit "Contact" link in the Plateforme column after the "Pour les entreprises" item (line 57)**

Insert:

```tsx
              <li><button onClick={() => onNavigate('contact')} className="hover:text-indigo-400 transition-colors flex items-center gap-2">Contact</button></li>
```

- [ ] **Step 4: Widen the `onNavigate` prop in the other content views**

`views/AboutView.tsx` line 30, `views/LegalView.tsx` line 7, `views/TermsView.tsx` line 7 — in each, replace:

```ts
  onNavigate: (view: 'landing' | 'about' | 'legal' | 'terms') => void;
```

with:

```ts
  onNavigate: (view: 'landing' | 'about' | 'legal' | 'terms' | 'contact') => void;
```

(`LandingPage.tsx` uses `setView: (v: string) => void` and passes `(v) => setView(v)` to Footer — no change needed there.)

- [ ] **Step 5: `components/Header.tsx` — make the existing "Contact" nav item route to the page**

In `handleNav` (lines 67-73), replace:

```ts
    } else if (id === 'contact') {
      if (view !== 'landing') setView('landing');
      setActiveSection('contact');
      setTimeout(() => {
        const el = document.getElementById('contact');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
```

with:

```ts
    } else if (id === 'contact') {
      setView('contact');
      setActiveSection('contact');
```

(`Header.tsx` is currently not rendered anywhere — App.tsx keeps it commented out — but this keeps the component consistent for when it is re-enabled. Do not uncomment the Header.)

- [ ] **Step 6: Verify**

Run: `npx tsc --noEmit` → no new errors. Run: `npm run build` → success.
Dev smoke test: on landing page, click footer "Support Client" → lands on `/contact`; the contact page's own footer link "Contact" also works.

- [ ] **Step 7: Commit**

```powershell
git add components/Footer.tsx components/Header.tsx views/AboutView.tsx views/LegalView.tsx views/TermsView.tsx
git commit -m "feat(contact): point footer Support Client to /contact and widen nav types"
```

---

### Task 5: SEO surface — sitemap + routes doc

**Files:**
- Modify: `public/sitemap.xml`
- Modify: `ROUTES.md`

**Interfaces:**
- Consumes: nothing.
- Produces: `/contact` discoverable + documented. No new JSON-LD: the Organization `@graph` in `index.html` already covers the org (no duplicates — spec §30). `SEOHead` already sets title/description/canonical at the view level (Task 2).

- [ ] **Step 1: `public/sitemap.xml` — add before the closing `</urlset>`:**

```xml
  <url>
    <loc>https://www.sika-ads.com/contact</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
```

- [ ] **Step 2: `ROUTES.md` — add a `/contact` entry**

In the section listing public content routes (`/about`, `/legal`, `/terms`), add one line in the same format: `/contact` → page Contact (formulaire multistep), view `contact`, file `views/ContactView.tsx`.

- [ ] **Step 3: Verify** `npm run build` → success (public files are copied as-is).

- [ ] **Step 4: Commit**

```powershell
git add public/sitemap.xml ROUTES.md
git commit -m "chore(contact): add /contact to sitemap and routes doc"
```

---

### Task 6: Final verification pass

- [ ] **Step 1: Build**

Run: `npm run build` → exit code 0.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit` → output identical in spirit to the baseline: errors ONLY in `views/updateInComming.jsx`.

- [ ] **Step 3: Responsive & a11y manual checklist at `http://localhost:5173/contact`**

- 320px: no horizontal scroll; form usable; progress collapses to bar; tap targets ≥ 44px height (h-14 inputs, py-4 buttons).
- Complete steps 1→4 with keyboard only: Tab reaches radios, visible focus rings, Enter advances via "Continuer", focus lands on new step heading on change.
- Trigger each validation error by clicking "Continuer" empty; messages appear under fields with `role="alert"`; going back preserves all values and selections.
- Submit (without Supabase env → expect error banner with "Réessayer"; with env + deployed edge function → expect success screen "Message envoyé !").

- [ ] **Step 4: Confirm nothing else changed**

Run: `git status` → clean (only the files from Tasks 1-5 committed).

---

## Acceptance checklist mapping (spec §41)

All criteria covered: route Task 3; header/footer Task 2+4; H1/design/fonts Task 2; multistep + progress + back + persisted data Task 2; type & subject choice Task 2; email validation Task 2 (FE) + Task 1 (BE); delivery to team@sika-ads.com with dynamic subject + structured body Task 1; auto-reply Task 1; loading/success/error states Task 2; anti-spam (honeypot + rate limit + server validation + HTML escaping) Task 1; no secrets in frontend Task 1 (Deno env only); responsive + a11y Task 2 + verification Task 6; SEO Task 2 (SEOHead) + Task 5 (sitemap, no duplicate JSON-LD); build/lint Task 6.
