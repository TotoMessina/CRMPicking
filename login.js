document.addEventListener("DOMContentLoaded", () => {
  /* =========================================================
     1. INIT CLIENT
     ========================================================= */
  const supabaseClient = window.supabaseClient;
  if (!supabaseClient) {
    console.error("Supabase client no encontrado (falta auth.js o está en mal orden).");
    return;
  }

  /* =========================================================
     2. ELEMENTS references
     ========================================================= */
  // -- Login Elements --
  const formLogin = document.getElementById("formLogin");
  const emailVal = document.getElementById("email");
  const passwordVal = document.getElementById("password");
  const msgEl = document.getElementById("msg");

  const btnToggleSignup = document.getElementById("btnToggleSignup"); // "Crear cuenta" btn prompts
  const btnReset = document.getElementById("btnReset");

  // -- Signup Elements --
  const formSignup = document.getElementById("formSignup");
  const regName = document.getElementById("reg_display_name");
  const regEmail = document.getElementById("reg_email");
  const regPass = document.getElementById("reg_password");
  const regCode = document.getElementById("reg_code");
  const btnBackToLogin = document.getElementById("btnBackToLogin");
  const msgSignupEl = document.getElementById("msgSignup");

  // Helper for messages
  const setMsg = (element, text, type = "info") => {
    if (!element) return;
    element.textContent = text || "";
    element.style.color = type === "error" ? "#dc2626" : "";
  };

  /* =========================================================
     3. TOGGLE FORMS
     ========================================================= */
  const toggleForms = (showSignup) => {
    // Hide errors
    setMsg(msgEl, "");
    setMsg(msgSignupEl, "");

    // Simple display toggle
    if (showSignup) {
      if (formLogin) formLogin.style.display = "none";
      if (formSignup) formSignup.style.display = "flex"; // .form-stack uses flex

      // Hide brand panel title if on mobile? (Optional)
    } else {
      if (formSignup) formSignup.style.display = "none";
      if (formLogin) formLogin.style.display = "flex";
    }
  };

  if (btnToggleSignup) {
    btnToggleSignup.addEventListener("click", () => toggleForms(true));
  }
  if (btnBackToLogin) {
    btnBackToLogin.addEventListener("click", () => toggleForms(false));
  }

  /* =========================================================
     4. LOGIN LOGIC
     ========================================================= */
  if (formLogin) {
    formLogin.addEventListener("submit", async (e) => {
      e.preventDefault();
      setMsg(msgEl, "");

      const email = (emailVal?.value || "").trim();
      const password = (passwordVal?.value || "").trim();

      if (!email || !password) {
        setMsg(msgEl, "Ingresá email y contraseña.", "error");
        return;
      }

      setMsg(msgEl, "Ingresando...");

      const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

      if (error) {
        console.error("Login Error:", error);

        let msg = "Error al ingresar: " + error.message;
        if (error.message.includes("Invalid login credentials")) {
          msg = "Credenciales incorrectas. Verificá tu email y contraseña.";
        } else if (error.message.includes("Email not confirmed")) {
          msg = "Tu email no ha sido confirmado. Revisá tu bandeja de entrada.";
        }

        setMsg(msgEl, msg, "error");
        return;
      }

      // Dejar que guard.js resuelva la sesión y redireccione
      window.location.href = "index.html";
    });
  }

  /* =========================================================
     5. SIGNUP LOGIC (With Invitation Code)
     ========================================================= */
  if (formSignup) {
    formSignup.addEventListener("submit", async (e) => {
      e.preventDefault();
      setMsg(msgSignupEl, "");

      const name = (regName?.value || "").trim();
      const email = (regEmail?.value || "").trim();
      const password = (regPass?.value || "").trim();
      const code = (regCode?.value || "").trim();

      if (!name || !email || !password || !code) {
        setMsg(msgSignupEl, "Completá todos los campos.", "error");
        return;
      }

      if (password.length < 6) {
        setMsg(msgSignupEl, "La contraseña debe tener al menos 6 caracteres.", "error");
        return;
      }

      setMsg(msgSignupEl, "Validando código...");

      try {
        // 1. Check Invitation Code (RPC Call)
        // Make sure you created the 'check_invite_code' function in SQL!
        const { data: isValid, error: rpcError } = await supabaseClient
          .rpc('check_invite_code', { lookup_code: code });

        if (rpcError) {
          console.error(rpcError);
          setMsg(msgSignupEl, "Error validando código (RPC).", "error");
          return;
        }

        if (!isValid) {
          setMsg(msgSignupEl, "El código de invitación no es válido.", "error");
          return;
        }

        // 2. Code is valid, proceed to SignUp
        setMsg(msgSignupEl, "Creando usuario...");

        const { data, error: authError } = await supabaseClient.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: name } // Metadata for initial profile
          }
        });

        if (authError) {
          setMsg(msgSignupEl, "Error al crear usuario: " + authError.message, "error");
          return;
        }

        // 3. Success
        // If "Auto Confirm" is on in Supabase, they are logged in.
        // If "Confirm Email" is on, they need to check inbox.
        if (data.session) {
          // User is logged in immediately
          setMsg(msgSignupEl, "¡Cuenta creada! Redirigiendo...", "success");
          setTimeout(() => {
            window.location.href = "index.html";
          }, 1500);
        } else {
          // Email confirmation required
          setMsg(msgSignupEl, "Cuenta creada. Por favor verificá tu email para continuar.", "success");
        }

      } catch (err) {
        console.error(err);
        setMsg(msgSignupEl, "Ocurrió un error inesperado.", "error");
      }
    });
  }

  /* =========================================================
     6. RESET PASSWORD
     ========================================================= */
  if (btnReset) {
    btnReset.addEventListener("click", async () => {
      setMsg(msgEl, "");

      const email = (emailVal?.value || "").trim();

      if (!email) {
        setMsg(msgEl, "Ingresá tu Email para recuperar la contraseña.", "error");
        return;
      }

      setMsg(msgEl, "Enviando email...");

      try {
        // Usamos href para asegurar que funcione en subcarpetas
        const redirectUrl = window.location.href.split('?')[0].split('#')[0];

        const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
          redirectTo: redirectUrl,
        });

        if (error) {
          setMsg(msgEl, "Error enviando recuperación: " + error.message, "error");
          return;
        }

        setMsg(msgEl, "Listo. Revisá tu email para continuar.");
      } catch (err) {
        console.error(err);
        setMsg(msgEl, "Error inesperado.", "error");
      }
    });
  }
  /* =========================================================
     7. PASSWORD RECOVERY HANDLING
     ========================================================= */
  const formUpdate = document.getElementById("formUpdatePassword");
  const newPassEl = document.getElementById("new_password");
  const btnSavePass = document.getElementById("btnSavePassword");
  const msgUpdateEl = document.getElementById("msgUpdate");

  // Supabase Auth State Change Listener
  supabaseClient.auth.onAuthStateChange(async (event, session) => {
    if (event === "PASSWORD_RECOVERY") {
      // User clicked the reset link
      setMsg(msgEl, "Modo recuperación de contraseña", "info");

      // Hide other forms, show Update form
      toggleForms(false); // hides signup
      if (formLogin) formLogin.style.display = "none";
      if (formUpdate) formUpdate.style.display = "flex";
    }
  });

  // Fallback: Check hash manually if event fires too early
  if (window.location.hash && window.location.hash.includes("type=recovery")) {
    setMsg(msgEl, "Modo recuperación de contraseña", "info");
    toggleForms(false);
    if (formLogin) formLogin.style.display = "none";
    if (formUpdate) formUpdate.style.display = "flex";
  }

  if (formUpdate) {
    formUpdate.addEventListener("submit", async (e) => {
      e.preventDefault();
      setMsg(msgUpdateEl, "");

      const newPassword = (newPassEl?.value || "").trim();
      if (newPassword.length < 6) {
        setMsg(msgUpdateEl, "La contraseña debe tener al menos 6 caracteres.", "error");
        return;
      }

      setMsg(msgUpdateEl, "Actualizando contraseña...");

      const { error } = await supabaseClient.auth.updateUser({ password: newPassword });

      if (error) {
        setMsg(msgUpdateEl, "Error al actualizar: " + error.message, "error");
        return;
      }

      setMsg(msgUpdateEl, "¡Contraseña actualizada! Ingresando...", "success");
      setTimeout(() => {
        window.location.href = "index.html";
      }, 1500);
    });
  }

});
