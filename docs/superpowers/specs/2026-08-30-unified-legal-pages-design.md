# Design Spec — Harmonisation des pages « Légal & Aide »

**Date:** 2026-08-30
**Statut:** Approuvé par le client (chat, 30/08/2026)
**Portée:** `/legal`, `/terms`, `/contact` (+ header de `/about`), projet Sika Ads (Vite + React + Tailwind, SPA routing via `App.tsx`).

## Objectif

Les pages du menu footer « Légal & Aide » (Mentions Légales, CGU & Anti-Fraude, Confidentialité → `/legal`, Support Client → `/contact`) doivent avoir exactement le même design : même header de navigation, même hero, même structure de corps (sommaire sticky + sections numérotées en cartes blanches).

## Décisions prises (client)

1. **Niveau :** refonte complète (header + hero + corps unifiés), pas juste le header.
2. **Couleurs :** template unique mais **accent propre par page** dans le badge/hero — Contact = teal, Legal = indigo, Terms = rouge. Le rouge CGU reste aussi dans ses encadrés internes existants.
3. **Layout du corps :** celui de `/terms` actuel (sidebar sticky « Sommaire » + sections numérotées 01-07 en cartes), appliqué à `/legal`. `/contact` garde sa layout formulaire (déjà premium et alignée).
4. **Technique :** approche A — composants partagés (une seule source du header/hero).
5. **Contenu juridique :** textuellement **inchangé** ; seule la présentation change.

## Nouveaux composants

### `components/MarketingHeader.tsx`
- Reprend tel quel le header fixe de `AboutView`/`ContactView` : fond blanc/95 backdrop-blur, ombre au scroll (`scrolled` state + listener), logo `Header-LogoSika-Ads.png` → `onNavigate('landing')`, nav desktop (Accueil, Mentions Légales, Conditions, Contact), CTA orange `#ea580c` « Commencer » (icône LogIn), bouton Menu mobile (`md:hidden`) + `MobileDrawer`.
- Props :
  ```ts
  interface MarketingHeaderProps {
    onNavigate: (view: 'landing' | 'about' | 'legal' | 'terms' | 'contact') => void;
    onStart?: () => void;
    active: 'about' | 'legal' | 'terms' | 'contact';
  }
  ```
- Item actif en desktop : `<span aria-current="page" class="text-sm font-bold text-[#128785]">` (non cliquable) ; autres items = boutons.
- Gère son propre `menuOpen`/`scrolled` ; `navLinks` du drawer interne : Accueil, Mentions Légales, Conditions & CGU (+ Contact pour les pages legal/terms via `active !== 'contact'`).
- Exporte `export type MarketingView = 'landing' | 'about' | 'legal' | 'terms' | 'contact';` (réutilisé par `ContactView`, qui supprime sa copie locale `ContactViewName`).

### `components/PageHero.tsx`
- Hero `bg-slate-950 relative py-24 sm:py-28 overflow-hidden` + glow `bg-indigo-600/20 blur-[140px]` (celle de `ContactView` actuelle).
- Props :
  ```ts
  interface PageHeroProps {
    badge: string;                       // uppercase via classes
    title: React.ReactNode;              // H1 (peut contenir un <span> gradient)
    subtitle?: string;
    accent?: 'teal' | 'indigo' | 'red';  // défaut 'teal'
    children?: React.ReactNode;          // CTA éventuels sous le sous-titre (page About non concernée ici)
  }
  ```
- Badge : pill `px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border` ; classes par accent — teal : `bg-[#128785]/10 border-[#128785]/25 text-[#2dd4bf]` ; indigo : `bg-indigo-500/10 border-indigo-500/25 text-indigo-400` ; red : `bg-red-500/10 border-red-500/20 text-red-500`.
- H1 : `font-heading text-4xl md:text-6xl font-black text-white leading-tight` (un seul H1 par page).
- Sous-titre : `text-lg text-slate-400 leading-relaxed max-w-2xl font-medium`.

## Refonte des pages

### `views/LegalView.tsx`
- Supprime : fil d'Ariane sticky, chips TOC sticky horizontales, état `expandedSection` et accordéon (les 7 sections deviennent **toujours visibles**).
- Structure cible = celle de `TermsView` :
  - `MarketingHeader active="legal"` + wrapper `pt-10` (comme Terms/Contact).
  - `PageHero accent="indigo"` : badge « Transparence & Droits » (sans emoji), H1 « Mentions Légales », sous-titre actuel (« Toutes les informations légales… ») + ligne « Dernière mise à jour : Avril 2026 » conservée.
  - Corps `grid lg:grid-cols-3` : sidebar sticky à gauche (`Sommaire` + liens d'ancres n° 01-07 éditrice des ids existants `publisher, hosting, data, cookies, rights, liability, changes` + carte « Besoin d'aide ? » liant `/contact`), colonne de droite `lg:col-span-2` avec les sections numérotées `<span>01</span><h2>` style Terms, cartes `bg-slate-50 rounded-[2rem] border-slate-100`.
  - Icônes par section conservées (User/Globe/Database/AlertCircle/Shield/Zap/FileText) avec leur couleur d'accent interne actuelle.
  - Section de bas actuelle (bloc infos/contact `py-16 bg-gradient…`, ligne 417) conservée telle quelle, puis `Footer`.
- **Intégrité du contenu :** chaque paragraphe/texte des accordéons actuels est recopié mot pour mot dans les nouvelles cartes ; vérifier ligne à ligne contre l'ancien fichier lors de l'implémentation.

### `views/TermsView.tsx`
- Ajoute `MarketingHeader active="terms"` (aucun header aujourd'hui) ; wrapper `pt-10` déjà présent.
- Hero image rouge → `PageHero accent="red"` : badge « Confiance & Sécurité », H1 « CGU & Protection Anti-Fraude. » (span gradient rouge→indigo conservé via `title`), sous-titre actuel. L'image `/anti_fraud.png` et `ogImage` SEO restent dans `SEOHead`.
- Corps 3 colonnes, sidebar Sommaire (ids `objet, eligibilite, remuneration, antifraude, resiliation`), bloc rouge anti-fraude, carte « Besoin d'aide ? » → la faire pointer sur `/contact` (`onNavigate('contact')`) au lieu du bouton mort actuel.
- CTA bas de page et `Footer` inchangés.

### `views/ContactView.tsx`
- Remplace son header inline par `MarketingHeader active="contact"` (comportement identique) et sa hero inline par `PageHero accent="teal"` (mêmes textes badge/H1/sous-titre).
- Supprime `ContactViewName` local au profit de `MarketingView` ; supprime `menuOpen`/`scrolled`/drawer de la page.
- Corps (formulaire multistep), FAQ, CTA final, Footer inchangés.

### `views/AboutView.tsx` (hors menu, dérive évitée)
- Uniquement : header inline → `MarketingHeader active="about"` ; sa hero marketing (CTA Trouver des créateurs / Devenir créateur) et tout le reste inchangés.

## Validation

- `npm run build` exit 0 ; `npx tsc --noEmit` sans nouvelle erreur (baseline = erreurs préexistantes `views/updateInComming.jsx`).
- Visuel `/legal` `/terms` `/contact` `/about` : header identique sur les 4 (item actif correct), hero même gabarit avec accent indigo/rouge/teal/indigo, aucune régression de scroll horizontal à 320px, ancres de sommaire fonctionnelles, drawer mobile fonctionnel.
- Diff du texte de `LegalView` : contenu juridique mot pour mot préservé.

## Hors scope

- Modification du contenu juridique ou du copy des pages.
- Refonte de la hero de `/about`, du `components/Header.tsx` legacy (commenté), de `/register`, `/login`, du dashboard.
- Redirection `/legal` scindée en page Confidentialité séparée (Confidentialité reste une ancre de `/legal`).
