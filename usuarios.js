document.addEventListener("DOMContentLoaded", async () => {
    const supabaseClient = window.supabaseClient;
    const showToast = window.showToast; // common.js

    // Elements
    const listaUsuarios = document.getElementById("listaUsuarios");
    const filtroNombre = document.getElementById("filtroNombre");
    const filtroRol = document.getElementById("filtroRol");
    const btnRefrescar = document.getElementById("btnRefrescar");

    // Modal elements
    const modalRol = document.getElementById("modalRol");
    const btnCerrarModalRol = document.getElementById("btnCerrarModalRol");
    const btnCancelarRol = document.getElementById("btnCancelarRol");
    const formRol = document.getElementById("formRol");
    const editUserId = document.getElementById("editUserId");
    const editUserName = document.getElementById("editUserName");
    const selectRol = document.getElementById("selectRol");
    const checkActivo = document.getElementById("checkActivo");

    let usuariosCache = [];

    // 1. Initial Load
    await cargarUsuarios();

    if (btnRefrescar) {
        btnRefrescar.addEventListener("click", cargarUsuarios);
    }

    // Filters
    if (filtroNombre) filtroNombre.addEventListener("input", renderUsuarios);
    if (filtroRol) filtroRol.addEventListener("change", renderUsuarios);

    // 2. Fetch Users
    async function cargarUsuarios() {
        if (!listaUsuarios) return;
        listaUsuarios.innerHTML = '<tr><td colspan="5">Cargando...</td></tr>';

        try {
            const { data, error } = await supabaseClient
                .from("usuarios")
                .select("*")
                .order("nombre", { ascending: true });

            if (error) {
                console.error("Error cargando usuarios:", error);
                listaUsuarios.innerHTML = '<tr><td colspan="5">Error al cargar usuarios.</td></tr>';
                return;
            }

            usuariosCache = data || [];
            renderUsuarios();

        } catch (e) {
            console.error(e);
            listaUsuarios.innerHTML = '<tr><td colspan="5">Error inesperado.</td></tr>';
        }
    }

    // 3. Render
    function renderUsuarios() {
        if (!listaUsuarios) return;

        const txt = (filtroNombre.value || "").toLowerCase().trim();
        const rol = filtroRol.value || "";

        const filtered = usuariosCache.filter(u => {
            const n = (u.nombre || "").toLowerCase();
            const e = (u.email || "").toLowerCase();
            const r = (u.role || "user"); // rol actual o user

            const matchText = !txt || n.includes(txt) || e.includes(txt);
            const matchRol = !rol || r === rol;

            return matchText && matchRol;
        });

        if (filtered.length === 0) {
            listaUsuarios.innerHTML = '<tr><td colspan="5">No se encontraron usuarios.</td></tr>';
            return;
        }

        listaUsuarios.innerHTML = filtered.map(u => {
            const rolStr = u.role || "user";
            const activoStr = u.activo ? '<span class="tag tag-success">Activo</span>' : '<span class="tag tag-error">Inactivo</span>';

            return `
        <tr>
          <td>${u.nombre || "-"}</td>
          <td>${u.email || "-"}</td>
          <td><span class="tag">${rolStr}</span></td>
          <td>${activoStr}</td>
          <td>
            <button class="btn-secundario btn-sm" onclick="abrirEditar('${u.id}')">Editar</button>
          </td>
        </tr>
      `;
        }).join("");
    }

    // 4. Modal Logic
    window.abrirEditar = (id) => {
        const u = usuariosCache.find(x => x.id === id);
        if (!u) return;

        editUserId.value = u.id;
        editUserName.textContent = `Usuario: ${u.nombre || u.email}`;
        selectRol.value = u.role || "user";
        checkActivo.checked = u.activo === true;

        modalRol.style.display = "flex";
    };

    function cerrarModal() {
        modalRol.style.display = "none";
    }

    if (btnCerrarModalRol) btnCerrarModalRol.addEventListener("click", cerrarModal);
    if (btnCancelarRol) btnCancelarRol.addEventListener("click", cerrarModal);

    // 5. Submit Update
    if (formRol) {
        formRol.addEventListener("submit", async (e) => {
            e.preventDefault();

            const id = editUserId.value;
            const newRol = selectRol.value;
            const isActive = checkActivo.checked;

            if (!id) return;

            try {
                const { error } = await supabaseClient
                    .from("usuarios")
                    .update({ role: newRol, activo: isActive })
                    .eq("id", id);

                if (error) {
                    alert("Error actualizando: " + error.message);
                } else {
                    showToast("Usuario actualizado correctamente.", "success");
                    cerrarModal();
                    cargarUsuarios(); // Reload list
                }
            } catch (err) {
                console.error(err);
                alert("Error inesperado.");
            }
        });
    }

});
