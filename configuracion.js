document.addEventListener("DOMContentLoaded", async () => {
    const supabaseClient = window.supabaseClient;
    const showToast = window.showToast; // From common.js

    // Elements
    const formProfile = document.getElementById("formProfile");
    const profileNameInput = document.getElementById("profileName");
    const profileEmailInput = document.getElementById("profileEmail");
    const btnSaveProfile = document.getElementById("btnSaveProfile");

    const formPassword = document.getElementById("formPassword");
    const newPassInput = document.getElementById("newPassword");
    const confirmPassInput = document.getElementById("confirmPassword");
    const btnUpdatePassword = document.getElementById("btnUpdatePassword");

    // 1. Load Current User Data
    const loadUserData = async () => {
        const { data: { user }, error } = await supabaseClient.auth.getUser();

        if (error || !user) {
            console.error("Error loading user", error);
            // guard.js should handle redirect, but just in case
            return;
        }

        // Populate fields
        profileEmailInput.value = user.email || "";

        // Metadata might be in user.user_metadata or user.user_metadata
        const meta = user.user_metadata || {};
        if (meta.display_name) {
            profileNameInput.value = meta.display_name;
        }
    };

    await loadUserData();

    // 2. Handle Profile Update
    if (formProfile) {
        formProfile.addEventListener("submit", async (e) => {
            e.preventDefault();
            const newName = (profileNameInput.value || "").trim();

            if (!newName) {
                showToast("El nombre no puede estar vacío.", "warning");
                return;
            }

            btnSaveProfile.disabled = true;
            btnSaveProfile.textContent = "Guardando...";

            const { error } = await supabaseClient.auth.updateUser({
                data: { display_name: newName }
            });

            btnSaveProfile.disabled = false;
            btnSaveProfile.textContent = "Guardar Cambios";

            if (error) {
                console.error(error);
                showToast("Error al actualizar perfil: " + error.message, "error");
            } else {
                showToast("Perfil actualizado correctamente.", "success");
                // Update topbar name if common.js doesn't do it automatically (it usually reads from session on load)
                // We can force a reload or manually update the DOM element if we knew its ID (it is #currentUserName)
                const topbarUser = document.getElementById("currentUserName");
                if (topbarUser) topbarUser.textContent = newName;
            }
        });
    }

    // 3. Handle Password Update
    if (formPassword) {
        formPassword.addEventListener("submit", async (e) => {
            e.preventDefault();
            const newPass = (newPassInput.value || "").trim();
            const confirmPass = (confirmPassInput.value || "").trim();

            if (!newPass) {
                showToast("Ingresá una nueva contraseña.", "warning");
                return;
            }
            if (newPass.length < 6) {
                showToast("La contraseña debe tener al menos 6 caracteres.", "warning");
                return;
            }
            if (newPass !== confirmPass) {
                showToast("Las contraseñas no coinciden.", "error");
                return;
            }

            btnUpdatePassword.disabled = true;
            btnUpdatePassword.textContent = "Actualizando...";

            const { error } = await supabaseClient.auth.updateUser({
                password: newPass
            });

            btnUpdatePassword.disabled = false;
            btnUpdatePassword.textContent = "Actualizar Contraseña";

            if (error) {
                console.error(error);
                showToast("Error al actualizar contraseña: " + error.message, "error");
            } else {
                showToast("Contraseña actualizada exitosamente.", "success");
                formPassword.reset();
            }
        });
    }
});
