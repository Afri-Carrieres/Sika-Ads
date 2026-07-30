// ============================================================
// config/firebase.ts
// Initialisation Firebase (client) + Firebase Cloud Messaging
// ============================================================

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getMessaging, isSupported, type Messaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Évite la double initialisation en dev (HMR) ou si le fichier est importé
// plusieurs fois.
export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

let messagingInstance: Messaging | null = null;
let swRegistration: ServiceWorkerRegistration | null = null;

// ── Enregistre le service worker dédié à FCM ────────────────────
// C'est CETTE étape qui manquait : sans elle, navigator.serviceWorker.ready
// ne se résout jamais et getToken() reste bloqué indéfiniment.
async function registerFirebaseServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  if (swRegistration) return swRegistration;

  try {
    // Vérifie si un SW est déjà enregistré pour ce scope avant d'en
    // recréer un (utile en dev avec le hot-reload).
    const existing = await navigator.serviceWorker.getRegistration('/firebase-cloud-messaging-push-scope');
    if (existing) {
      swRegistration = existing;
      return existing;
    }

    swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/firebase-cloud-messaging-push-scope',
    });

    console.log('[Firebase] Service worker FCM enregistré ✅');
    return swRegistration;
  } catch (err) {
    console.error('[Firebase] Échec enregistrement du service worker FCM:', err);
    return null;
  }
}

// ── Retourne une instance Messaging (ou null si non supporté) ──
export async function getFirebaseMessaging(): Promise<Messaging | null> {
  if (messagingInstance) return messagingInstance;

  // isSupported() vérifie que le navigateur gère Service Worker + Push API
  // (Safari < 16, navigateurs en iframe, etc. renvoient false).
  const supported = await isSupported().catch(() => false);
  if (!supported) {
    console.warn('[Firebase] FCM non supporté sur ce navigateur.');
    return null;
  }

  const registration = await registerFirebaseServiceWorker();
  if (!registration) {
    console.warn('[Firebase] Impossible d\'obtenir le service worker FCM.');
    return null;
  }

  messagingInstance = getMessaging(firebaseApp);
  return messagingInstance;
}

// Exposé pour que le hook puisse passer la registration à getToken()
// sans redépendre de navigator.serviceWorker.ready.
export async function getFirebaseSwRegistration(): Promise<ServiceWorkerRegistration | null> {
  return registerFirebaseServiceWorker();
}



// // ============================================================
// // config/firebase.ts
// // Initialisation de Firebase App + Firebase Cloud Messaging
// // ============================================================
// // VARIABLES D'ENVIRONNEMENT REQUISES (dans .env) :
// //   VITE_FIREBASE_API_KEY
// //   VITE_FIREBASE_AUTH_DOMAIN
// //   VITE_FIREBASE_PROJECT_ID
// //   VITE_FIREBASE_STORAGE_BUCKET
// //   VITE_FIREBASE_MESSAGING_SENDER_ID
// //   VITE_FIREBASE_APP_ID
// //   VITE_FIREBASE_VAPID_KEY
// // ============================================================

// import { initializeApp, getApps, getApp } from 'firebase/app';
// import { getMessaging, isSupported } from 'firebase/messaging';

// const firebaseConfig = {
//   apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
//   authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
//   projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
//   storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
//   messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
//   appId:             import.meta.env.VITE_FIREBASE_APP_ID,
// };

// // Initialiser une seule instance Firebase (évite les doublons en HMR)
// const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// /**
//  * Retourne une instance de Firebase Messaging, ou null si le navigateur
//  * ne supporte pas les notifications push (iOS Safari < 16.4, etc.)
//  */
// export async function getFirebaseMessaging() {
//   try {
//     const supported = await isSupported();
//     if (!supported) return null;
//     return getMessaging(firebaseApp);
//   } catch {
//     return null;
//   }
// }

// export { firebaseApp };
