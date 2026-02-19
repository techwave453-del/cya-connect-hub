// Push notification event handler for service worker
self.addEventListener('push', function(event) {
  console.log('[Service Worker] Push received:', event);

  // Default notification data
  let data = {
    title: 'CYA Kenya',
    body: 'You have a new notification',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: 'default',
    data: { url: '/' }
  };

  // Parse push payload if available
  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
      console.log('[Service Worker] Push payload:', payload);
    } catch (e) {
      console.error('[Service Worker] Error parsing push data:', e);
      // Try text format as fallback
      try {
        data.body = event.data.text();
      } catch (textError) {
        console.error('[Service Worker] Error reading push as text:', textError);
      }
    }
  }

  // Notification options for maximum visibility
  const options = {
    body: data.body,
    icon: data.icon || '/pwa-192x192.png',
    badge: data.badge || '/pwa-192x192.png',
    image: data.image, // Optional large image
    tag: data.tag || `notification-${Date.now()}`, // Prevents duplicate notifications
    renotify: true, // Always notify even if same tag
    requireInteraction: true, // Keep notification visible until user interacts
    silent: false, // Play notification sound
    vibrate: [200, 100, 200, 100, 200], // Strong vibration pattern
    data: {
      url: data.data?.url || data.data?.conversationId 
        ? `/chat?conversation=${data.data.conversationId}` 
        : '/',
      ...data.data
    },
    actions: [
      { action: 'open', title: 'View', icon: '/pwa-192x192.png' },
      { action: 'dismiss', title: 'Dismiss' }
    ],
    // Timestamp for ordering
    timestamp: data.timestamp || Date.now()
  };

  console.log('[Service Worker] Showing notification:', data.title, options);

  event.waitUntil(
    self.registration.showNotification(data.title, options)
      .then(() => {
        console.log('[Service Worker] Notification shown successfully');
      })
      .catch((error) => {
        console.error('[Service Worker] Error showing notification:', error);
      })
  );
});

// Handle notification click
self.addEventListener('notificationclick', function(event) {
  console.log('[Service Worker] Notification click:', event.action);
  
  event.notification.close();

  // Handle dismiss action
  if (event.action === 'dismiss') {
    return;
  }

  // Get URL to open
  const urlToOpen = event.notification.data?.url || '/';
  const fullUrl = new URL(urlToOpen, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ 
      type: 'window', 
      includeUncontrolled: true 
    }).then(function(clientList) {
      // Check if there's already a window/tab open with our app
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          // Navigate existing window to the target URL
          return client.navigate(fullUrl).then(() => client.focus());
        }
      }
      // If no window/tab is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(fullUrl);
      }
    })
  );
});

// Handle notification close (for analytics)
self.addEventListener('notificationclose', function(event) {
  console.log('[Service Worker] Notification closed:', event.notification.tag);
});

// Ensure service worker activates immediately
self.addEventListener('activate', function(event) {
  console.log('[Service Worker] Activating...');
  event.waitUntil(clients.claim());
});
