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

    // 5. PAGE TRANSITIONS
    // =========================================================
    document.addEventListener("DOMContentLoaded", () => {
        // 1. Entrance animation
        document.body.classList.add("page-enter");

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

})();
