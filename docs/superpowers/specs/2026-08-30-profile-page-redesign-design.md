# Redesign de la page Profil (/app/profile) — Design Doc

Date : 2026-08-30
Statut : Validé (brainstorming)

## Objectif

Refonte visuelle de `views/ProfilePage.tsx` pour un rendu « bento moderne » fidèle à la marque (indigo-600 / teal #128785 / orange #f55d05 / coque slate-950), conforme aux standards UI/UX 2026. **Seul le design change — aucune modification de logique, d'endpoints ou de schémas de données.**

## Contenu (inchangé)

- Carte d'identité : avatar (upload/suppression), nom, email, rôle, statut.
- Informations personnelles : nom, email (non modifiable), numéro Mobile Money.
- Sécurité du compte : changement de mot de passe (validation existante conservée).
- Notifications push : carte existante via `usePushNotifications` (comportement inchangé).
- Suppression de compte : modal avec confirmation `SUPPRIMER`.
- Bouton retour (`onBack`) conservé.

## Structure retenue (approche A — Héros + colonnes)

1. **En-tête** inchangé : bouton retour + « Mon Profil » + sous-titre discret (legèrement atténué).
2. **Carte Héros pleine largeur** :
   - Avatar 96px avec anneau dégradé indigo→teal (`conic/linear-gradient`), bouton caméra en overlay au survol.
   - Nom (titre), email (sous-titre gris), badge de rôle (« Membre »/« Admin », tuile teal/orange), puce de statut « Compte actif » (vert).
   - Lien discret « Supprimer la photo » (visible au survol de l'avatar si photoURL présent).
   - Fond : glow radial indigo/teal très léger.
3. **Bento 2 colonnes (desktop)** :
   - Colonne principale (2/3) : grande tuile **Informations personnelles**.
   - Colonne latérale (1/3) : tuile **Sécurité du compte** puis tuile **Notifications push** empilées.
4. **Zone de danger** : plage discrète grise en bas de page (bandeau « Suppression du compte » + bouton texte rouge), au lieu de la tuile rouge bordée.

## Tokens visuels

- Fond de page : `gray-50`. Tuiles : blanc, `rounded-3xl` (24px), bordure `gray-100` extérieure.
  Ombre : `shadow-[0_1px_3px_rgba(15,23,42,0.06),0_8px_24px_rgba(15,23,42,0.04)]`.
- En-têtes de tuile : icône dans carré `indigo-50`/`emerald-50` + titre `font-bold` 15-16px, espacement plutôt que séparateurs.
- Labels de champ : `text-[11px] font-semibold text-gray-500` (suppression de `uppercase tracking-widest`).
- Champs : fond `gray-50`, bordure `gray-200`, focus = anneau `indigo-500/40` + fond blanc, icônes `gray-400`.
- Boutons primaires : `indigo-600→700`, `rounded-xl`, `active:scale-95`, transition 150ms, sans `uppercase tracking-widest`.
- Placeholder utile pour le téléphone : `+228 90 00 00 00`.

## Micro-interactions (subtiles)

- Tuiles : `hover:-translate-y-0.5` + ombre renforcée au survol.
- Avatar : léger scale + overlay caméra au survol.
- Toasts de succès : glissement depuis la droite (existant, conservé).
- Focus des champs en anneau. Aucune animation d'entrée bruyante (l'`animate-in` léger existant est conservé).

## États

- **Chargement** : skeleton pulsant léger à la place du spinner plein écran (coque restant visible).
- **Erreurs** : bandeau `red-50` arrondi dans la tuile concernée ; suppression des `alert()` natifs (upload avatar, sauvegarde infos → toast d'erreur). Le `confirm()` de suppression d'avatar est conservé tel quel.
- **Modal suppression** : restyle — icône carré rouge, backdrop `backdrop-blur-md`, bouton inactif tant que champ ≠ `SUPPRIMER`, spinner pendant chargement. Logique inchangée.

## Responsive

Ordre mono-colonne mobile : Héros → Infos personnelles → Sécurité → Notifications push → Zone danger.
Pas de défilement horizontal. Tap targets ≥ 44px.

## Refactoring (sans changement de comportement)

- Tri des imports lucide (retrait des icônes devenus inutiles, ex. `BellOff` si la carte unsupported est conservée, `AlertCircle`, etc.).
- Réorganisation JSX de `ProfilePage.tsx` selon la structure ci-dessus ; hooks et handlers (`handleFileChange`, `handleDeleteAvatar`, `handleSaveInfo`, `handleChangePassword`, `handleDeleteAccount`, `showSuccess`) **non modifiés**.
- `PushNotificationSettingsCard` conservée en haut du modèle, stylée.

## Non-objectifs

- Aucune modification de données (tables, colonnes, stockage).
- Aucune modification de la logique d'auth, des validations, de la coque Layout.
- Aucune section nouvelle (stats, solde, code de parrainage…).