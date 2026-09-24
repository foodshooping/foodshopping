// ============ SERVICE WORKER - FOOD SHOPPING ============
const CACHE_NAME = 'food-shopping-v1';
const ARCHIVOS_CACHE = [
  './',
  './index.html',
  './css/estilos.css',
  './js/supabase.js',
  './js/app.js',
  './icon-192.png',
  './icon-512.png',
  './manifest.json'
];

// Instalar: guarda en caché los archivos
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('📦 Cacheando archivos');
      return cache.addAll(ARCHIVOS_CACHE);
    })
  );
  self.skipWaiting();
});

// Activar: limpia cachés viejos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

// Fetch: responde desde caché si existe, sino desde internet
self.addEventListener('fetch', event => {
  // No cachear peticiones a Supabase (necesitan datos frescos)
  if (event.request.url.includes('supabase.co')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});