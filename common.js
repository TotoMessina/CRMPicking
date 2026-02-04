/* =========================================================
   common.js
   - Centralized Supabase Configuration
   - Theme Management (Dark/Light)
   - Toast Notification System
   - Shared Utilities
   ========================================================= */

(function () {
    // 1. SUPABASE CONFIGURATION
    // =========================================================
    const SUPABASE_URL = "https://mflftikcvsnniwwanrkj.supabase.co";
    const SUPABASE_KEY =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mbGZ0aWtjdnNubml3d2FucmtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NjcyMjAsImV4cCI6MjA3OTE0MzIyMH0.Z_EsaegFay24E0rOoX2PpwvWasWm5tfLcJiRrgs1nBY";

    // 0. APP VERSION & CACHE CLEARING
    // =========================================================
    const CURRENT_APP_VERSION = "2.0"; // Increment this when releasing new code
    const storedVersion = localStorage.getItem("app_version");

    if (storedVersion !== CURRENT_APP_VERSION) {
        console.warn(`New App Version detected: ${CURRENT_APP_VERSION} (was ${storedVersion}). Clearing sensitive caches...`);

        // List of keys to clear (safelist others like theme)
        const keysToClear = ["crm_filters", "crm_filters_mapa", "crm_filters_clientes"]; // Add specific keys if known
        // Or just clear everything except theme? 
        // Safer to just clear specific known problem keys or everything if big update.
        // For now, let's clear keys that might hold stale data structures.

        // If you want to be aggressive:
        // localStorage.clear(); 
        // But we want to keep 'usuarioActual' and 'crm_theme' maybe?

        // Let's clear filters which cause logic errors
        localStorage.removeItem("crm_filters"); // Clientes logic
        // If there are other filter keys...

        // Update version
        localStorage.setItem("app_version", CURRENT_APP_VERSION);

        // Optional: Reload to ensure clean slate if we were midway? 
        // Usually common.js runs first, so we are fine.
    }

    // Expose global supabaseClient
    if (!window.supabaseClient) {
        if (window.CRM_AUTH && window.CRM_AUTH.supabaseClient) {
            window.supabaseClient = window.CRM_AUTH.supabaseClient;
        } else if (window.supabase) {
            window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        } else {
            console.error("Supabase SDK not loaded. Make sure to include the script tag.");
        }
    }

    // 2. THEME MANAGEMENT
    // =========================================================
    const THEME_KEY = "crm_theme";

    window.applyTheme = function (theme) {
        const root = document.documentElement;
        root.setAttribute("data-theme", theme);
        localStorage.setItem(THEME_KEY, theme);

        const btn = document.getElementById("btnToggleTheme");
        if (btn) {
            // Check if it's the icon-only version (Login page)
            if (btn.classList.contains("btn-icon")) {
                btn.textContent = theme === "dark" ? "☀️" : "🌙";
            } else {
                // Sidebar version (Full text)
                btn.textContent = theme === "dark" ? "Modo día ☀️" : "Modo noche 🌙";
            }
        }
    };

    window.toggleTheme = function () {
        const current = localStorage.getItem(THEME_KEY) || "light";
        const next = current === "light" ? "dark" : "light";
        window.applyTheme(next);
    };

    // Init theme on load
    document.addEventListener("DOMContentLoaded", () => {
        const saved = localStorage.getItem(THEME_KEY) || "light";
        window.applyTheme(saved);

        const btn = document.getElementById("btnToggleTheme");
        if (btn) {
            // Remove old listeners if any (by cloning) or just add new one
            // Since we are refactoring, we assume we control the listener now
            btn.addEventListener("click", window.toggleTheme);
        }
    });

    // 3. TOAST NOTIFICATION SYSTEM
    // =========================================================
    let toastContainer = null;

    function ensureToastContainer() {
        if (document.getElementById("toast-container")) {
            toastContainer = document.getElementById("toast-container");
            return;
        }
        toastContainer = document.createElement("div");
        toastContainer.id = "toast-container";
        document.body.appendChild(toastContainer);
    }

    window.showToast = function (message, type = "info") {
        ensureToastContainer();

        const toast = document.createElement("div");
        toast.className = `toast toast-${type}`;

        // Icon based on type
        let icon = "ℹ️";
        if (type === "success") icon = "✅";
        if (type === "error") icon = "❌";
        if (type === "warning") icon = "⚠️";

        toast.innerHTML = `
      <span class="toast-icon">${icon}</span>
      <span class="toast-message">${message}</span>
    `;

        toastContainer.appendChild(toast);

        // Trigger animation
        requestAnimationFrame(() => {
            toast.classList.add("show");
        });

        // Auto remove
        setTimeout(() => {
            toast.classList.remove("show");
            toast.addEventListener("transitionend", () => {
                toast.remove();
            });
        }, 4000); // 4 seconds
    };

    // 4. SHARED UTILITIES
    // =========================================================
    window.utils = {
        // Format date: YYYY-MM-DD -> DD/MM/YYYY
        formatDateES: (isoDate) => {
            if (!isoDate) return "";
            const [y, m, d] = isoDate.split("-");
            return `${d}/${m}/${y}`;
        },
        debounce: (fn, delay = 300) => {
            let timer;
            return (...args) => {
                clearTimeout(timer);
                timer = setTimeout(() => fn(...args), delay);
            }
        }
    };

    // 5. SHARED CONSTANTS
    // =========================================================
    window.ESTADOS_VALIDOS_MAP = {
        "1 - Cliente relevado": "1 - Cliente relevado",
        "2 - Local Visitado No Activo": "2 - Local Visitado No Activo",
        "3 - Primer ingreso": "3 - Primer Ingreso",
        // "3 - Primer Ingreso" duplicated key removed
        "4 - Local Creado": "4 - Local Creado",
        "5 - Local Visitado Activo": "5 - Local Visitado Activo",
        "6 - Local No Interesado": "6 - Local No Interesado",
    };

    // 6. PAGE TRANSITIONS
    // =========================================================
    document.addEventListener("DOMContentLoaded", () => {
        // 1. Entrance animation
        document.body.classList.add("page-enter");

        // FIX: Ensure it is removed so interaction is restored
        setTimeout(() => {
            document.body.classList.remove("page-enter");
        }, 500);

        // 2. Navigation interceptor
        document.addEventListener("click", (e) => {
            const link = e.target.closest("a");

            // Ignore if no link, or modifier keys, or new tab, or hash/js links
            if (!link || e.ctrlKey || e.metaKey || e.shiftKey ||
                link.target === "_blank" ||
                link.href.includes("#") ||
                link.href.startsWith("javascript:")) {
                return;
            }

            // Internal links only
            if (link.origin !== window.location.origin) return;

            e.preventDefault();
            const href = link.href;

            // Exit animation
            document.body.classList.remove("page-enter");
            document.body.classList.add("page-exit");

            // Wait for animation then navigate
            setTimeout(() => {
                window.location.href = href;
            }, 300); // Matches .page-exit animation duration
        });
    });

    // 7. PENDING TICKETS BADGE
    // =========================================================
    async function updateTicketBadge() {
        if (!window.supabaseClient) return;

        try {
            // Count pending tickets
            const { count, error } = await window.supabaseClient
                .from('tickets')
                .select('*', { count: 'exact', head: true })
                .eq('estado', 'Pendiente');

            if (error) throw error;

            // Find "Tickets" link in sidebar
            const links = document.querySelectorAll('.sidebar-menu a');
            let ticketLink = null;
            links.forEach(a => {
                if (a.getAttribute('href') && a.getAttribute('href').includes('tickets.html')) {
                    ticketLink = a;
                }
            });

            if (ticketLink) {
                let badge = ticketLink.querySelector('.sidebar-badge');
                if (count > 0) {
                    if (!badge) {
                        badge = document.createElement('span');
                        badge.className = 'sidebar-badge';
                        ticketLink.appendChild(badge);
                    }
                    badge.textContent = count > 99 ? '99+' : count;
                } else {
                    if (badge) badge.remove();
                }
            }
        } catch (e) {
            console.error("Error updating ticket badge:", e);
        }
    }

    // 8. ROLE BASED ACCESS CONTROL (RBAC)
    // =========================================================
    // 8. ROLE BASED ACCESS CONTROL (RBAC)
    // =========================================================
    async function applyRolePermissions() {
        // Wait for Guard to complete
        if (window.CRM_GUARD_READY) {
            try { await window.CRM_GUARD_READY; } catch (_) { }
        }

        const user = window.CRM_USER;
        if (!user || user.activo !== true) return;

        const userRole = (user.role || "User").toLowerCase();
        const path = window.location.pathname.toLowerCase();
        const isKioscoPage = path.includes("kiosco.html");

        // --- KIOSCO ROLE LOGIC ---
        if (userRole === "kiosco") {
            const allowedKiosco = ["kiosco.html", "configuracion.html", "calificaciones.html", "login.html"];
            // Check if current page is allowed
            // We use 'some' because path might be full path e.g. /configuracion.html
            const isAllowed = allowedKiosco.some(p => path.includes(p));

            if (!isAllowed) {
                console.warn("Kiosco role restricted.");
                window.location.replace("kiosco.html");
                return;
            }

            // Restore strict visibility for Kiosco: Hide non-whitelisted links
            const sidebarLinks = document.querySelectorAll('.sidebar-menu a');
            sidebarLinks.forEach(link => {
                const href = link.getAttribute('href');
                if (!href) return;
                const isLinkAllowed = allowedKiosco.some(p => href.toLowerCase().includes(p));
                // Special case: Logout is always allowed (has no href or check id) - usually id="btnLogout"
                if (!isLinkAllowed && !link.id.includes("Logout")) {
                    link.parentElement.style.display = 'none';
                }
            });
            return;
        }

        // --- NON-KIOSCO LOGIC ---
        // Allow Admins to access Kiosco page, block others
        const isAdmin = ["admin", "administrador"].includes(userRole.toLowerCase());

        if (isKioscoPage) {
            if (!isAdmin && userRole !== "kiosco") {
                window.location.replace("index.html");
                return;
            }
        }

        // Definition of Page Permissions (Page -> Allowed Roles)
        const permissions = {
            "calendario.html": ["Administrador", "Activador PickingUp", "Empleado", "Admin"],
            "tickets.html": ["Administrador", "Activador PickingUp", "Empleado", "Admin"],
            "horarios.html": ["Administrador", "Admin"],
            "calificaciones.html": ["Administrador", "Admin", "kiosco"], // Only Admin & Kiosco
            "kiosco.html": ["Administrador", "Admin", "kiosco"], // Only Admin & Kiosco
            "proveedores.html": ["Administrador", "Admin"] // Only Admin
        };

        const currentRole = user.role; // Use original casing for array check

        // 1. SIDEBAR: Hide restricted links
        const sidebarLinks = document.querySelectorAll('.sidebar-menu a');
        sidebarLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (!href) return;

            // simple check: if href contains a restricted page name
            for (const [page, allowedRoles] of Object.entries(permissions)) {
                if (href.toLowerCase().includes(page)) { // Use includes to handle ./kiosco.html etc
                    const rolesLower = allowedRoles.map(r => r.toLowerCase());
                    if (!rolesLower.includes(userRole)) {
                        link.parentElement.style.display = 'none';
                    }
                }
            }
        });

        // 2. PROTECT CURRENT PAGE
        for (const [page, allowedRoles] of Object.entries(permissions)) {
            if (path.includes(page)) {
                const rolesLower = allowedRoles.map(r => r.toLowerCase());
                if (!rolesLower.includes(userRole)) {
                    console.warn(`Access denied to ${page}`);
                    window.location.replace("index.html");
                    return;
                }
            }
        }
    }

    // --- Init ---
    document.addEventListener("DOMContentLoaded", () => {
        // Run initial check
        if (window.updateTicketBadge) updateTicketBadge();
        // Refresh periodically (e.g. every 30s)
        if (window.updateTicketBadge) setInterval(updateTicketBadge, 30000);

        // Apply Permissions
        applyRolePermissions();

        // 9. SERVICE WORKER REGISTRATION (PWA)
        if ("serviceWorker" in navigator) {
            navigator.serviceWorker
                .register("./sw.js")
                .then((reg) => console.log("Service Worker Registered", reg.scope))
                .catch((err) => console.log("Service Worker Failed", err));
        }

        // Init OfflineManager
        window.OfflineManager.init();
    });

    // 10. OFFLINE MANAGER
    // =========================================================
    window.OfflineManager = {
        QUEUE_KEY: "crm_offline_queue",

        init: function () {
            // Listen for online status
            window.addEventListener("online", () => {
                console.log("[Offline] Back online. Syncing...");
                window.showToast("Recuperamos conexión. Sincronizando...", "info");
                this.processQueue();
            });

            window.addEventListener("offline", () => {
                console.log("[Offline] Connection lost.");
                window.showToast("Sin conexión. Trabajando en modo Offline.", "warning");
            });

            // Try processing on load if online
            if (navigator.onLine) {
                this.processQueue();
            }
        },

        getQueue: function () {
            try {
                const str = localStorage.getItem(this.QUEUE_KEY);
                return str ? JSON.parse(str) : [];
            } catch (e) {
                return [];
            }
        },

        addToQueue: function (actionType, payload) {
            const queue = this.getQueue();
            const item = {
                id: Date.now() + Math.random(),
                type: actionType,
                payload: payload,
                createdAt: new Date().toISOString()
            };
            queue.push(item);
            localStorage.setItem(this.QUEUE_KEY, JSON.stringify(queue));
            console.log("[Offline] Added to queue:", item);
        },

        processQueue: async function () {
            const queue = this.getQueue();
            if (queue.length === 0) return;

            console.log(`[Offline] Processing ${queue.length} items...`);
            const remaining = [];
            let processedCount = 0;

            for (const item of queue) {
                try {
                    await this.executeItem(item);
                    processedCount++;
                } catch (err) {
                    console.error("[Offline] Error processing item:", item, err);
                    // Keep in queue only if it's a network error?
                    // For simplicity, we keep it to retry later, unless it's a logic error 
                    // but verifying logic error is hard. Let's assume we retry.
                    remaining.push(item);
                }
            }

            localStorage.setItem(this.QUEUE_KEY, JSON.stringify(remaining));

            if (processedCount > 0) {
                window.showToast(`Sincronizados ${processedCount} cambios pendientes.`, "success");
            }
        },

        executeItem: async function (item) {
            if (!window.supabaseClient) throw new Error("Supabase not ready");

            if (item.type === "ADD_VISIT") {
                // Payload: { clientId }
                const { clientId } = item.payload;
                // Logic: Fetch count -> Inc -> Update -> Insert Activity

                // 1. Fetch current
                const { data: currentData, error: fetchErr } = await window.supabaseClient
                    .from('clientes')
                    .select('visitas')
                    .eq('id', clientId)
                    .single();

                if (fetchErr) throw fetchErr; // Will retry

                const currentVal = currentData.visitas || 0;
                const newVal = currentVal + 1;

                // 2. Update DB
                const { error: updateErr } = await window.supabaseClient
                    .from('clientes')
                    .update({ visitas: newVal })
                    .eq('id', clientId);

                if (updateErr) throw updateErr;

                // 3. Log Activity (Timestamp is NOW, or we could use item.createdAt?)
                // Let's use item.createdAt to respect when it happened!
                const { error: actErr } = await window.supabaseClient
                    .from('actividades')
                    .insert([{
                        cliente_id: clientId,
                        usuario_id: (window.CRM_USER ? window.CRM_USER.id : null), // Fallback? 
                        usuario: (window.CRM_USER ? window.CRM_USER.nombre : "OfflineSync"),
                        descripcion: "Visita realizada", // Standard text
                        fecha: item.createdAt // Backdate to when it happened
                    }]);

                if (actErr) console.warn("Activity log failed but visit counted", actErr);

            } else if (item.type === "UPDATE_CLIENT") {
                // Payload: { id, updates }
                const { id, updates } = item.payload;
                const { error } = await window.supabaseClient
                    .from('clientes')
                    .update(updates)
                    .eq('id', id);
                if (error) throw error;
                if (error) throw error;
            } else if (item.type === "CREATE_CLIENT") {
                // Payload: { ...clientData }
                // We assume payload has all necessary fields.
                // If ID was generated locally, it should be in payload.
                const { error } = await window.supabaseClient
                    .from('clientes')
                    .insert([item.payload]);
                if (error) throw error;
            }
        }
    };

    // 11. NOTIFICATIONS MANAGER (LOCAL PUSH)
    // =========================================================
    window.NotificationsManager = {
        init: function () {
            // Check support
            if (!("Notification" in window)) return;

            // Auto-check on load if already granted
            if (Notification.permission === "granted") {
                this.startListeners();
            }

            // Bind UI button if exists
            const btn = document.getElementById("btnEnableNotifications");
            if (btn) {
                if (Notification.permission === "granted") {
                    btn.style.display = 'none';
                } else if (Notification.permission === "denied") {
                    // btn.textContent = "Notificaciones bloqueadas";
                    // btn.disabled = true;
                    btn.style.display = 'none'; // Simplify: Hide if denied
                } else {
                    btn.addEventListener("click", () => {
                        this.requestPermission();
                    });
                }
            }
        },

        requestPermission: async function () {
            const result = await Notification.requestPermission();
            if (result === "granted") {
                window.showToast("Notificaciones activadas", "success");
                this.startListeners();
                const btn = document.getElementById("btnEnableNotifications");
                if (btn) btn.style.display = 'none';
            } else {
                window.showToast("No pudimos activar las notificaciones", "warning");
            }
        },

        show: function (title, body, tag = null) {
            if (Notification.permission !== "granted") return;
            // SW Registration for mobile? Or simple 'new Notification'?
            // 'new Notification' only works reliably on Desktop. Mobile often requires SW.showNotification.
            // Let's try SW first if available, else fallback.

            if (navigator.serviceWorker && navigator.serviceWorker.ready) {
                // This promise resolves when SW is active
                navigator.serviceWorker.ready.then(registration => {
                    // Check if showNotification is supported (it IS in SW context)
                    // But accessing registration from window might not work on all browsers for 'showNotification'
                    // Actually, registration.showNotification is the standard way.
                    registration.showNotification(title, {
                        body: body,
                        icon: 'imagen1.png',
                        badge: 'imagen1.png', // Android badge
                        tag: tag || 'general',
                        vibrate: [200, 100, 200]
                    });
                });
            } else {
                new Notification(title, {
                    body: body,
                    icon: 'imagen1.png'
                });
            }
        },

        startListeners: function () {
            console.log("[Notif] Starting listeners...");
            this.startRealtimeAssignments();
            this.startReminderLoop();
        },

        startRealtimeAssignments: function () {
            const user = window.CRM_USER;
            if (!user || !user.nombre) return;
            const userName = user.nombre.toLowerCase();

            // Realtime is global in Supabase client
            window.supabaseClient
                .channel('assignments-channel')
                .on(
                    'postgres_changes',
                    { event: 'UPDATE', schema: 'public', table: 'clientes' },
                    (payload) => {
                        const newData = payload.new;
                        const oldData = payload.old; // May be empty if RLS policies restrict
                        // Check if assigned to ME
                        if (newData.responsable && newData.responsable.toLowerCase() === userName) {
                            // Check if it WASN'T me before (requires full payload, RLS might hide old)
                            // Or just notify always on update? Too noisy.
                            // Let's assume if it matches me, I want to know. 
                            // Debounce or check logic?
                            // Simple heuristic: If active and assigned to me.
                            this.show("Cliente Asignado", `Se te asignó: ${newData.nombre}`);
                        }
                    }
                )
                .subscribe();
        },

        startReminderLoop: function () {
            // Check every 5 minutes
            const CHECK_INTERVAL = 5 * 60 * 1000;

            const check = async () => {
                // Fetch agenda today
                const user = window.CRM_USER;
                if (!user) return;

                const today = new Date().toISOString().split("T")[0];

                const { data: agenda } = await window.supabaseClient
                    .from("clientes")
                    .select("nombre, hora_proximo_contacto")
                    .eq("fecha_proximo_contacto", today)
                    .eq("activo", true)
                    // Filter by user? Yes, ideally. In clientes.js logic it often filters, 
                    // but here we want ONLY MY visits.
                    // Assuming 'responsable' column exists.
                    .ilike("responsable", `%${user.nombre}%`);

                if (!agenda) return;

                const now = new Date();
                const nowMinutes = now.getHours() * 60 + now.getMinutes();

                agenda.forEach(c => {
                    if (!c.hora_proximo_contacto) return;
                    // Format "HH:MM"
                    const [h, m] = c.hora_proximo_contacto.split(":").map(Number);
                    const targetMinutes = h * 60 + m;

                    const diff = targetMinutes - nowMinutes;
                    // If between 0 and 60 minutes
                    if (diff > 0 && diff <= 60) {
                        // Avoid spamming? We need a tracking mechanism "notified_today_client_ID".
                        const key = `notif_${today}_${c.nombre}`;
                        if (!sessionStorage.getItem(key)) {
                            this.show("Recordatorio de Visita", `En ${diff} min: ${c.nombre}`);
                            sessionStorage.setItem(key, "true");
                        }
                    }
                });
            };

            // Run immediately then interval
            check();
            setInterval(check, CHECK_INTERVAL);
        }
    };

    // 12. LOCATION TRACKER (SENDER)
    // =========================================================
    window.LocationTracker = {
        watchId: null,
        lastUpdate: 0,
        MIN_INTERVAL_MS: 30000, // Update DB max every 30s
        MIN_DISTANCE_M: 20,     // Or if moved significantly (not easy to measure without prev coords)

        init: async function () {
            // Wait for user to be ready
            if (window.CRM_GUARD_READY) {
                try { await window.CRM_GUARD_READY; } catch (_) { }
            }

            const user = window.CRM_USER;
            if (!user || !user.activo) return;

            // Role Check: "Activador PickingUp" (or similar)
            // User request: "usuarios con el rol de Activador PickingUp"
            const role = (user.role || "").toLowerCase();
            if (role.includes("activador")) {
                console.log("[Tracker] User is Activador. Starting GPS...");
                window.showToast("🐞 DIAG: Iniciando GPS de Activador...", "info");
                this.startTracking();
            }
        },

        startTracking: function () {
            if (!navigator.geolocation) return;

            this.watchId = navigator.geolocation.watchPosition(
                (pos) => {
                    this.handlePosition(pos);
                },
                (err) => {
                    console.warn("[Tracker] GPS Error:", err);
                    window.showToast("🐞 DIAG: Error GPS: " + err.message, "error");
                },
                {
                    enableHighAccuracy: true,
                    maximumAge: 10000,
                    timeout: 20000
                }
            );
        },

        handlePosition: function (pos) {
            const now = Date.now();
            if (now - this.lastUpdate < this.MIN_INTERVAL_MS) {
                return; // Throttle
            }

            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;

            this.sendUpdate(lat, lng);
            this.lastUpdate = now;
        },

        sendUpdate: async function (lat, lng) {
            const user = window.CRM_USER;
            try {
                const userId = user.id || user.userId;
                if (!userId) {
                    console.error("[Tracker] User ID missing in CRM_USER object", user);
                    window.showToast("🐞 DIAG: Error fatal - ID de usuario desconocido", "error");
                    return;
                }

                // Determine Emoji (if not set in DB, default is used there, 
                // but here we just update lat/lng/last_seen)
                const { error } = await window.supabaseClient
                    .from('usuarios')
                    .update({
                        lat: lat,
                        lng: lng,
                        last_seen: new Date().toISOString()
                    })
                    .eq('id', userId);

                if (error) {
                    console.error("[Tracker] DB Update failed", error);
                    window.showToast("🐞 DIAG: Error al enviar ubicación a DB", "error");
                }
                else {
                    console.log("[Tracker] Location sent", lat, lng);
                    // window.showToast("🐞 DIAG: Ubicación enviada OK", "success"); // Too spammy maybe? Uncomment if needed
                }

            } catch (e) {
                console.error("[Tracker] Exception", e);
            }
        }
    };

    // Init Logic on Load
    document.addEventListener("DOMContentLoaded", () => {
        // Tiny delay or rely on common flow
        setTimeout(() => {
            // Init Notifications
            if (window.NotificationsManager) window.NotificationsManager.init();
            // Init Tracker
            if (window.LocationTracker) window.LocationTracker.init();
        }, 3000);
    });

})();
