// guard.js - robusto + ready promise (evita carreras con app.js)
(function () {
  const LOGIN_PAGE = "login.html";
  const DEFAULT_AFTER_LOGIN = "index.html";

  function isLoginPage() {
    const p = (location.pathname || "").toLowerCase();
    return p.endsWith("/" + LOGIN_PAGE) || p.endsWith(LOGIN_PAGE);
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function getSessionWithRetry(supabaseClient) {
    const delays = [0, 60, 120, 200, 300, 450];
    for (const d of delays) {
      if (d) await sleep(d);
      const { data } = await supabaseClient.auth.getSession();
      if (data?.session?.user) return data.session;
    }
    return null;
  }

  async function loadProfileNameFromUsuarios(supabaseClient, user) {
    // Preferencia: tu tabla public.usuarios (si existe)
    try {
      const { data, error } = await supabaseClient
        .from("usuarios")
        .select("id, email, nombre, role, activo")
        .eq("id", user.id)
        .single();

      if (!error && data && data.activo === true) return data;
      if (!error && data && data.activo !== true) return { ...data, activo: false };
    } catch (_) { }

    // Fallback: permitir con sesión
    return {
      id: user.id,
      email: user.email || "",
      nombre: (user.email || "Usuario").split("@")[0],
      role: "user",
      activo: true,
    };
  }

  async function runGuard() {
    const supabaseClient = window.CRM_AUTH?.supabaseClient;

    // OFFLINE BYPASS: If offline and we have a cached user, assume valid to allow entry.
    if (!navigator.onLine) {
      const cachedUser = localStorage.getItem("usuarioActual");
      if (cachedUser) {
        console.log("[Guard] Offline mode detected. Using cached user identity.");
        window.CRM_USER = {
          activo: true,
          nombre: cachedUser,
          id: "OFFLINE_USER", // Dummy ID, common.js/clientes.js should handle this
          email: "offline@local",
          role: "user"
        };
        // Try to restore more details if we had them (optional, but "usuarioActual" is just name)
        return { ok: true, reason: "offline_bypass" };
      }
    }

    if (!supabaseClient) {
      console.error("guard.js: falta auth.js o supabaseClient no inicializado.");
      window.CRM_USER = { activo: false, nombre: "" };
      return { ok: false, reason: "no_client" };
    }

    const session = await getSessionWithRetry(supabaseClient);
    const user = session?.user || null;

    if (!user && !isLoginPage()) {
      window.CRM_USER = { activo: false, nombre: "" };
      location.replace(LOGIN_PAGE);
      return { ok: false, reason: "no_session_redirect_login" };
    }

    if (user && isLoginPage()) {
      // Check role before redirect
      const perfil = await loadProfileNameFromUsuarios(supabaseClient, user);
      if (perfil.role && perfil.role.toLowerCase() === "kiosco") {
        location.replace("kiosco.html");
      } else {
        location.replace(DEFAULT_AFTER_LOGIN);
      }
      return { ok: true, reason: "session_redirect_app" };
    }

    if (user) {
      const perfil = await loadProfileNameFromUsuarios(supabaseClient, user);
      window.CRM_USER = {
        activo: perfil.activo === true,
        nombre: (perfil.nombre || (user.email || "Usuario").split("@")[0]).trim(),
        id: perfil.id || user.id,
        email: perfil.email || user.email || "",
        role: perfil.role || "user",
      };

      if (window.CRM_USER.activo === true) {
        localStorage.setItem("usuarioActual", window.CRM_USER.nombre);

        // Update Avatar
        const avatarEl = document.getElementById("userAvatar");
        if (avatarEl) {
          const name = window.CRM_USER.nombre || "U";
          const initials = name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
          avatarEl.textContent = initials;
        }
      }

      // Si no está activo, forzar login (o podrías mostrar mensaje de deshabilitado)
      if (window.CRM_USER.activo !== true && !isLoginPage()) {
        location.replace(LOGIN_PAGE);
        return { ok: false, reason: "user_inactive" };
      }

      const btnLogout = document.getElementById("btnLogout");
      if (btnLogout && !btnLogout.dataset.bound) {
        btnLogout.dataset.bound = "1";
        btnLogout.addEventListener("click", async () => {
          await supabaseClient.auth.signOut();
          localStorage.removeItem("usuarioActual");
          location.replace(LOGIN_PAGE);
        });
      }

      // FIX: Update currentUserName globally if present
      const userLabel = document.getElementById("currentUserName");
      if (userLabel) {
        userLabel.textContent = window.CRM_USER.nombre || "Usuario";
      }

      return { ok: true, reason: "session_ok" };
    }

    window.CRM_USER = { activo: false, nombre: "" };
    return { ok: false, reason: "login_no_session" };
  }

  window.CRM_GUARD_READY = new Promise((resolve) => {
    document.addEventListener("DOMContentLoaded", async () => {
      try {
        const result = await runGuard();
        resolve(result);
      } catch (e) {
        console.error("guard.js error:", e);
        window.CRM_USER = { activo: false, nombre: "" };
        resolve({ ok: false, reason: "guard_error" });
      }
    });
  });
})();