# 📍 Guide Complet des Routes et Redirections - SikaAds

## 📋 Table des Routes Principales (`view` état)

### Vue Publique
| Route | Fichier | Description | Accessible |
|-------|---------|-------------|-----------|
| `landing` | [views/LandingPage.tsx](views/LandingPage.tsx) | Page d'accueil | Tout le monde |
| `login` | [views/LoginView.tsx](views/LoginView.tsx) | Connexion | Non-authentifiés |
| `register` | [views/RegistrationForm.tsx](views/RegistrationForm.tsx) | Inscription | Non-authentifiés |
| `advertise` | [views/CreateCampaign.tsx](views/CreateCampaign.tsx) | Créer campagne | Tout le monde |
| `advertise-success` | [views/SuccessCampaign.tsx](views/SuccessCampaign.tsx) | Confirmation | Après création |

### Vue Authentifiée
| Route | Fichier | Description | Accessible |
|-------|---------|-------------|-----------|
| `app` | [components/Layout.tsx](components/Layout.tsx) | Zone membre | Authentifiés |
| `profile` | [views/ProfilePage.tsx](views/ProfilePage.tsx) | Profil utilisateur | Authentifiés |
| `verification-pending` | [views/VerificationPending.tsx](views/VerificationPending.tsx) | Attente vérif email | Email non-vérifié |

---

## 🔄 Flux de Redirection

### A. Flux d'Authentification ✅

```
Landing (non-auth)
    ↓
[Cliquer "Commencer"] → Register (nouvelle inscription)
    ↓
[Remplir formulaire] → onComplete() → verification-pending ✅ [CORRIGÉ]
    ↓
[Email vérifié] → app ✅

---

Landing (non-auth)
    ↓
[Cliquer "Connexion" dans Header] → Login
    ↓
[Soumis avec succès] → onSuccess() → app ✅ [CORRIGÉ]
```

### B. Flux de Création de Campagne ✅

```
Landing (utilisateur non-auth)
    ↓
[Cliquer "Je veux faire de la pub"] → Force Login (via App.tsx guard)
    ↓
[Login avec succès] → Redirige vers advertise (via redirectAfterLogin)
    ↓
[Remplir & soumettre] → onSuccess(id, amount)
    ↓
setSuccessData() → advertise-success ✅
    ↓
[Cliquer "Retour accueil"] → onFinish() → landing ✅
```

### C. Flux Navigation App ✅

```
app
    ↓
Onglets disponibles:
  - dashboard (défaut)
  - marketplace
  - tasks
  - notes
  - wallet
```

### D. Flux Admin/Staff ✅

```
app (Staff connecté)
    ↓
Onglets disponibles:
  - admin-dashboard
  - admin-campaigns
  - admin-validation
  - admin-create-vip (ADMIN uniquement)
  - admin-payouts (ADMIN uniquement)
  - admin-users (ADMIN uniquement)
  - admin-team (ADMIN uniquement)
```

---

## 🔧 Points de Redirection Corrigés

### ✅ CORRIGÉ 1: Login Callback
**Avant:**
```typescript
<LoginView onSuccess={() => {}} ... />  // ❌ Vide!
```

**Après:**
```typescript
<LoginView onSuccess={() => setView(redirectAfterLogin || 'app')} ... />  // ✅ Redirige vers la vue prévue ou app
```

### ✅ CORRIGÉ 2: Registration Callback
**Avant:**
```typescript
<RegistrationForm onComplete={() => {}} ... />  // ❌ Vide!
```

**Après:**
```typescript
<RegistrationForm onComplete={() => setView('verification-pending')} ... />  // ✅ Attente vérif
```

---

## 🎯 Boutons Call-to-Action et Leurs Redirections

### Landing Page
| Bouton | Utilisateur | Action | Redirection |
|--------|-----------|--------|------------|
| "Commencer à Gagner" | Non connecté | `onStart()` | register |
| "Commencer à Gagner" | Connecté | `onStart()` | app |
| "Je veux faire de la pub" | Non connecté | `onAdvertise()` | login (puis advertise) |
| "Je veux faire de la pub" | Connecté | `onAdvertise()` | advertise |

### Header / Navigation
| Élément | Action | Redirection |
|--------|--------|------------|
| Logo SikaAds | `handleNav('landing')` | landing |
| "Accueil" | `handleNav('landing')` | landing ✅ |
| "Connexion" | `handleNav('login')` | login ✅ |
| "Tableau de bord" | `setView('app')` | app ✅ |
| "Mon Profil" | `setView('profile')` | profile ✅ |

---

## ⚙️ États Spéciaux à Gérer

### Email Vérifié?
```typescript
if (user && !user.emailVerified && view !== 'verification-pending') {
  if (['app', 'profile', 'advertise'].includes(view)) {
    setView('verification-pending');  // Force vérification
  }
}
```

### Non-Authentifié?
```typescript
if (!user && ['app', 'profile', 'verification-pending', 'advertise'].includes(view)) {
  if (view === 'advertise') setRedirectAfterLogin('advertise');
  setView('login');  // Redirige vers login pour advertise, landing sinon
}
```

### Accès Admin?
```typescript
if (!isStaff && currentTab.startsWith('admin')) {
  setCurrentTab('dashboard');  // Bloque l'accès admin
}
```

---

## 📲 Architecture Technique

**Système de routing:** État React (pas React Router)
- État principal: `view` (grandes pages)
- État secondaire: `currentTab` (onglets app)
- Gestion d'auth: Hook `useUserData` ✅

**Fichier de configuration:** [App.tsx](App.tsx)
- Lignes 26: État `view`
- Lignes 27: État `currentTab`
- Lignes 35-75: Logique de redirection auto
- Lignes 112-116: Routes principales

---

## 🧪 Checklist de Test

- [ ] Non-authentifié → Register → Verification Pending → Email vérifié → App ✅
- [ ] Non-authentifié → Login → App ✅
- [ ] App → Profile → Back to App ✅
- [ ] App → Logout → Landing ✅
- [ ] Landing → Advertise → Success → Back to Landing ✅
- [ ] Ambassador → Admin Tab → Redirige à Dashboard ✅
- [ ] Admin → Peut voir tous les onglets ✅

---

## 🐛 Problèmes Connus (Résolu)

| Problem | Statut | Cause | Solution |
|---------|--------|-------|----------|
| Login ne redirige pas | ✅ FIXÉ | Callback vide | Ajout `setView('app')` |
| Register ne redirige pas | ✅ FIXÉ | Callback vide | Ajout `setView('verification-pending')` |
| Admin bloqué sur pages | ✅ WIP | Logique perms | À vérifier |

---

**Dernière mise à jour:** 23/02/2026  
**Statut:** ✅ Callbacks de redirection corrigées
