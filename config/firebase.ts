// ============================================================
// config/firebase.ts
// Initialisation de Firebase App + Firebase Cloud Messaging
// ============================================================
// VARIABLES D'ENVIRONNEMENT REQUISES (dans .env) :
//   VITE_FIREBASE_API_KEY
//   VITE_FIREBASE_AUTH_DOMAIN
//   VITE_FIREBASE_PROJECT_ID
//   VITE_FIREBASE_STORAGE_BUCKET
//   VITE_FIREBASE_MESSAGING_SENDER_ID
//   VITE_FIREBASE_APP_ID
//   VITE_FIREBASE_VAPID_KEY
// ============================================================

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getMessaging, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialiser une seule instance Firebase (évite les doublons en HMR)
const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

/**
 * Retourne une instance de Firebase Messaging, ou null si le navigateur
 * ne supporte pas les notifications push (iOS Safari < 16.4, etc.)
 */
export async function getFirebaseMessaging() {
  try {
    const supported = await isSupported();
    if (!supported) return null;
    return getMessaging(firebaseApp);
  } catch {
    return null;
  }
}

export { firebaseApp };
