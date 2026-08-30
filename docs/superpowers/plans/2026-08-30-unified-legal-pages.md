# Unified "Légal & Aide" Pages — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `/legal`, `/terms`, `/contact` (and About's header) share one design: common fixed header, common slate-950 hero with per-page accent, and the CGU body layout (sticky "Sommaire" sidebar + numbered card sections).

**Architecture:** Two new shared components (`MarketingHeader`, `PageHero`) extracted from the existing Contact/About header+hero JSX; `LegalView` is rebuilt around them (accordion removed, content preserved verbatim); `TermsView` gets the missing header + PageHero swap; `ContactView`/`AboutView` replace their inline copies with the shared components (rendered output identical).

**Tech Stack:** React 18 + TS, Tailwind 3.4 utility classes, lucide-react, existing `Footer`/`SEOHead`/`MobileDrawer`. No new deps.

**Spec:** `docs/superpowers/specs/2026-08-30-unified-legal-pages-design.md`

## Global Constraints

- Legal/administrative text is copied **word for word** from the current files — only presentation changes. No new phone numbers/emails/addresses beyond those already present.
- Accents: Contact = teal, Legal = indigo, Terms = red. Hero shell identical everywhere (`bg-slate-950` + indigo glow).
- One `H1` per page (`PageHero` renders it). `font-heading` (Space Grotesk) for H1/H2; Inter elsewhere.
- Anchor ids must keep working: legal → `publisher, hosting, data, cookies, rights, liability, changes`; terms → `objet, eligibilite, remuneration, antifraude, resiliation`.
- Views must stay usable via the existing `App.tsx` view-state routing; do NOT touch `App.tsx` except adding `onStart` to the `<LegalView>` render (Task 4).
- tsconfig has no `strict`/`noUnusedLocals`; still remove imports that become unused.
- Verification each task: `npx tsc --noEmit` shows ONLY pre-existing errors in `views/updateInComming.jsx`; `npm run build` exits 0.
- Repo has no test framework — manual browser checklist in Task 5 replaces automated tests.

---

### Task 1: Shared components `MarketingHeader` + `PageHero`

**Files:**
- Create: `components/MarketingHeader.tsx`
- Create: `components/PageHero.tsx`

**Interfaces:**
- Consumes: `MobileDrawer` (props `{ isOpen, onClose, navLinks: {href,label}[], onNavigate: (href: string) => void, onCtaClick, ctaText }`), lucide `LogInIcon`, `Menu`.
- Produces:
  - `MarketingHeader` default export, props `{ onNavigate: (view: MarketingView) => void; onStart?: () => void; active: MarketingView }`; named export `type MarketingView = 'landing' | 'about' | 'legal' | 'terms' | 'contact'`.
  - `PageHero` default export, props `{ badge: string; title: React.ReactNode; subtitle?: string; accent?: 'teal' | 'indigo' | 'red'; children?: React.ReactNode }`.

- [ ] **Step 1: Create `components/MarketingHeader.tsx`**

```tsx
import React, { useEffect, useState } from 'react';
import { LogInIcon, Menu } from 'lucide-react';
import MobileDrawer from './MobileDrawer';

export type MarketingView = 'landing' | 'about' | 'legal' | 'terms' | 'contact';

interface MarketingHeaderProps {
  onNavigate: (view: MarketingView) => void;
  onStart?: () => void;
  active: MarketingView;
}

const NAV_ITEMS: { view: MarketingView; label: string }[] = [
  { view: 'landing', label: 'Accueil' },
  { view: 'legal', label: 'Mentions Légales' },
  { view: 'terms', label: 'Conditions' },
  { view: 'contact', label: 'Contact' },
];

const MarketingHeader: React.FC<MarketingHeaderProps> = ({ onNavigate, onStart, active }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
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
            {NAV_ITEMS.map((item) =>
              item.view === active ? (
                <span key={item.view} aria-current="page" className="text-sm font-bold text-[#128785]">
                  {item.label}
                </span>
              ) : (
                <button
                  key={item.view}
                  onClick={() => onNavigate(item.view)}
                  className="text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors duration-200"
                >
                  {item.label}
                </button>
              )
            )}
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
        navLinks={NAV_ITEMS.map((i) => ({ href: i.view, label: i.label }))}
        onNavigate={(href) => onNavigate(href as MarketingView)}
        onCtaClick={() => {
          if (onStart) onStart();
        }}
        ctaText="Commencer"
      />
    </>
  );
};

export default MarketingHeader;
```

- [ ] **Step 2: Create `components/PageHero.tsx`**

```tsx
import React from 'react';

interface PageHeroProps {
  badge: string;
  title: React.ReactNode;
  subtitle?: string;
  accent?: 'teal' | 'indigo' | 'red';
  children?: React.ReactNode;
}

const BADGE_STYLES: Record<'teal' | 'indigo' | 'red', string> = {
  teal: 'bg-[#128785]/10 border-[#128785]/25 text-[#2dd4bf]',
  indigo: 'bg-indigo-500/10 border-indigo-500/25 text-indigo-400',
  red: 'bg-red-500/10 border-red-500/20 text-red-500',
};

const PageHero: React.FC<PageHeroProps> = ({ badge, title, subtitle, accent = 'teal', children }) => {
  return (
    <section className="relative py-24 sm:py-28 overflow-hidden bg-slate-950">
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[140px] pointer-events-none" />
      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-3xl">
          <span
            className={`inline-block px-4 py-2 rounded-full border text-[10px] font-black uppercase tracking-[0.2em] mb-6 ${BADGE_STYLES[accent]}`}
          >
            {badge}
          </span>
          <h1 className="font-heading text-4xl md:text-6xl font-black text-white leading-tight mb-6">{title}</h1>
          {subtitle && (
            <p className="text-lg text-slate-400 leading-relaxed max-w-2xl font-medium">{subtitle}</p>
          )}
          {children}
        </div>
      </div>
    </section>
  );
};

export default PageHero;
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit` → only baseline `updateInComming.jsx` errors. Run: `npm run build` → exit 0 (files not yet imported — vite ignores them, tsc still checks).

- [ ] **Step 4: Commit**

```powershell
git add components/MarketingHeader.tsx components/PageHero.tsx
git commit -m "feat(ui): add shared MarketingHeader and PageHero components"
```

---

### Task 2: Switch `ContactView` and `AboutView` to the shared components

**Files:**
- Modify: `views/ContactView.tsx` (imports ~lines 1-26; state block; header + drawer JSX; hero JSX; `ContactViewName`)
- Modify: `views/AboutView.tsx` (imports; state; header + drawer JSX)

**Interfaces:**
- Consumes: `MarketingHeader`/`MarketingView`/`PageHero` from Task 1.
- Produces: identical rendered output on `/contact` and `/about`; both files no longer own header/hero markup. `ContactView` prop type uses `MarketingView` (App.tsx passes `v as any` — compatible).

- [ ] **Step 1: `views/ContactView.tsx` — swap imports**

In the lucide import, remove `LogInIcon` and `Menu` (now unused there). Delete the `MobileDrawer` import line. Keep `Footer`, `SEOHead`, `supabase` imports and the other lucide icons. Add:

```ts
import MarketingHeader, { MarketingView } from '../components/MarketingHeader';
import PageHero from '../components/PageHero';
```

Replace:

```ts
export type ContactViewName = 'landing' | 'about' | 'legal' | 'terms' | 'contact';

interface ContactViewProps {
  onNavigate: (view: ContactViewName) => void;
  onStart?: () => void;
}
```

with:

```ts
interface ContactViewProps {
  onNavigate: (view: MarketingView) => void;
  onStart?: () => void;
}
```

- [ ] **Step 2: `views/ContactView.tsx` — remove header/hero state and JSX**

Delete: `menuOpen`/`scrolled` state lines, the scroll `useEffect` (the one calling `setScrolled`), the `navLinks` array, the entire `{/* ── NAV (mirrors AboutView) ── */}` `<header>…</header>` block, the `<MobileDrawer … />` element, and the entire `{/* ── HERO ── */}` `<section>…</section>` block.

Immediately after the closing `/>` of `<SEOHead … />`, insert:

```tsx
      <MarketingHeader onNavigate={onNavigate} onStart={onStart} active="contact" />
```

At the top of `<main className="flex flex-col flex-1">`, insert (same texts as the removed hero):

```tsx
        <PageHero
          badge="Contactez-nous"
          title={
            <>
              Parlons de votre projet
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2dd4bf] to-indigo-400">.</span>
            </>
          }
          subtitle="Une question, une idée, un problème ou une opportunité ? Envoyez-nous un message et notre équipe vous répondra."
          accent="teal"
        />
```

- [ ] **Step 3: `views/AboutView.tsx` — replace inline header with `MarketingHeader`**

- Remove imports: `Menu`, `MobileDrawer` (keep `X` only if used elsewhere in the file; check with `Ctrl+F` — AboutView uses other icons in body; remove only now-unused `Menu`/`LogInIcon`).
- Remove `menuOpen`/`scrolled` state + the scroll `useEffect` + the `navLinks` array (only if not referenced elsewhere in AboutView — verify before deleting).
- Add `import MarketingHeader from '../components/MarketingHeader';`.
- Replace the whole `<header …>…</header>` block AND the `<MobileDrawer … />` element with:

```tsx
      <MarketingHeader onNavigate={(v) => onNavigate(v as any)} onStart={onStart} active="about" />
```

(The cast keeps AboutView's existing narrower prop union compiling; its `onNavigate` also still receives `'contact'` from the drawer — App already handles it.)

Note: AboutView's header previously sat OUTSIDE `<main>` (before it) — keep `MarketingHeader` in the same position (direct child of the fragment, before `<main>`).

- [ ] **Step 4: Verify**

`npx tsc --noEmit` → baseline only. `npm run build` → 0. Dev check: `http://localhost:5173/contact` and `/about` render with header, active item teal, drawer works, hero unchanged visually.

- [ ] **Step 5: Commit**

```powershell
git add views/ContactView.tsx views/AboutView.tsx
git commit -m "refactor(ui): use shared MarketingHeader/PageHero on contact and about"
```

---

### Task 3: `TermsView` — add header, unified hero, link "Contact Support" to /contact

**Files:**
- Modify: `views/TermsView.tsx` (imports; after `SEOHead`; hero section lines ~20-43; "Contact Support" button line ~64)

**Interfaces:**
- Consumes: `MarketingHeader` (`active="terms"`), `PageHero` (`accent="red"`).
- Produces: `/terms` with the common header; the previously dead "Contact Support" button now navigates to `/contact`.

- [ ] **Step 1: Imports**

After `import SEOHead from '../components/SEOHead';` add:

```ts
import MarketingHeader from '../components/MarketingHeader';
import PageHero from '../components/PageHero';
```

`ShieldAlert` (hero icon, now unused) can stay in the import — no `noUnusedLocals`; but prefer removing `ShieldAlert` from the import line if it appears nowhere else in the file (verify with grep first).

- [ ] **Step 2: Insert header after `<SEOHead … />`**

Between the closing `/>` of `SEOHead` and `{/* Hero Section */}`:

```tsx
      <MarketingHeader onNavigate={onNavigate} onStart={onStart} active="terms" />
```

- [ ] **Step 3: Replace the hero**

Delete the entire hero `<section className="relative py-28 overflow-hidden bg-slate-950"> … </section>` block (lines with `/anti_fraud.png` img through its closing `</section>`), and put:

```tsx
      <PageHero
        badge="Confiance & Sécurité"
        title={
          <>
            CGU & Protection <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-indigo-400">
              Anti-Fraude.
            </span>
          </>
        }
        subtitle="Nous construisons un écosystème sain et honnête. En rejoignant SikaAds, vous vous engagez à respecter des règles strictes pour garantir la valeur apportée aux annonceurs."
        accent="red"
      />
```

Keep `SEOHead`'s `ogImage="https://www.sika-ads.com/anti_fraud.png"` untouched.

- [ ] **Step 4: Make the sidebar "Contact Support" button navigate to /contact**

Replace:

```tsx
<button className="text-[10px] font-black uppercase text-indigo-600 flex items-center gap-2">Contact Support <ExternalLink size={12} /></button>
```

with:

```tsx
<button onClick={() => onNavigate('contact')} className="text-[10px] font-black uppercase text-indigo-600 flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 rounded-lg">Contact Support <ExternalLink size={12} /></button>
```

- [ ] **Step 5: Verify + Commit**

`npx tsc --noEmit` → baseline only; `npm run build` → 0; dev: `/terms` shows the same header as `/contact`, red badge hero, "Contact Support" → `/contact`.

```powershell
git add views/TermsView.tsx
git commit -m "feat(terms): adopt shared header/hero and link contact support to /contact"
```

---

### Task 4: `LegalView` rebuild (unified shell + CGU body layout)

**Files:**
- Rewrite: `views/LegalView.tsx`
- Modify: `App.tsx` (pass `onStart` to `<LegalView>`)

**Interfaces:**
- Consumes: `MarketingHeader` (`active="legal"`), `PageHero` (`accent="indigo"`), `Footer`, `SEOHead`.
- Produces: `/legal` with sticky Sommaire sidebar (anchors `publisher, hosting, data, cookies, rights, liability, changes`), numbered sections `01`-`07` in cards, accordion removed (all sections always visible), bottom Help section and Footer preserved. New prop `onStart?: () => void`.

- [ ] **Step 1: Replace `views/LegalView.tsx` entirely with:**

```tsx
import React from 'react';
import { FileText, Mail, MessageCircle, Building, Globe, Lock, Eye, Shield, AlertCircle } from 'lucide-react';
import Footer from '../components/Footer';
import SEOHead from '../components/SEOHead';
import MarketingHeader from '../components/MarketingHeader';
import PageHero from '../components/PageHero';
import { MarketingView } from '../components/MarketingHeader';

interface LegalViewProps {
  onNavigate: (view: MarketingView) => void;
  onStart?: () => void;
}

const LegalView: React.FC<LegalViewProps> = ({ onNavigate, onStart }) => {
  return (
    <div className="bg-white min-h-screen pt-10 flex flex-col">
      <SEOHead
        title="Mentions Légales & Confidentialité | SikaAds Togo"
        description="Mentions légales, politique de confidentialité des données personnelles et conditions d'hébergement de SikaAds."
        canonicalPath="/legal"
      />

      <MarketingHeader onNavigate={onNavigate} onStart={onStart} active="legal" />

      <PageHero
        badge="Transparence & Droits"
        title="Mentions Légales"
        subtitle="Toutes les informations légales, administratives et de conformité relatives à SikaAds Togo."
        accent="indigo"
      >
        <p className="text-blue-200/70 text-sm font-bold mt-4">Dernière mise à jour : Avril 2026</p>
      </PageHero>

      {/* Main Content */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Sidebar Navigation (Sticky) */}
            <div className="lg:col-span-1 border-r border-slate-100 pr-8 hidden lg:block">
              <div className="sticky top-28 space-y-6">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Sommaire</h3>
                <ul className="space-y-4 text-sm font-bold text-slate-600">
                  <li><a href="#publisher" className="hover:text-indigo-600 transition-colors block py-2 border-b border-slate-50">1. Éditeur de la plateforme</a></li>
                  <li><a href="#hosting" className="hover:text-indigo-600 transition-colors block py-2 border-b border-slate-50">2. Hébergement technique</a></li>
                  <li><a href="#data" className="hover:text-indigo-600 transition-colors block py-2 border-b border-slate-50">3. Protection des données</a></li>
                  <li><a href="#cookies" className="hover:text-indigo-600 transition-colors block py-2 border-b border-slate-50">4. Cookies & Technologies</a></li>
                  <li><a href="#rights" className="hover:text-indigo-600 transition-colors block py-2 border-b border-slate-50">5. Propriété intellectuelle</a></li>
                  <li><a href="#liability" className="hover:text-indigo-600 transition-colors block py-2 border-b border-slate-50">6. Limitation de responsabilité</a></li>
                  <li><a href="#changes" className="hover:text-indigo-600 transition-colors block py-2 border-b border-slate-50">7. Modifications de CGU</a></li>
                </ul>
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 mt-10">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Besoin d'aide ?</p>
                  <p className="text-xs text-slate-600 mb-4 font-medium italic leading-relaxed">Une clause vous semble obscure ? Notre équipe est là pour vous éclairer.</p>
                  <button onClick={() => onNavigate('contact')} className="text-[10px] font-black uppercase text-indigo-600 hover:text-indigo-700 flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 rounded-lg">Contacter le support →</button>
                </div>
              </div>
            </div>

            {/* Sections */}
            <div className="lg:col-span-2 space-y-16">
              {/* 01 Publisher */}
              <div id="publisher" className="space-y-6 scroll-mt-28">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-xs">01</span>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Éditeur de la Plateforme</h2>
                    <p className="text-sm text-slate-500 font-bold">Identité légale et responsabilités</p>
                  </div>
                </div>
                <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 space-y-6">
                  <div className="grid md:grid-cols-2 gap-8">
                    <div>
                      <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">👤 Dénomination Sociale</h4>
                      <p className="text-lg font-bold text-slate-900">SikaAds Togo SAS</p>
                    </div>
                    <div>
                      <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">🏢 Forme Juridique</h4>
                      <p className="text-lg font-bold text-slate-900">Société par Actions Simplifiée (SAS)</p>
                      <p className="text-sm text-slate-500 mt-1">Capital: 5 000 000 FCFA</p>
                    </div>
                    <div>
                      <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">📍 Siège Social</h4>
                      <p className="text-slate-900 font-bold bg-white p-3 rounded-lg border border-indigo-200">
                        Lomé, Quartier Agoè, Boulevard Eyadema, Togo
                      </p>
                    </div>
                    <div>
                      <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">🆔 RCCM / IFU</h4>
                      <p className="text-slate-900 font-bold">TG-LOM 2024 B 4567</p>
                      <p className="text-sm text-slate-500 mt-1">IFU : 004567891</p>
                    </div>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 flex gap-3">
                    <AlertCircle size={20} className="text-blue-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-blue-900 font-medium">
                      <strong>Directeur de la Publication:</strong> Koffi Jean-Pierre<br />
                      <strong>Contact Administratif:</strong> admin@sikaads.tg
                    </p>
                  </div>
                </div>
              </div>

              {/* 02 Hosting */}
              <div id="hosting" className="space-y-6 scroll-mt-28">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-xs">02</span>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Hébergement Technique</h2>
                    <p className="text-sm text-slate-500 font-bold">Infrastructure et serveurs</p>
                  </div>
                </div>
                <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-lg border border-green-200">
                      <div className="flex items-center gap-2 mb-4">
                        <Globe size={20} className="text-green-600" />
                        <h4 className="text-sm font-black text-green-900">Hébergeur Cloud Principal</h4>
                      </div>
                      <p className="text-lg font-bold text-slate-900 mb-2">Amazon Web Services (AWS)</p>
                      <ul className="text-sm text-slate-600 space-y-2">
                        <li>✓ Région: Europe (Paris)</li>
                        <li>✓ Redondance géographique</li>
                        <li>✓ Certifications: ISO 27001, SOC 2</li>
                      </ul>
                    </div>
                    <div className="bg-white p-6 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-2 mb-4">
                        <Lock size={20} className="text-blue-600" />
                        <h4 className="text-sm font-black text-blue-900">Bases de Données</h4>
                      </div>
                      <p className="text-lg font-bold text-slate-900 mb-2">Google Cloud Firestore</p>
                      <ul className="text-sm text-slate-600 space-y-2">
                        <li>✓ Sauvegardes automatiques</li>
                        <li>✓ Réplication temps réel</li>
                        <li>✓ Uptime: 99.95%</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* 03 Data */}
              <div id="data" className="space-y-6 scroll-mt-28">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-xs">03</span>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Protection des Données</h2>
                    <p className="text-sm text-slate-500 font-bold">Conformité légale et sécurité</p>
                  </div>
                </div>
                <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 space-y-6">
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <Shield size={20} className="text-purple-600 mt-1 shrink-0" />
                      <div>
                        <h4 className="font-bold text-slate-900 mb-1">Loi Togolaise n°2019-014</h4>
                        <p className="text-sm text-slate-600">Protection des données à caractère personnel</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <Shield size={20} className="text-purple-600 mt-1 shrink-0" />
                      <div>
                        <h4 className="font-bold text-slate-900 mb-1">Chiffrement des Données</h4>
                        <p className="text-sm text-slate-600">Protocole SSL/TLS 1.3 pour toutes les connexions</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <Shield size={20} className="text-purple-600 mt-1 shrink-0" />
                      <div>
                        <h4 className="font-bold text-slate-900 mb-1">Audit de Sécurité</h4>
                        <p className="text-sm text-slate-600">Audits mensuels effectués par des tiers indépendants</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <p className="text-sm text-purple-900 font-medium">
                      <strong>Droit d'accès:</strong> Vous pouvez à tout moment demander une copie de vos données personnelles. Contactez <a href="mailto:privacy@sikaads.tg" className="underline">privacy@sikaads.tg</a>
                    </p>
                  </div>
                </div>
              </div>

              {/* 04 Cookies */}
              <div id="cookies" className="space-y-6 scroll-mt-28">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-xs">04</span>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Cookies & Technologies</h2>
                    <p className="text-sm text-slate-500 font-bold">Suivi et consentement</p>
                  </div>
                </div>
                <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                      <h4 className="font-bold text-slate-900 mb-2">🔒 Cookies Essentiels</h4>
                      <p className="text-sm text-slate-600">Nécessaires au fonctionnement du site (session, authentification)</p>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                      <h4 className="font-bold text-slate-900 mb-2">📊 Cookies Analytics</h4>
                      <p className="text-sm text-slate-600">Google Analytics pour améliorer l'expérience utilisateur</p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600">
                    Vous pouvez désactiver les cookies non essentiels à tout moment via les paramètres de votre navigateur.
                  </p>
                </div>
              </div>

              {/* 05 Rights */}
              <div id="rights" className="space-y-6 scroll-mt-28">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-xs">05</span>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Propriété Intellectuelle</h2>
                    <p className="text-sm text-slate-500 font-bold">Droits et restrictions</p>
                  </div>
                </div>
                <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 space-y-4">
                  <p className="text-slate-700 font-medium">
                    Tous les contenus présents sur SikaAds Togo (texte, images, logos, vidéos) sont la propriété exclusive de SikaAds Togo ou de ses partenaires licenciés.
                  </p>
                  <div className="bg-pink-50 p-4 rounded-lg border border-pink-200 space-y-2">
                    <h4 className="font-bold text-slate-900">Interdictions</h4>
                    <ul className="text-sm text-slate-600 space-y-1">
                      <li>❌ Reproduction sans autorisation explicite</li>
                      <li>❌ Distribution ou revente de contenus</li>
                      <li>❌ Utilisation commerciale sans licence</li>
                      <li>❌ Reverse engineering ou décompilation</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* 06 Liability */}
              <div id="liability" className="space-y-6 scroll-mt-28">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-xs">06</span>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Limitation de Responsabilité</h2>
                    <p className="text-sm text-slate-500 font-bold">Clauses d'exemption</p>
                  </div>
                </div>
                <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 space-y-6">
                  <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                    <p className="text-sm text-red-900 font-medium leading-relaxed">
                      SikaAds Togo ne peut être tenue responsable de:
                    </p>
                    <ul className="text-sm text-red-800 mt-3 space-y-2">
                      <li>• Pertes de données ou interruptions de service</li>
                      <li>• Dommages indirects ou consécutifs</li>
                      <li>• Contenus générés par les utilisateurs</li>
                      <li>• Dysfonctionnements dus à des tiers</li>
                    </ul>
                  </div>
                  <p className="text-sm text-slate-600">
                    <strong>Limitation:</strong> Notre responsabilité est limitée au montant total des frais payés par l'utilisateur au cours des 12 derniers mois.
                  </p>
                </div>
              </div>

              {/* 07 Changes */}
              <div id="changes" className="space-y-6 scroll-mt-28 pb-10">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-xs">07</span>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Modifications de CGU</h2>
                    <p className="text-sm text-slate-500 font-bold">Mise à jour et notification</p>
                  </div>
                </div>
                <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 space-y-6">
                  <p className="text-slate-700 font-medium">
                    SikaAds Togo se réserve le droit de modifier ces mentions légales à tout moment. Les modifications seront notifiées aux utilisateurs via email ou sur le site.
                  </p>
                  <div className="bg-cyan-50 p-4 rounded-lg border border-cyan-200">
                    <p className="text-sm text-cyan-900 font-medium">
                      Dernière mise à jour: <strong>Avril 2026</strong><br />
                      En continuant à utiliser le site, vous acceptez les conditions en vigueur.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Help Section */}
      <section className="py-16 bg-gradient-to-r from-indigo-50 to-blue-50 border-t border-slate-100">
        <div className="container mx-auto px-6 max-w-4xl">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white shrink-0">
                <Mail size={24} />
              </div>
              <div>
                <h3 className="font-black text-slate-900 mb-2">Question Juridique?</h3>
                <p className="text-sm text-slate-600 mb-3">Notre équipe légale est disponible pour vous aider.</p>
                <a href="mailto:legal@sikaads.tg" className="text-indigo-600 font-bold text-sm hover:text-indigo-700">
                  legal@sikaads.tg →
                </a>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white shrink-0">
                <MessageCircle size={24} />
              </div>
              <div>
                <h3 className="font-black text-slate-900 mb-2">Consultez aussi les CGU</h3>
                <p className="text-sm text-slate-600 mb-3">Pour les conditions d'utilisation et la politique anti-fraude.</p>
                <button onClick={() => onNavigate('terms')} className="text-indigo-600 font-bold text-sm hover:text-indigo-700 flex items-center gap-1">
                  CGU & Anti-Fraude →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer onNavigate={onNavigate} />
    </div>
  );
};

export default LegalView;
```

(The old per-section colored icons `Building`/`Eye`/`FileText`/`AlertCircle` were folded into the Terms-style numbered headers; keep the imports listed at the top — `FileText`, `Building`, `Eye` may become unused: remove from the import line ONLY those three if grep confirms no other use in the new file. Final expected import line if all removed: `import { Mail, MessageCircle, Globe, Lock, Shield, AlertCircle } from 'lucide-react';`)

- [ ] **Step 2: `App.tsx` — pass `onStart` to LegalView**

Replace:

```tsx
          <LegalView onNavigate={(v) => setView(v as any)} />
```

with:

```tsx
          <LegalView
            onNavigate={(v) => setView(v as any)}
            onStart={() => user ? setView('app') : setView('register')}
          />
```

- [ ] **Step 3: Content-integrity check**

Diff the old vs new file's visible strings:

```powershell
git diff HEAD -- views/LegalView.tsx | Select-String "^-" | Select-String -NotMatch "expandedSection|useState|ChevronRight|className|border-2|hover:|<button|</button>|<section|</section>|<div|</div>|Sticky|Chips|import"
```

Expected: removed lines that are NOT markup/state — none (every legal sentence must appear on a `+` line too). Manually spot-check the 4 sensitive blocks: Siège social, RCCM/IFU, Directeur de publication, Droit d'accès email.

- [ ] **Step 4: Verify**

`npx tsc --noEmit` → baseline only; `npm run build` → 0. Dev: `/legal` shows same header as `/contact` (Mentions Légales active, indigo badge), all 7 sections visible, sidebar anchors jump, no horizontal scroll at 320px.

- [ ] **Step 5: Commit**

```powershell
git add views/LegalView.tsx App.tsx
git commit -m "feat(legal): rebuild legal page on unified header/hero and CGU body layout"
```

---

### Task 5: Cross-page consistency verification

**Files:** none (verification only)

- [ ] **Step 1:** `npm run build` → exit 0. `npx tsc --noEmit` → ONLY `views/updateInComming.jsx` errors.

- [ ] **Step 2: Browser checklist** (`npm run dev`, pages `/about` `/legal` `/terms` `/contact`):
  - Header pixel-identical on all 4; active item teal on its own page; drawer opens on mobile widths; "Commencer" → register/app.
  - Heroes: same shell, badges teal/indigo/red respectively; single H1 each.
  - `/legal` + `/terms`: sidebar Sommaire anchors scroll correctly (not hidden under the fixed header — `scroll-mt-28`).
  - Footer "Légal & Aide" links land on the unified pages; "Support Client" → `/contact`.
  - 320px: no horizontal scroll on any of the 4 pages.

- [ ] **Step 3:** `git status` clean.

---

## Self-review notes

- Spec coverage: header/hero sharing (Tasks 1-4), per-page accents (Task 1 badges + usage), Legal rebuild to CGU layout + content verbatim (Task 4), Terms header + Contact Support link (Task 3), About header (Task 2), Contact refactor (Task 2), validation (all tasks + Task 5). Out-of-scope items untouched.
- Type consistency: `MarketingView` defined in Task 1 and used by Task 2 (Contact props), Task 4 (Legal props, Terms via existing wider unions already including `'contact'` — TermsView keeps its inline union; assigning it to `MarketingHeader`'s `(view: MarketingView) => void` prop requires TermsView's `onNavigate` to accept `'contact'` — it already does after the previous feature; AboutView uses the `as any` cast because its union is still narrower).
