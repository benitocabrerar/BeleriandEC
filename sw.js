// Service Worker for PWA and Push Notifications
// Villa Vista al Mar - Service Worker

const CACHE_NAME = 'villa-vista-mar-v1.0.0';
const urlsToCache = [
  '/',
  '/index.html',
  '/admin.html',
  '/firebase-config.js',
  '/payment-service.js',
  '/chat-service.js',
  '/analytics-service.js',
  '/manifest.json',
  // External libraries
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js',
  'https://js.stripe.com/v3/'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Install');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[ServiceWorker] Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('[ServiceWorker] Skip waiting');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activate');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[ServiceWorker] Removing old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[ServiceWorker] Claiming clients');
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  console.log('[ServiceWorker] Fetch', event.request.url);
  
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin) && 
      !event.request.url.startsWith('https://www.gstatic.com') &&
      !event.request.url.startsWith('https://cdn.jsdelivr.net') &&
      !event.request.url.startsWith('https://js.stripe.com')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        if (response) {
          console.log('[ServiceWorker] Found in cache', event.request.url);
          return response;
        }
        
        console.log('[ServiceWorker] Fetching from network', event.request.url);
        return fetch(event.request).then((response) => {
          // Check if response is valid
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Clone the response for caching
          const responseToCache = response.clone();
          
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });
          
          return response;
        });
      })
      .catch(() => {
        // Return offline page for navigation requests
        if (event.request.destination === 'document') {
          return caches.match('/offline.html');
        }
      })
  );
});

// Push event - handle push notifications
self.addEventListener('push', (event) => {
  console.log('[ServiceWorker] Push received');
  
  let notificationData = {
    title: 'Villa Vista al Mar',
    body: 'Nueva notificación',
    icon: '/manifest-icon-192.png',
    badge: '/manifest-icon-96.png',
    tag: 'villa-notification',
    requireInteraction: false,
    actions: [
      {
        action: 'view',
        title: 'Ver',
        icon: '/manifest-icon-96.png'
      },
      {
        action: 'close',
        title: 'Cerrar'
      }
    ],
    data: {
      url: '/',
      timestamp: Date.now()
    }
  };
  
  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = { ...notificationData, ...data };
    } catch (e) {
      notificationData.body = event.data.text();
    }
  }
  
  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[ServiceWorker] Notification clicked');
  
  event.notification.close();
  
  const action = event.action;
  const notificationData = event.notification.data || {};
  
  if (action === 'close') {
    return;
  }
  
  // Handle different actions
  let urlToOpen = notificationData.url || '/';
  
  if (action === 'view' || !action) {
    if (notificationData.type === 'message') {
      urlToOpen = `/?chat=${notificationData.conversationId}`;
    } else if (notificationData.type === 'booking') {
      urlToOpen = `/admin.html#reservations`;
    } else if (notificationData.type === 'payment') {
      urlToOpen = `/admin.html#payments`;
    }
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window/tab open with the target URL
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        
        // If no window/tab is open, open a new one
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[ServiceWorker] Background sync', event.tag);
  
  if (event.tag === 'background-sync-reservations') {
    event.waitUntil(syncPendingReservations());
  } else if (event.tag === 'background-sync-messages') {
    event.waitUntil(syncPendingMessages());
  } else if (event.tag === 'background-sync-analytics') {
    event.waitUntil(syncPendingAnalytics());
  }
});

// Sync pending reservations when back online
async function syncPendingReservations() {
  try {
    console.log('[ServiceWorker] Syncing pending reservations');
    
    // Get pending reservations from IndexedDB
    const pendingReservations = await getStoredData('pendingReservations');
    
    for (const reservation of pendingReservations) {
      try {
        // Send to server
        const response = await fetch('/api/reservations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(reservation)
        });
        
        if (response.ok) {
          // Remove from pending storage
          await removeStoredData('pendingReservations', reservation.id);
          
          // Show success notification
          self.registration.showNotification('Reserva Sincronizada', {
            body: `La reserva de ${reservation.guestName} se ha sincronizado correctamente`,
            icon: '/manifest-icon-192.png',
            tag: 'sync-success'
          });
        }
      } catch (error) {
        console.error('[ServiceWorker] Error syncing reservation:', error);
      }
    }
  } catch (error) {
    console.error('[ServiceWorker] Error in syncPendingReservations:', error);
  }
}

// Sync pending messages when back online
async function syncPendingMessages() {
  try {
    console.log('[ServiceWorker] Syncing pending messages');
    
    const pendingMessages = await getStoredData('pendingMessages');
    
    for (const message of pendingMessages) {
      try {
        const response = await fetch('/api/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(message)
        });
        
        if (response.ok) {
          await removeStoredData('pendingMessages', message.id);
        }
      } catch (error) {
        console.error('[ServiceWorker] Error syncing message:', error);
      }
    }
  } catch (error) {
    console.error('[ServiceWorker] Error in syncPendingMessages:', error);
  }
}

// Sync pending analytics when back online
async function syncPendingAnalytics() {
  try {
    console.log('[ServiceWorker] Syncing pending analytics');
    
    const pendingEvents = await getStoredData('pendingAnalytics');
    
    for (const event of pendingEvents) {
      try {
        const response = await fetch('/api/analytics', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event)
        });
        
        if (response.ok) {
          await removeStoredData('pendingAnalytics', event.id);
        }
      } catch (error) {
        console.error('[ServiceWorker] Error syncing analytics:', error);
      }
    }
  } catch (error) {
    console.error('[ServiceWorker] Error in syncPendingAnalytics:', error);
  }
}

// IndexedDB helpers for offline storage
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('VillaVistaMarDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create stores for offline data
      if (!db.objectStoreNames.contains('pendingReservations')) {
        db.createObjectStore('pendingReservations', { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains('pendingMessages')) {
        db.createObjectStore('pendingMessages', { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains('pendingAnalytics')) {
        db.createObjectStore('pendingAnalytics', { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains('offlineCache')) {
        db.createObjectStore('offlineCache', { keyPath: 'key' });
      }
    };
  });
}

async function getStoredData(storeName) {
  try {
    const db = await openDB();
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[ServiceWorker] Error getting stored data:', error);
    return [];
  }
}

async function removeStoredData(storeName, id) {
  try {
    const db = await openDB();
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[ServiceWorker] Error removing stored data:', error);
  }
}

// Message handling for communication with main thread
self.addEventListener('message', (event) => {
  console.log('[ServiceWorker] Message received:', event.data);
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  } else if (event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(CACHE_NAME).then(cache => {
        return cache.addAll(event.data.urls);
      })
    );
  }
});

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
  console.log('[ServiceWorker] Periodic sync:', event.tag);
  
  if (event.tag === 'calendar-sync') {
    event.waitUntil(syncCalendarData());
  } else if (event.tag === 'price-updates') {
    event.waitUntil(syncPriceUpdates());
  }
});

async function syncCalendarData() {
  try {
    console.log('[ServiceWorker] Syncing calendar data');
    
    // Sync with external calendar sources (Airbnb, Booking.com)
    const response = await fetch('/api/sync-calendar', {
      method: 'POST'
    });
    
    if (response.ok) {
      console.log('[ServiceWorker] Calendar sync completed');
    }
  } catch (error) {
    console.error('[ServiceWorker] Calendar sync failed:', error);
  }
}

async function syncPriceUpdates() {
  try {
    console.log('[ServiceWorker] Syncing price updates');
    
    // Check for dynamic pricing updates
    const response = await fetch('/api/sync-prices', {
      method: 'POST'
    });
    
    if (response.ok) {
      console.log('[ServiceWorker] Price sync completed');
    }
  } catch (error) {
    console.error('[ServiceWorker] Price sync failed:', error);
  }
}

// Handle app lifecycle events
self.addEventListener('appinstalled', (event) => {
  console.log('[ServiceWorker] App installed');
  
  // Track app installation
  self.registration.showNotification('¡Aplicación Instalada!', {
    body: 'Villa Vista al Mar está ahora disponible como aplicación',
    icon: '/manifest-icon-192.png',
    tag: 'app-installed'
  });
});

// Handle app update available
self.addEventListener('controllerchange', (event) => {
  console.log('[ServiceWorker] Controller changed - app updated');
  
  // Notify about app update
  self.registration.showNotification('Actualización Disponible', {
    body: 'Nueva versión de Villa Vista al Mar disponible. Reinicia la app para actualizar.',
    icon: '/manifest-icon-192.png',
    tag: 'app-update',
    requireInteraction: true,
    actions: [
      {
        action: 'refresh',
        title: 'Actualizar Ahora'
      },
      {
        action: 'later',
        title: 'Más Tarde'
      }
    ]
  });
});

console.log('[ServiceWorker] Service Worker loaded successfully');