// ============================================================
// public/firebase-messaging-sw.js
// Service Worker Firebase Cloud Messaging
// ============================================================
// ⚠️  Ce fichier DOIT rester à la racine du domaine (/firebase-messaging-sw.js)
//     Il est servi statiquement depuis /public/
// ⚠️  Ne pas importer depuis node_modules ici (Service Worker env ≠ browser)
//     On utilise les CDN compat scripts.
// ============================================================

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// ── Configuration Firebase ────────────────────────────────────
// Ces valeurs sont publiques (elles se retrouvent dans le bundle JS de toute façon).
// La sécurité réelle vient des règles Firestore/FCM côté serveur.
firebase.initializeApp({
  apiKey:            self.FIREBASE_API_KEY            || '__VITE_FIREBASE_API_KEY__',
  authDomain:        self.FIREBASE_AUTH_DOMAIN        || '__VITE_FIREBASE_AUTH_DOMAIN__',
  projectId:         self.FIREBASE_PROJECT_ID         || '__VITE_FIREBASE_PROJECT_ID__',
  storageBucket:     self.FIREBASE_STORAGE_BUCKET     || '__VITE_FIREBASE_STORAGE_BUCKET__',
  messagingSenderId: self.FIREBASE_MESSAGING_SENDER_ID || '__VITE_FIREBASE_MESSAGING_SENDER_ID__',
  appId:             self.FIREBASE_APP_ID             || '__VITE_FIREBASE_APP_ID__',
});

const messaging = firebase.messaging();

// ── Gestion des notifications en arrière-plan ─────────────────
// Quand l'app est fermée ou en arrière-plan, FCM appelle ce handler.
// Les notifications envoyées avec `notification` + `data` sont
// affichées automatiquement par FCM. Cet handler permet de personnaliser.
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Message FCM reçu en arrière-plan:', payload);

  const { title, body, icon, badge, image } = payload.notification || {};
  const data = payload.data || {};

  // URL à ouvrir au clic (depuis le champ data.url)
  const clickUrl = data.url || '/';

  const notificationTitle = title || 'SikaAds';
  const notificationOptions = {
    body:    body    || 'Vous avez une nouvelle notification.',
    icon:    icon    || '/Web-Icon.png',
    badge:   badge   || '/Web-Icon.png',
    image:   image,
    data:    { url: clickUrl, ...data },
    // Vibration pattern (mobile)
    vibrate: [200, 100, 200],
    // Tag : remplace la notification précédente du même type au lieu d'en empiler
    tag: data.type  || 'sikaads-notification',
    // Garder la notification visible jusqu'au clic
    requireInteraction: false,
    // Actions rapides sous la notification
    actions: [
      { action: 'open', title: '👀 Voir' },
      { action: 'dismiss', title: 'Ignorer' },
    ],
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// ── Clic sur la notification ──────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const urlToOpen = event.notification.data?.url || '/';
  const fullUrl = new URL(urlToOpen, self.location.origin).href;

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Si une fenêtre SikaAds est déjà ouverte, la mettre au premier plan
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            client.navigate(fullUrl);
            return;
          }
        }
        // Sinon, ouvrir une nouvelle fenêtre
        if (clients.openWindow) {
          return clients.openWindow(fullUrl);
        }
      })
  );
});

// ── Activation du Service Worker ─────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});
