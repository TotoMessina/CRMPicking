const CACHE_NAME = "pickingup-crm-v38";
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
    "./search.js",
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
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);

    // Evitar cachear llamadas a API externas (ej. Supabase)
    if (url.origin !== location.origin) {
        return;
    }

    // Static Assets (CSS, JS, Images, Fonts) -> Stale-While-Revalidate
    if (url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|woff2|woff)$/)) {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                const fetchPromise = fetch(event.request).then((networkResponse) => {
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, networkResponse.clone());
                    });
                    return networkResponse;
                }).catch(() => { });
                // Devuelve caché si existe, sino espera a red
                return cachedResponse || fetchPromise;
            })
        );
    } else {
        // HTML & Datos dinámicos locales -> Network First con Fallback a Caché
        event.respondWith(
            fetch(event.request)
                .then((networkResponse) => {
                    return caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    });
                })
                .catch(() => {
                    return caches.match(event.request);
                })
        );
    }
});
