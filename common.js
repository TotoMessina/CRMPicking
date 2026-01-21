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
            "kiosco.html": ["Administrador", "Admin", "kiosco"] // Only Admin & Kiosco
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
    });

})();
