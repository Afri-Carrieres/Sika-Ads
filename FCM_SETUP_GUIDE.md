# 🔔 Guide de configuration — Web Push Notifications FCM

## 🔑 Étape 1 : Récupérer les clés Firebase

### 1.1 — Clés de l'application Web Firebase

1. Ouvre [Firebase Console](https://console.firebase.google.com/project/sikaads-7b9bc/settings/general)
2. Va dans **Project Settings → General → Your apps**
3. Si aucune app Web n'existe, clique **Add app → Web (</> icon)**, nomme-la "SikaAds Web"
4. Copie les valeurs de la config Firebase :

```js
const firebaseConfig = {
  apiKey: "...",              // → VITE_FIREBASE_API_KEY
  authDomain: "...",          // → VITE_FIREBASE_AUTH_DOMAIN
  projectId: "...",           // → VITE_FIREBASE_PROJECT_ID
  storageBucket: "...",       // → VITE_FIREBASE_STORAGE_BUCKET
  messagingSenderId: "...",   // → VITE_FIREBASE_MESSAGING_SENDER_ID
  appId: "...",               // → VITE_FIREBASE_APP_ID
};
```

Colle ces valeurs dans `.env` à la fin du fichier.

---

### 1.2 — Clé VAPID (pour Web Push)

1. Va dans **Project Settings → Cloud Messaging**
2. Section **"Web Push certificates"**
3. Clique **"Generate key pair"**
4. Copie la **clé publique** → colle dans `VITE_FIREBASE_VAPID_KEY` dans `.env`

---

### 1.3 — Mettre à jour `public/firebase-messaging-sw.js`

Le Service Worker ne peut pas lire les variables Vite. Il faut copier les vraies valeurs directement :

Ouvre `public/firebase-messaging-sw.js` et remplace la section `firebase.initializeApp` :

```js
firebase.initializeApp({
  apiKey:            "COLLER_VITE_FIREBASE_API_KEY_ICI",
  authDomain:        "sikaads-7b9bc.firebaseapp.com",
  projectId:         "sikaads-7b9bc",
  storageBucket:     "sikaads-7b9bc.firebasestorage.app",
  messagingSenderId: "COLLER_VITE_FIREBASE_MESSAGING_SENDER_ID_ICI",
  appId:             "COLLER_VITE_FIREBASE_APP_ID_ICI",
});
```

> ⚠️ Ces valeurs sont **publiques** (visibles dans le code JS côté client de toute façon). La sécurité réelle vient des règles FCM côté serveur.

---

## 🔑 Étape 2 : Service Account pour l'Edge Function

1. Va dans [Firebase Console → Service Accounts](https://console.firebase.google.com/project/sikaads-7b9bc/settings/serviceaccounts/adminsdk)
2. Clique **"Generate new private key"**
3. Télécharge le fichier JSON
4. Configure le secret Supabase :

```bash
# Coller le contenu du JSON sur une seule ligne
supabase secrets set FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"sikaads-7b9bc",...}'
supabase secrets set FIREBASE_PROJECT_ID=sikaads-7b9bc
```

---

## 🗄️ Étape 3 : Migration SQL Supabase

Exécute la migration pour créer la table `push_subscriptions` :

```bash
supabase db push
```

Ou copie-colle le contenu de `supabase/migrations/20260728_push_subscriptions.sql` dans l'éditeur SQL de la console Supabase.

---

## 🚀 Étape 4 : Déployer l'Edge Function

```bash
supabase functions deploy send-push-notification
```

---

## 🧪 Étape 5 : Tester

1. Lance le projet en dev (déjà en cours : `npm run dev`)
2. Ouvre https://www.sika-ads.com (ou localhost après avoir configuré les clés)
3. Connecte-toi → La bannière verte "Activer les notifications" apparaît
4. Clique "Activer" → Chrome demande la permission
5. Accepte → Le token FCM est enregistré dans Supabase (`push_subscriptions`)
6. Teste l'envoi depuis la console Supabase :

```bash
curl -X POST https://zgzomwsujqtzjfmfhuow.functions.supabase.co/send-push-notification \
  -H "Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "<UUID_UTILISATEUR>",
    "title": "SikaAds 🎉",
    "body": "Test notification ! Ça fonctionne !",
    "data": { "type": "announcement", "url": "/#/app/dashboard" }
  }'
```

---

## 📲 Intégration dans les autres Edge Functions

Pour envoyer une notification lors de la validation d'une preuve, ajoute dans `admin-approve-withdrawal/index.ts` :

```typescript
// Après validation de la preuve / retrait
await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-push-notification`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    userId: ambassadorUserId,
    title: 'SikaAds 💰',
    body: `Votre retrait de ${amount} FCFA a été validé !`,
    data: { type: 'payout', url: '/#/app/wallet' }
  })
});
```

---

## ✅ Récapitulatif des fichiers créés

| Fichier | Rôle |
|---------|------|
| `supabase/migrations/20260728_push_subscriptions.sql` | Table SQL pour les tokens FCM |
| `config/firebase.ts` | Init Firebase Messaging |
| `public/firebase-messaging-sw.js` | Service Worker (notifications en arrière-plan) |
| `hooks/usePushNotifications.ts` | Hook React (permission + token + Supabase) |
| `components/PushNotificationBanner.tsx` | UI banner de demande de permission |
| `styles/push-notifications.css` | Styles premium glassmorphism |
| `supabase/functions/send-push-notification/index.ts` | Edge Function FCM |
