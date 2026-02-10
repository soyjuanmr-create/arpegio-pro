// Actualizamos a v3 para forzar la actualización del caché en los usuarios
const CACHE_NAME = 'arpeggio-pro-v3'; 

// Definimos la base de la URL de los sonidos de Tone.js
const AUDIO_BASE = 'https://tonejs.github.io/audio/guitar-acoustic/';

const ASSETS_TO_CACHE = [
  // Archivos del App Shell (Interfaz)
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './icon.png', // Asegúrate de que este archivo existe, si no, quítalo para evitar errores
  
  // Librerías Externas
  'https://cdn.jsdelivr.net/npm/@tonaljs/tonal/browser/tonal.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/tone/14.8.49/Tone.js',

  // --- SONIDOS DE GUITARRA (CRÍTICO PARA OFFLINE) ---
  // Estos son los samples exactos que pide tu script.js
  `${AUDIO_BASE}A2.mp3`,
  `${AUDIO_BASE}C4.mp3`,
  `${AUDIO_BASE}E2.mp3`,
  `${AUDIO_BASE}E4.mp3`
];

// 1. INSTALACIÓN: Descarga y guarda todo en caché
self.addEventListener('install', (e) => {
  console.log('[Service Worker] Instalando y cacheando activos...');
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting(); // Fuerza al SW a activarse inmediatamente
});

// 2. ACTIVACIÓN: Limpia cachés antiguos (v1, v2...)
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          console.log('[Service Worker] Borrando caché antiguo:', key);
          return caches.delete(key);
        }
      }));
    })
  );
  self.clients.claim(); // Toma el control de la página inmediatamente
});

// 3. INTERCEPTACIÓN DE RED (ESTRATEGIA: Cache First)
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      // Si está en caché, lo devuelve. Si no, lo pide a internet.
      return response || fetch(e.request).catch(() => {
        // Fallback opcional si no hay internet y no está en caché
        // (Podrías devolver un JSON vacío o una imagen de error aquí si quisieras)
        console.warn('[Service Worker] Fallo de red y recurso no cacheado:', e.request.url);
      });
    })
  );
});