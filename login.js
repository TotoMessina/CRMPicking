document.addEventListener("DOMContentLoaded", () => {
  const supabaseClient = window.supabaseClient;
  if (!supabaseClient) {
    console.error("Supabase client no encontrado (falta auth.js o está en mal orden).");
    return;
  }

  const form = document.getElementById("formLogin");
  const emailEl = document.getElementById("email");
  const passEl = document.getElementById("password");
  const nameEl = document.getElementById("display_name");

  const btnSignup = document.getElementById("btnSignup");
  const btnReset = document.getElementById("btnReset");

  const msgEl = document.getElementById("msg");

  const setMsg = (text, type = "info") => {
    if (!msgEl) return;
    msgEl.textContent = text || "";
    msgEl.style.color = type === "error" ? "#dc2626" : "";
  };

  // Helper: obtener nombre para mostrar (fallback)
  const getDisplayName = () => {
    const v = (nameEl?.value || "").trim();
    if (v) return v;
    const email = (emailEl?.value || "").trim();
    return email ? email.split("@")[0] : "";
  };

  // =========================
  // LOGIN
  // =========================
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      setMsg("");

      const email = (emailEl?.value || "").trim();
      const password = (passEl?.value || "").trim();

      if (!email || !password) {
        setMsg("Ingresá email y contraseña.", "error");
        return;
      }

      setMsg("Ingresando...");

      const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

      if (error) {
        setMsg("Error al ingresar: " + error.message, "error");
        return;
      }

      // Dejar que guard.js resuelva la sesión y redireccione de forma consistente
      window.location.href = "index.html";
    });
  }

  // =========================
  // SIGNUP (crear usuario)
  // =========================
  if (btnSignup) {
    btnSignup.addEventListener("click", async () => {
      setMsg("");

      const email = (emailEl?.value || "").trim();
      const password = (passEl?.value || "").trim();
      const display_name = getDisplayName();

      if (!display_name) {
        setMsg("Ingresá un nombre de usuario.", "error");
        return;
      }
      if (!email || !password) {
        setMsg("Ingresá email y contraseña para crear el usuario.", "error");
        return;
      }

      setMsg("Creando usuario...");

      const { error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: { data: { display_name } },
      });

      if (error) {
        setMsg("Error creando usuario: " + error.message, "error");
        return;
      }

      setMsg("Usuario creado. Ahora podés ingresar con tu email y contraseña.");
    });
  }

  // =========================
  // RESET PASSWORD
  // =========================
  if (btnReset) {
    btnReset.addEventListener("click", async () => {
      setMsg("");

      const email = (emailEl?.value || "").trim();
      if (!email) {
        setMsg("Ingresá tu email para recuperar la contraseña.", "error");
        return;
      }

      setMsg("Enviando email de recuperación...");

      // IMPORTANTE: setear redirectTo a una URL real de tu sitio si lo deployás.
      // En local, puede funcionar igual, pero para producción conviene tu dominio.
      const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/login.html",
      });

      if (error) {
        setMsg("Error enviando recuperación: " + error.message, "error");
        return;
      }

      setMsg("Listo. Revisá tu email para continuar con la recuperación.");
    });
  }
});
