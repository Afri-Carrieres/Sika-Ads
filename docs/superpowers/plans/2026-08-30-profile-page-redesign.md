# Redesign Page Profil (bento 2026) — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refonte visuelle complète de `views/ProfilePage.tsx` en « bento moderne » fidèle à la marque, conforme aux standards UI/UX 2026, sans aucun changement de logique.

**Architecture:** fichier unique `views/ProfilePage.tsx` (composant `ProfilePage` + `PushNotificationSettingsCard`). Introduction de constantes de design tokens en tête de module, réorganisation du JSX en : carte Héros pleine largeur → grille bento 2 colonnes (Infos + Sécurité/Notifications) → zone de danger discrète. Aucune librairie ajoutée (Tailwind + lucide-react existants). Les handlers, hooks et appels Supabase restent **inchangés**.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS v3, lucide-react, Tailwind `animate-in` (tw-animate-css via index.css, déjà utilisé ailleurs dans l'app).

## Global Constraints

- **Logique intouchable** : `handleFileChange`, `handleDeleteAvatar` (garde `confirm()` conservée), `handleSaveInfo`, `handleChangePassword`, `handleDeleteAccount`, `showSuccess`, vues `verification-pending`, endpoints, tables, storage : AUCUNE modification.
- **Palette** : fond page `bg-gray-50`, tuiles `bg-white rounded-3xl border border-gray-100`, ombre `shadow-[0_1px_3px_rgba(15,23,42,0.06),0_8px_24px_rgba(15,23,42,0.04)]`. Accents : indigo-600 (primaire), teal #128785 (secondary, teal-* classes), orange #f55d05 (Admin), emerald (statut/succès), red (destructif).
- **Typographie** : labels de champ `text-[11px] font-semibold text-gray-500` (PAS d'`uppercase tracking-widest` sur labels ni boutons). Titres `font-black tracking-tight`.
- **Micro-interactions subtiles** : tuiles hover `-translate-y-0.5` + ombre renforcée, boutons `active:scale-95`, focus champs anneau `indigo-500/40`.
- **Ordre mobile (mono-colonne)** : Héros → Infos personnelles → Sécurité → Notifications push → Zone de danger. Tap targets ≥ 44px. Aucun défilement horizontal.
- **Pas d'`alert()` natif** (sauf le `confirm()` de suppression d'avatar) : erreurs upload/sauvegarde → toast d'erreur.
- **Vérification** : `npx tsc --noEmit -p tsconfig.json` puis filtrer sur `ProfilePage` (les erreurs préexistantes dans `views/updateInComming.jsx` sont CONNUES et non liées — les ignorer) ; puis `npm run build` doit passer. Contrôle visuel via `npm run dev`.
- Type `User` et enum `UserRole` importés depuis `'../types'`. Alias `@/` → racine (utilisé pour hooks).

---

### Task 1: Tokens de design + toast d'erreur + skeleton de chargement + en-tête

**Files:**
- Modify: `views/ProfilePage.tsx` (toutes les sections)

**Interfaces:**
- Produces: constantes module `TILE`, `TILE_HOVER`, `FIELD`, `LABEL`, `PRIMARY_BTN`, `SECTION_ICON` ; state `errorMessage` + helper `showError(msg)` ; nouveau rendu skeleton ; style toast erreur.

- [ ] **Step 1: Ajouter les tokens de design en tête de module** (après les imports, avant `PushNotificationSettingsCard`)

```tsx
const TILE = 'bg-white rounded-3xl border border-gray-100 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_8px_24px_rgba(15,23,42,0.04)]';
const TILE_HOVER = 'transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[0_2px_6px_rgba(15,23,42,0.08),0_16px_40px_rgba(15,23,42,0.08)]';
const FIELD = 'w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 pl-12 focus:ring-2 focus:ring-indigo-500/40 focus:bg-white outline-none font-semibold text-gray-900 transition-all';
const LABEL = 'text-[11px] font-semibold text-gray-500 ml-1 mb-2 block';
const SECTION_ICON = 'p-2.5 rounded-xl';
const PRIMARY_BTN = 'px-6 py-3.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed';
const EMERALD_BTN = 'px-6 py-3.5 bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-100 hover:bg-emerald-700 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed';
```

- [ ] **Step 2: Ajouter le state et le helper d'erreur** (à côté de `successMessage`, ~ligne 102)

```tsx
const [errorMessage, setErrorMessage] = useState('');
```

```tsx
const showError = (msg: string) => {
  setErrorMessage(msg);
  setTimeout(() => setErrorMessage(''), 4000);
};
```

(+ remplacer les appels `alert(...)` de `handleFileChange` (ligne ~171 → `showError("Erreur lors du téléchargement de l'image.")`) et de `handleSaveInfo` (ligne ~231 → `showError("Une erreur est survenue lors de la sauvegarde.")`).)

- [ ] **Step 3: Remplacer le rendu skeleton** (bloc `if (loading) { ... }`, lignes 321-327)

```tsx
if (loading) {
  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 animate-pulse">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="h-9 w-56 bg-gray-200 rounded-xl" />
        <div className="h-44 bg-white rounded-3xl border border-gray-100" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-80 lg:col-span-2 bg-white rounded-3xl border border-gray-100" />
          <div className="space-y-6">
            <div className="h-72 bg-white rounded-3xl border border-gray-100" />
            <div className="h-36 bg-white rounded-3xl border border-gray-100" />
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Restyler le toast succès + ajouter le toast erreur** (remplacer le bloc toast existant, lignes 348-353)

```tsx
{successMessage && (
  <div className="fixed top-24 right-4 z-50 bg-emerald-600 text-white px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-in slide-in-from-right duration-300">
    <CheckCircle2 size={20} />
    <span className="font-bold text-sm">{successMessage}</span>
  </div>
)}
{errorMessage && (
  <div className="fixed top-24 right-4 z-50 bg-red-600 text-white px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-in slide-in-from-right duration-300">
    <AlertCircle size={20} />
    <span className="font-bold text-sm">{errorMessage}</span>
  </div>
)}
```

- [ ] **Step 5: Ajouter l'import `User`/`UserRole`** (ligne ~5)

```tsx
import { User, UserRole } from '../types';
```

- [ ] **Step 6: Vérifier** — `npx tsc --noEmit -p tsconfig.json` (aucune erreur dans ProfilePage.tsx) puis `npm run build` (✓ built). Contrôle visuel dev : skeleton au chargement, toasts OK.
- [ ] **Step 7: Commit**

```bash
git add views/ProfilePage.tsx
git commit -m "style(profile): tokens, toasts erreur, skeleton"
```

---

### Task 2: Carte Héros + badge de rôle + interactions avatar

**Files:**
- Modify: `views/ProfilePage.tsx` (remplace la colonne gauche avatar, lignes ~355-406)

**Interfaces:**
- Consumes: `TILE`, `TILE_HOVER`, `userData`, `UserRole`, `photoURL`, `displayName`, `isUploading`, `fileInputRef`, `handleDeleteAvatar`, `handleFileChange`, icônes `Camera`, `Trash2`, `UserIcon`, `Loader2`.

- [ ] **Step 1: Restructurer le rendu** — remplacer le wrapper `max-w-full ... grid grid-cols-1 md:grid-cols-4 gap-8` (ligne 355) par un wrapper `max-w-6xl mx-auto space-y-8`, puis insérer la carte Héros juste après l'en-tête / toasts :

```tsx
{/* Hero */}
<div className={`${TILE} ${TILE_HOVER} p-8 relative overflow-hidden`}>
  <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-gradient-to-br from-indigo-100/70 to-teal-100/40 blur-3xl pointer-events-none" aria-hidden />
  <div className="relative flex flex-col sm:flex-row sm:items-center gap-6">
    <div className="relative group shrink-0">
      <div className={`w-24 h-24 rounded-full p-[3px] bg-gradient-to-br from-indigo-500 to-teal-400 ${isUploading ? 'opacity-70' : ''}`}>
        <div className="w-full h-full rounded-full overflow-hidden bg-white flex items-center justify-center">
          {photoURL ? (
            <img src={photoURL} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <span className="text-3xl font-black text-blue-700 select-none">
              {displayName ? displayName.charAt(0).toUpperCase() : <UserIcon size={40} />}
            </span>
          )}
        </div>
      </div>
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="absolute bottom-0.5 right-0.5 p-2.5 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 hover:scale-105 transition-all disabled:opacity-70"
        aria-label="Changer la photo de profil"
      >
        {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
      </button>
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
    </div>

    <div className="flex-1 min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-xl font-black text-gray-900 tracking-tight truncate">{displayName || 'Utilisateur'}</h2>
        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${userData?.role === UserRole.ADMIN ? 'bg-orange-50 text-orange-700 border-orange-200' : userData?.role === UserRole.MODERATOR ? 'bg-teal-50 text-teal-700 border-teal-200' : 'bg-indigo-50 text-indigo-700 border-indigo-200'}`}>
          {userData?.role === UserRole.ADMIN ? 'Admin' : userData?.role === UserRole.MODERATOR ? 'Modérateur' : 'Ambassadeur'}
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Compte actif
        </span>
      </div>
      <p className="text-sm text-gray-500 font-medium mt-1 truncate">{user?.email}</p>
      {photoURL && (
        <button
          onClick={handleDeleteAvatar}
          disabled={isUploading}
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:text-red-600 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all disabled:opacity-50"
        >
          <Trash2 size={13} />
          Supprimer la photo
        </button>
      )}
    </div>
  </div>
</div>
```

- [ ] **Step 2: Supprimer** l'ancienne colonne gauche (`<div className="md:col-span-1 space-y-6">` avatar + `PushNotificationSettingsCard`, lignes ~358-406) — la carte Notifications push sera replacée dans la Task 5.
- [ ] **Step 3: Vérifier** — `npm run build` (✓ built). Contrôle visuel : héro pleine largeur, badge de rôle Admin/Ambassadeur, puce verte, suppression photo au survol.
- [ ] **Step 4: Commit**

```bash
git add views/ProfilePage.tsx
git commit -m "style(profile): carte héro + badges"
```

---

### Task 3: Tuile Informations personnelles

**Files:**
- Modify: `views/ProfilePage.tsx` (remplace le premier `<form ...>` de la colonne droite, lignes ~411-472)

**Interfaces:**
- Consumes: `TILE`, `TILE_HOVER`, `FIELD`, `LABEL`, `PRIMARY_BTN`, `SECTION_ICON`, `handleSaveInfo`, `displayName`, `setDisplayName`, `momoNumber`, `setMomoNumber`, `user?.email`, `isSaving`.

- [ ] **Step 1: Remplacer le formulaire infos** par la version bento (dans la future grille, la tuile occupe 2/3)

```tsx
<form onSubmit={handleSaveInfo} className={`${TILE} ${TILE_HOVER} lg:col-span-2 p-8 space-y-6`}>
  <div className="flex items-center gap-3 mb-2">
    <div className={`${SECTION_ICON} bg-indigo-50 text-indigo-600`}>
      <UserIcon size={20} />
    </div>
    <h3 className="text-lg font-bold text-gray-900">Informations personnelles</h3>
  </div>

  <div className="space-y-4">
    <label className="block">
      <span className={LABEL}>Nom complet</span>
      <div className="relative">
        <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className={FIELD}
          placeholder="Votre nom"
        />
      </div>
    </label>

    <label className="block">
      <span className={LABEL}>Adresse email (non modifiable)</span>
      <div className="relative opacity-60">
        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="email"
          value={user?.email || ''}
          disabled
          className="w-full bg-gray-100 border border-gray-200 rounded-2xl p-4 pl-12 font-semibold text-gray-500 cursor-not-allowed"
        />
      </div>
    </label>

    <label className="block">
      <span className={LABEL}>Numéro de téléphone (Mobile Money)</span>
      <div className="relative">
        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          value={momoNumber}
          onChange={(e) => setMomoNumber(e.target.value)}
          className={FIELD}
          placeholder="+228 90 00 00 00"
        />
      </div>
    </label>
  </div>

  <div className="pt-2 flex justify-end">
    <button type="submit" disabled={isSaving} className={PRIMARY_BTN}>
      {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
      Enregistrer
    </button>
  </div>
</form>
```

- [ ] **Step 2: Vérifier** — `npm run build` (✓ built). Contrôle visuel : tuile 2/3, champs avec anneau indigo au focus, placeholder téléphone, bouton sans uppercase.
- [ ] **Step 3: Commit**

```bash
git add views/ProfilePage.tsx
git commit -m "style(profile): tuile infos personnelles"
```

---

### Task 4: Tuile Sécurité du compte

**Files:**
- Modify: `views/ProfilePage.tsx` (remplace le `<form ...>` Sécurité de la colonne droite, lignes ~500-572)

**Interfaces:**
- Consumes: `TILE`, `TILE_HOVER`, `FIELD`, `LABEL`, `PRIMARY_BTN` (variante emerald via override), `SECTION_ICON`, `handleChangePassword`, `currentPassword`, `newPassword`, `confirmPassword` + setters, `passwordError`, `isChangingPassword`.

- [ ] **Step 1: Remplacer le formulaire sécurité** (colonne latérale, empilé au-dessus des notifications)

```tsx
<form onSubmit={handleChangePassword} className={`${TILE} ${TILE_HOVER} p-8 space-y-4`}>
  <div className="flex items-center gap-3 mb-2">
    <div className={`${SECTION_ICON} bg-emerald-50 text-emerald-600`}>
      <ShieldCheck size={20} />
    </div>
    <h3 className="text-lg font-bold text-gray-900">Sécurité du compte</h3>
  </div>

  {passwordError && (
    <div className="flex items-center gap-2 p-3.5 bg-red-50 text-red-700 rounded-2xl border border-red-100">
      <AlertCircle size={18} className="shrink-0" />
      <p className="text-xs font-bold">{passwordError}</p>
    </div>
  )}

  <div className="space-y-4">
    <label className="block">
      <span className={LABEL}>Mot de passe actuel</span>
      <div className="relative">
        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className={FIELD}
          placeholder="Votre mot de passe actuel"
          autoComplete="current-password"
        />
      </div>
    </label>

    <label className="block">
      <span className={LABEL}>Nouveau mot de passe</span>
      <div className="relative">
        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className={FIELD}
          placeholder="Minimum 6 caractères"
          autoComplete="new-password"
        />
      </div>
    </label>

    <label className="block">
      <span className={LABEL}>Confirmer le nouveau mot de passe</span>
      <div className="relative">
        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className={FIELD}
          placeholder="Repetez le nouveau mot de passe"
          autoComplete="new-password"
        />
      </div>
    </label>
  </div>

  <div className="pt-2 flex justify-end">
    <button
      type="submit"
      disabled={isChangingPassword}
      className={EMERALD_BTN}
    >
      {isChangingPassword ? <Loader2 className="animate-spin" size={20} /> : <Lock size={20} />}
      Modifier
    </button>
  </div>
</form>
```

- [ ] **Step 2: Vérifier** — `npm run build` (✓ built). Contrôle visuel : tuile 1/3 à droite, accents emerald.
- [ ] **Step 3: Commit**

```bash
git add views/ProfilePage.tsx
git commit -m "style(profile): tuile sécurité"
```

---

### Task 5: Carte Notifications push

**Files:**
- Modify: `views/ProfilePage.tsx` (composant `PushNotificationSettingsCard`, lignes 7-78, + l'insertion dans la colonne latérale)

**Interfaces:**
- Consumes: `TILE`, `SECTION_ICON`, hook `usePushNotifications` (inchangé).

- [ ] **Step 1: Restyler l'état « non supporté »** du composant (lignes 12-23) : `className={...TILE}`, icône `bg-gray-100 text-gray-400`, titre identique.
- [ ] **Step 2: Restyler l'état principal** (lignes 27-76) : même structure (statut + bouton), avec `class="rounded-xl"` sur les boutons, icône `bg-indigo-50 text-indigo-600`, Petites tuiles retirées pour fond `bg-white` (TILE), pastilles de statut colorées conservées, textes `font-medium`.
- [ ] **Step 3: Insérer la carte** dans la colonne latérale (sous la tuile Sécurité) :

```tsx
<div className="space-y-6">
  {/* Sécurité (Task 4) */}
  <PushNotificationSettingsCard userId={user?.id ?? null} />
</div>
```

- [ ] **Step 4: Vérifier** — `npm run build` (✓ built). Contrôle visuel : carte notifications sous sécurité, états Actif/Bloqué/Inactif.
- [ ] **Step 5: Commit**

```bash
git add views/ProfilePage.tsx
git commit -m "style(profile): carte notifications push"
```

---

### Task 6: Zone de danger discrète + modal deletion restyle

**Files:**
- Modify: `views/ProfilePage.tsx` (bloc Zone de Danger lignes ~477-495 + modal lignes ~580-614)

**Interfaces:**
- Consumes: `showDeleteModal`, `setShowDeleteModal`, `deleteConfirmation`, `setDeleteConfirmation`, `isDeleting`, `handleDeleteAccount`.

- [ ] **Step 1: Remplacer la tuile rouge** par le bandeau discret (placé après la grille bento, tout en bas) :

```tsx
{/* Danger Zone */}
<div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between p-6 bg-white rounded-3xl border border-gray-200">
  <div className="flex items-start gap-3">
    <div className="bg-red-50 p-2.5 rounded-xl text-red-500 shrink-0">
      <AlertTriangle size={18} />
    </div>
    <div>
      <h3 className="text-sm font-bold text-gray-900">Suppression du compte</h3>
      <p className="text-xs text-gray-500 font-medium mt-0.5 leading-relaxed">
        Cette action est irréversible : toutes vos données, y compris votre solde non retiré et vos historiques, seront définitivement effacées.
      </p>
    </div>
  </div>
  <button
    onClick={() => setShowDeleteModal(true)}
    className="shrink-0 px-4 py-2.5 rounded-xl text-xs font-bold text-red-600 border border-red-200 hover:bg-red-50 transition-all"
  >
    Supprimer mon compte
  </button>
</div>
```

- [ ] **Step 2: Restyler la modal** (contenu inchangé) : fond `bg-black/60 backdrop-blur-md`, carte `bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl`, icône `bg-red-100 w-12 h-12 rounded-2xl text-red-600`, bouton fermer circulaire, champ centré avec `focus:border-red-500`, bouton inactif `disabled:bg-gray-100 disabled:text-gray-400`.
- [ ] **Step 3: Vérifier** — `npm run build` (✓ built). Contrôle visuel : bandeau discret en bas, modal responsive.
- [ ] **Step 4: Commit**

```bash
git add views/ProfilePage.tsx
git commit -m "style(profile): zone danger + modal"
```

---

### Task 7: Grille bento + nettoyage imports + vérification finale

**Files:**
- Modify: `views/ProfilePage.tsx`

**Interfaces:**
- Consumes: toutes les tuiles des Tasks 1-6.

- [ ] **Step 1: Structurer la grille bento** autour des tuiles Infos (Task 3) et latérale (Sécurité + Notifications) :

```tsx
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
  {/* form Infos : lg:col-span-2 */}
  <div className="space-y-6">
    {/* form Sécurité */}
    <PushNotificationSettingsCard userId={user?.id ?? null} />
  </div>
</div>
```

(Supprimer tout reliquat de l'ancienne grille `md:grid-cols-4`, des colonnes orphelines, `md:col-span-*` obsolètes.)

- [ ] **Step 2: Retirer les imports lucide devenus inutiles** : garder uniquement `User as UserIcon, Camera, Phone, Mail, Save, Trash2, AlertTriangle, Loader2, X, CheckCircle2, ArrowLeft, Lock, ShieldCheck, AlertCircle, Bell, BellOff` ; supprimer tout autre import non référencé après les tasks 1-6 (ex. `X` reste utilisé par la modal). Vérifier par Ctrl+F que chaque icône importée est utilisée.
- [ ] **Step 3: Vérification finale complète**

```bash
npx tsc --noEmit -p tsconfig.json
npm run build
```

Attendu : aucune erreur TypeScript dans `views/ProfilePage.tsx` (ignorer les erreurs préexistantes de `views/updateInComming.jsx`) ; `✓ built`.

- [ ] **Step 4: Contrôle visuel mobile + desktop** (`npm run dev`) — ordre mobile Héros → Infos → Sécurité → Notifications → Danger ; pas de scroll horizontal ; tap targets OK ; hover tuiles avec lift ; focus champs.
- [ ] **Step 5: Commit final**

```bash
git add views/ProfilePage.tsx
git commit -m "style(profile): grille bento + nettoyage"
```

---

## Self-Review

- **Spec coverage** : Section Héros (T2), Infos (T3), Sécurité (T4), Notifications (T5), Danger+Modal (T6), Skeleton/toasts/typographie/tokens (T1), grille/mobile/nettoyage (T7) ✓. Logique intacte, `confirm()` avatar conservé ✓.
- **Placeholder scan** : toutes les étapes contiennent du code concret ou des instructions précises ✓.
- **Type consistency** : tokens/state nommés une seule fois et réutilisés à l'identique ; `UserRole` importé en T1, employé en T2 ✓.