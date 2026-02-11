const CACHE_NAME = 'arpeggio-pro-v6'; 

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './icon.png',       
  './tonal.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/tone/14.8.49/Tone.js'
];

// 1. INSTALACIÓN
self.addEventListener('install', (e) => {
  // Forzar activación inmediata (skipWaiting) para que la nueva versión tome el control rápido
  self.skipWaiting();
  
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching core assets');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// 2. ACTIVACIÓN (Limpieza de cachés viejos)
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        // Borramos cualquier caché que no sea el actual (v5)
        if (key !== CACHE_NAME) {
          console.log('[SW] Removing old cache:', key);
          return caches.delete(key);
        }
      }));
    })
  );
  // Tomar control de todos los clientes (pestañas abiertas) inmediatamente
  self.clients.claim(); 
});

// 3. FETCH (Estrategia: Cache First, luego Red)
self.addEventListener('fetch', (e) => {
  // Solo interceptar peticiones GET (no POST, etc.)
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      // Si el archivo está en caché (ej: tonal.min.js), úsalo. Si no, pídelo a internet.
      return cachedResponse || fetch(e.request).catch((err) => {
         console.log('[SW] Fetch failed:', err);
         // Aquí la app seguirá funcionando offline porque ya tiene lo básico
      });
    })
  );
});