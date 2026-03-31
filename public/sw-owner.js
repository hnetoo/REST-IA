/**
 * Owner Dashboard PWA - Service Worker
 * Versão: 1.0.0
 * Data: 2026-03-31
 */

const CACHE_NAME = 'owner-dashboard-v1';
const STATIC_ASSETS = [
  '/owner.html',
  '/manifest-owner.json',
  '/icon.png',
  '/icon-maskable.svg'
];

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  console.log('[Owner PWA] Service Worker instalando...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Owner PWA] Cache aberto, adicionando assets estáticos...');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[Owner PWA] Assets em cache com sucesso!');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[Owner PWA] Erro ao adicionar assets em cache:', error);
      })
  );
});

// Ativação do Service Worker
self.addEventListener('activate', (event) => {
  console.log('[Owner PWA] Service Worker ativando...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[Owner PWA] Deletando cache antigo:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[Owner PWA] Service Worker ativado com sucesso!');
        return self.clients.claim();
      })
  );
});

// Estratégia de Cache: Cache First, depois Network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Ignorar requisições não GET
  if (request.method !== 'GET') {
    return;
  }
  
  // Ignorar requisições de analytics e tracking
  if (url.pathname.includes('/api/') || url.pathname.includes('/track/')) {
    return;
  }
  
  // Estratégia Cache First para assets estáticos
  if (STATIC_ASSETS.includes(url.pathname) || 
      url.pathname.endsWith('.html') || 
      url.pathname.endsWith('.css') || 
      url.pathname.endsWith('.js') || 
      url.pathname.endsWith('.png') || 
      url.pathname.endsWith('.jpg') || 
      url.pathname.endsWith('.svg')) {
    
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            console.log('[Owner PWA] Serving from cache:', url.pathname);
            return cachedResponse;
          }
          
          return fetch(request)
            .then((networkResponse) => {
              if (!networkResponse || networkResponse.status !== 200) {
                return networkResponse;
              }
              
              // Clone e armazena no cache
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(request, responseToCache);
                });
              
              return networkResponse;
            })
            .catch((error) => {
              console.error('[Owner PWA] Fetch falhou:', error);
              // Retorna página offline se disponível
              if (request.destination === 'document') {
                return caches.match('/owner.html');
              }
            });
        })
    );
  } else {
    // Para outras requisições, usa Network First
    event.respondWith(
      fetch(request)
        .catch(() => {
          return caches.match(request);
        })
    );
  }
});

// Sincronização em background (para quando online)
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('[Owner PWA] Sincronização em background iniciada');
    event.waitUntil(syncData());
  }
});

// Função de sincronização
async function syncData() {
  // Implementar sincronização de dados aqui se necessário
  console.log('[Owner PWA] Sincronizando dados...');
}

// Notificações push (opcional)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icon-192x192.png',
      badge: '/icon-72x72.png',
      tag: data.tag || 'owner-notification',
      requireInteraction: true,
      actions: [
        {
          action: 'open',
          title: 'Abrir Dashboard'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Clique na notificação
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow('/owner.html')
    );
  }
});

// Mensagens do cliente
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});

console.log('[Owner PWA] Service Worker carregado!');
