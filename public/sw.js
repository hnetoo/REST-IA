const CACHE_NAME = 'vereda-pos-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png'
];

// Instalar service worker e cachear assets estáticos
self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Cacheando assets estáticos');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Ativar service worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker ativado');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Removendo cache antigo:', name);
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim();
});

// Estratégia de cache: Network First com fallback para Cache
self.addEventListener('fetch', (event) => {
  // Ignorar requisições de API do Supabase
  if (event.request.url.includes('supabase.co') || 
      event.request.url.includes('supabase.in')) {
    return;
  }

  // Ignorar requisições POST/PUT/DELETE
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone da resposta para cache
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => {
        // Fallback para cache se network falhar
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Se não estiver em cache, retornar página offline
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          return new Response('Offline', { status: 503 });
        });
      })
  );
});

// Sincronização em background
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-orders') {
    console.log('[SW] Sincronizando pedidos em background');
    event.waitUntil(syncPendingOrders());
  }
});

// Notificações push
self.addEventListener('push', (event) => {
  const options = {
    body: event.data?.text() || 'Nova notificação do Vereda POS',
    icon: '/icon-192x192.png',
    badge: '/icon-72x72.png',
    vibrate: [200, 100, 200],
    tag: 'vereda-notification',
    requireInteraction: true
  };
  
  event.waitUntil(
    self.registration.showNotification('Tasca do Vereda', options)
  );
});

// Click na notificação
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/#/pos')
  );
});

// Função para sincronizar pedidos pendentes
async function syncPendingOrders() {
  // Implementar lógica de sync quando houver conexão
  console.log('[SW] Sincronização de pedidos iniciada');
}
