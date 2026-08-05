self.addEventListener('push', (event) => {
  const payload = event.data?.text() ? JSON.parse(event.data.text()) : {};

  const title = payload.title || 'SikaAds';
  const options = {
    body: payload.body || 'Vous avez une nouvelle notification.',
    icon: payload.icon || '/Web-Icon.png',
    badge: payload.icon || '/Web-Icon.png',
    data: payload.data || {},
    vibrate: [200, 100, 200],
    tag: payload.data?.type || 'sikaads-notification',
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';
  const fullUrl = new URL(urlToOpen, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(fullUrl);
          return;
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(fullUrl);
      }
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});
