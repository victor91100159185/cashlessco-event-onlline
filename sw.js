// Service worker mínimo para poder "instalar" Cashless Colombia como app
// (Android/Chrome/desktop y, con manifest+meta tags de iOS, también
// "Agregar a pantalla de inicio" en iPhone).
//
// Estrategia: "network-first" para el HTML — esta app cambia seguido (se le
// corrigen bugs reales todo el tiempo), así que NUNCA queremos servir una
// versión vieja en caché mientras haya internet. La caché es solo un
// respaldo para cuando de verdad no hay conexión. Nunca se cachean pedidos
// a otros dominios (Supabase, Mercado Pago, Google Fonts, etc.): esos
// siempre van directo a la red, o la app mostraría saldos/disponibilidad de
// asientos desactualizados.
const CACHE_NAME = 'cashless-co-v1';
const APP_SHELL = ['./index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return; // nunca intervenir pedidos a otros dominios
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('./index.html')))
  );
});
