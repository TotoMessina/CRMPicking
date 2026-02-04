const CACHE_NAME = "pickingup-crm-v15";
// Add files to cache here. Ideally, list all critical assets.
// For now, we cache the basics to allow app shell to load.
const ASSETS_TO_CACHE = [
    "./",
    "./index.html",
    "./styles.css",
    "./index.css",
    "./tickets.css",
    "./styles_modal.css",
    "./common.js",
    "./auth.js",
    "./guard.js",
    "./dashboard.js",
    "./clientes.html",
    "./clientes.js",
    "./login.html",
    "./login.js",
    "./calendario.html",
    "./calendario.js",
    "./calificaciones.html",
    "./calificaciones.js",
    "./configuracion.html",
    "./configuracion.js",
    "./consumidores.html",
    "./consumidores.js",
    "./estadisticas.html",
    "./horarios.html",
    "./horarios.js",
    "./kiosco.html",
    "./kiosco.js",
    "./mapa.html",
    "./mapa.js",
    "./mapa_repartidores.html",
    "./mapa_repartidores.js",
    "./pipeline.html",
    "./pipeline.js",
    "./proveedores.html",
    "./proveedores.js",
    "./repartidores.html",
    "./repartidores.js",
    "./stats.js",
    "./tickets.html",
    "./tickets.js",
    "./usuarios.html",
    "./usuarios.js",
    "./app.js",
    "./imagen1.png",
    "./imagen2.png",
    "./manifest.json"
];

// Install Event
self.addEventListener("install", (event) => {
    console.log("[Service Worker] Install");
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log("[Service Worker] Caching all: app shell and content");
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

// Activate Event
self.addEventListener("activate", (event) => {
    console.log("[Service Worker] Activate");
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(
                keyList.map((key) => {
                    if (key !== CACHE_NAME) {
                        console.log("[Service Worker] Removing old cache", key);
                        return caches.delete(key);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch Event
self.addEventListener("fetch", (event) => {
    // Simple Cache-first strategy
    /*
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
    */

    // Network-first strategy (better for CRM data consistency)
    // We only fall back to cache if network fails.
    if (event.request.method !== 'GET') return;

    event.respondWith(
        fetch(event.request)
            .catch(() => {
                return caches.match(event.request);
            })
    );
});
