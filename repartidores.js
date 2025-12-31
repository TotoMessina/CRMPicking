/* =========================================================
   repartidores.js
   Gestión de Repartidores (CRUD + Historial)
   ========================================================= */

// =========================================================
// 1) Conexión Supabase (common.js)
// =========================================================
const supabaseClient = window.supabaseClient;
const THEME_KEY = "crm_theme";
const FILTERS_KEY = "crm_repartidores_filters";

async function requireAuthOrRedirect() {
    if (window.CRM_GUARD_READY) {
        try { await window.CRM_GUARD_READY; } catch (_) { }
    }
    if (window.CRM_USER && window.CRM_USER.activo === true) return window.CRM_USER;

    // Fallback if guard didn't set it
    try {
        const { data, error } = await supabaseClient.auth.getSession();
        if (error || !data.session) {
            window.location.href = "login.html";
            return null;
        }
        return { nombre: "Usuario" }; // Minimal
    } catch (e) {
        window.location.href = "login.html";
        return null;
    }
}

function getUsuarioActual() {
    return (window.CRM_USER?.nombre || "").trim() || (localStorage.getItem("usuarioActual") || "").trim();
}

function asegurarUsuarioValido() {
    const u = getUsuarioActual();
    if (u) return true;
    showToast("Tu sesión no es válida. Volvé a iniciar sesión.", "error");
    setTimeout(() => window.location.href = "login.html", 1500);
    return false;
}

function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);
    const btn = document.getElementById("btnToggleTheme");
    if (btn) btn.textContent = theme === "dark" ? "Modo día ☀️" : "Modo noche 🌙";
}


/* ============================
   HELPERS
   ============================ */
/* ============================
   HELPERS
   ============================ */

function debounce(fn, delay = 300) {
    let t = null;
    return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...args), delay);
    };
}

function setText(id, v) {
    const el = document.getElementById(id);
    if (el) el.textContent = String(v);
}
function getVal(id) {
    const el = document.getElementById(id);
    return el ? el.value : "";
}
function getTrim(id) {
    return (getVal(id) || "").toString().trim();
}
function setValueIfExists(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = value ?? "";
}
function formatFechaISO(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleString("es-AR");
}

/* ============================
   MODAL FORM (ALTA / EDICIÓN)
   ============================ */
function openModalById(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
}
function closeModalById(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
}
function setModalFormTitle(txt) {
    const t = document.getElementById("modalFormRepTitle");
    if (t) t.textContent = txt;
}

function openFormNuevo() {
    setModalFormTitle("Nuevo repartidor");
    resetFormulario();
    // Limpiar created_at
    const createdInput = document.getElementById("created_at");
    if (createdInput) createdInput.value = "";

    openModalById("modalFormRepartidor");
}

function openFormEditarById(id) {
    const c = repartidoresCache.find((x) => String(x.id) === String(id));
    if (!c) return;

    setModalFormTitle("Editar repartidor");
    setValueIfExists("repartidorId", c.id);
    setValueIfExists("nombre", c.nombre || "");
    setValueIfExists("telefono", c.telefono || "");
    setValueIfExists("mail", c.email || "");
    setValueIfExists("localidad", c.localidad || "");
    setValueIfExists("direccion", c.direccion || "");
    setValueIfExists("estado", c.estado || "Documentación sin gestionar");
    setValueIfExists("responsable", c.responsable || "");
    setValueIfExists("notas", c.notas || "");

    // Populate created_at
    const createdInput = document.getElementById("created_at");
    if (createdInput) {
        if (r.created_at) {
            // Convert ISO to YYYY-MM-DDTHH:MM for datetime-local
            const d = new Date(r.created_at);
            const pad = (n) => String(n).padStart(2, "0");
            const fmt = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
            createdInput.value = fmt;
        } else {
            createdInput.value = "";
        }
    }

    openModalById("modalFormRepartidor");
}

function initModalFormUI() {
    const modal = document.getElementById("modalFormRepartidor");
    const btnNuevo = document.getElementById("btnNuevoRepartidor");

    if (btnNuevo) btnNuevo.addEventListener("click", openFormNuevo);

    if (modal) {
        modal.addEventListener("click", (e) => {
            const t = e.target;
            if (t?.dataset?.close === "true") closeModalById("modalFormRepartidor");
        });
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && modal.classList.contains("is-open")) closeModalById("modalFormRepartidor");
        });
    }
}

/* ============================
   PAGINACIÓN + FILTROS
   ============================ */
let currentPage = 1;
let totalPages = 1;
let pageSize = 25;
let totalRepartidores = 0;

function saveFilters() {
    const data = {
        nombre: getTrim("filtroNombre"),
        telefono: getTrim("filtroTelefono"),
        localidad: getTrim("filtroLocalidad"),
        estado: getVal("filtroEstado") || "Todos",
        responsable: getVal("filtroResponsable"),
    };
    localStorage.setItem(FILTERS_KEY, JSON.stringify(data));
}

function loadFilters() {
    const raw = localStorage.getItem(FILTERS_KEY);
    if (!raw) return;
    try {
        const f = JSON.parse(raw);
        if (document.getElementById("filtroNombre")) document.getElementById("filtroNombre").value = f.nombre || "";
        if (document.getElementById("filtroTelefono")) document.getElementById("filtroTelefono").value = f.telefono || "";
        if (document.getElementById("filtroLocalidad")) document.getElementById("filtroLocalidad").value = f.localidad || "";
        if (document.getElementById("filtroEstado")) document.getElementById("filtroEstado").value = f.estado || "Todos";
        if (document.getElementById("filtroResponsable")) document.getElementById("filtroResponsable").value = f.responsable || "";
    } catch (_) { }
}

function updatePaginationUI() {
    const info = document.getElementById("pageInfo");
    if (info) info.textContent = `${currentPage}/${totalPages}`;
}

/* ============================
   MODAL ACTIVIDAD (Repartidor)
   ============================ */
let modalActRepTargetId = null;
let modalActRepTargetNombre = "";

function ensureModalElements() {
    return {
        modal: document.getElementById("modalActRep"),
        sub: document.getElementById("modalActRepSub"),
        desc: document.getElementById("actRepDescripcion"),
        dt: document.getElementById("actRepFecha"),
        usuario: document.getElementById("actRepUsuario"),
        btnSave: document.getElementById("btnActRepSave"),
    };
}

function openModalActRep(repartidorId, repartidorNombre) {
    const { modal, sub, desc, dt, usuario } = ensureModalElements();
    if (!modal) return;

    modalActRepTargetId = Number(repartidorId);
    modalActRepTargetNombre = repartidorNombre || "";

    if (sub) sub.textContent = `Repartidor: ${modalActRepTargetNombre} (ID: ${modalActRepTargetId})`;
    if (desc) desc.value = "";
    if (usuario) usuario.value = getUsuarioActual() || "";
    if (dt) {
        const now = new Date();
        const pad = (n) => String(n).padStart(2, "0");
        dt.value = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    }

    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
}

function closeModalActRep() {
    const { modal } = ensureModalElements();
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    modalActRepTargetId = null;
}

async function guardarActividadDesdeModal() {
    if (!asegurarUsuarioValido()) return;
    const { desc, dt, usuario } = ensureModalElements();

    if (!modalActRepTargetId) return alert("No hay repartidor seleccionado.");
    const descripcion = (desc?.value || "").trim();
    if (!descripcion) return alert("La descripción es obligatoria.");

    let fechaISO = dt?.value ? new Date(dt.value).toISOString() : new Date().toISOString();

    const payload = {
        repartidor_id: modalActRepTargetId,
        descripcion,
        fecha_accion: fechaISO,
        usuario: (usuario?.value || "").trim() || (getUsuarioActual() || null),
    };

    const { error } = await supabaseClient.from("actividades_repartidores").insert([payload]);
    if (error) {
        console.error(error);
        alert("Error al guardar actividad: " + error.message);
        return;
    }

    closeModalActRep();
    await cargarRepartidores();
}

function initModalActRepUI() {
    const { modal, btnSave } = ensureModalElements();
    if (btnSave) btnSave.addEventListener("click", guardarActividadDesdeModal);
    if (modal) {
        modal.addEventListener("click", (e) => {
            if (e.target?.dataset?.close === "true") closeModalActRep();
        });
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && modal.classList.contains("is-open")) closeModalActRep();
        });
    }
}

async function agregarActividadAuto(repartidorId, descripcion) {
    const usr = getUsuarioActual();
    await supabaseClient.from("actividades_repartidores").insert([{
        repartidor_id: repartidorId,
        descripcion,
        usuario: usr || "Sistema",
        fecha_accion: new Date().toISOString()
    }]);
}

/* ============================
   CRUD
   ============================ */
let repartidoresCache = [];

function resetFormulario() {
    setValueIfExists("repartidorId", "");
    ["nombre", "telefono", "mail", "localidad", "direccion", "estado", "responsable", "notas"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = (id === "estado") ? "Documentación sin gestionar" : "";
    });
}

async function guardarRepartidor(e) {
    e.preventDefault();
    if (!asegurarUsuarioValido()) return;

    const id = getVal("repartidorId");
    const nombre = getTrim("nombre");
    if (!nombre) return alert("El nombre es obligatorio.");

    const createdInput = document.getElementById("created_at");
    let createdAtVal = createdInput && createdInput.value ? new Date(createdInput.value).toISOString() : null;

    const payload = {
        nombre,
        telefono: getTrim("telefono") || null,
        email: getTrim("mail") || null,
        localidad: getTrim("localidad") || null,
        direccion: getTrim("direccion") || null,
        estado: getVal("estado") || "Documentación sin gestionar",
        responsable: getVal("responsable") || null,
        notas: getTrim("notas") || null,
    };

    // Solo agregar created_at si se completó algo, si no dejar que DB maneje (insert) o no tocar (update)
    if (createdAtVal) {
        payload.created_at = createdAtVal;
    }

    let err = null;
    let savedId = id;

    if (id) {
        const { error } = await supabaseClient.from("repartidores").update(payload).eq("id", id);
        err = error;
        if (!err) await agregarActividadAuto(id, "Repartidor actualizado");
    } else {
        // New
        const { data, error } = await supabaseClient.from("repartidores").insert([payload]).select("id").single();
        err = error;
        if (!err && data?.id) {
            savedId = data.id;
            await agregarActividadAuto(savedId, "Repartidor creado");
        }
    }

    if (err) {
        console.error(err);
        alert("Error al guardar: " + err.message);
        return;
    }

    resetFormulario();
    closeModalById("modalFormRepartidor");
    currentPage = 1;
    await cargarRepartidores();
}

async function eliminarRepartidor(id) {
    if (!asegurarUsuarioValido()) return;
    if (!confirm("¿Seguro que querés eliminar a este repartidor?")) return;

    // Physical delete or logical if column exists. Assuming physical for now unless sql added 'activo'.
    // NOTE: SQL schema provided didn't specify 'activo', so we do DELETE. 
    // If you prefer logical, update SQL and use update({activo:false}).
    const { error } = await supabaseClient.from("repartidores").delete().eq("id", id);
    if (error) return alert("Error al eliminar: " + error.message);

    await cargarRepartidores();
}

/* ============================
   LISTADO + HISTORIAL
   ============================ */
async function cargarRepartidores() {
    const listaDiv = document.getElementById("lista");
    if (!listaDiv) return;
    listaDiv.innerHTML = "<p>Cargando...</p>";

    const ps = document.getElementById("pageSize");
    if (ps) pageSize = Number(ps.value) || 25;

    const fNombre = getTrim("filtroNombre");
    const fTel = getTrim("filtroTelefono");
    const fLoc = getTrim("filtroLocalidad");
    const fEst = getVal("filtroEstado");
    const fResp = getVal("filtroResponsable");

    let query = supabaseClient.from("repartidores").select("*", { count: "exact" });

    if (fEst && fEst !== "Todos") query = query.eq("estado", fEst);
    if (fNombre) query = query.ilike("nombre", `%${fNombre}%`);
    if (fTel) query = query.ilike("telefono", `%${fTel}%`);
    if (fLoc) query = query.ilike("localidad", `%${fLoc}%`);
    if (fResp) query = query.eq("responsable", fResp);

    query = query.order("created_at", { ascending: false });

    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize - 1;

    const { data: pageResult, error, count } = await query.range(start, end);

    if (error) {
        console.error(error);
        listaDiv.innerHTML = "<p>Error al cargar repartidores.</p>";
        return;
    }

    const repartidores = pageResult || [];
    totalRepartidores = count ?? 0;
    totalPages = totalRepartidores > 0 ? Math.ceil(totalRepartidores / pageSize) : 1;

    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    repartidoresCache = repartidores;
    updatePaginationUI();
    setText("contador", `(${totalRepartidores})`);

    if (!repartidores.length) {
        listaDiv.innerHTML = "<p>No hay repartidores.</p>";
        return;
    }

    // Load latest activities
    const ids = repartidores.map(r => r.id);
    let actsById = {};
    if (ids.length) {
        const { data: acts } = await supabaseClient.from("actividades_repartidores").select("*").in("repartidor_id", ids).order("fecha_accion", { ascending: false });
        (acts || []).forEach(a => {
            if (!actsById[a.repartidor_id]) actsById[a.repartidor_id] = [];
            actsById[a.repartidor_id].push(a);
        });
    }

    const html = repartidores.map(r => {
        const acts = actsById[r.id] || [];
        const contacto = [r.telefono, r.email, r.localidad].filter(Boolean).join(" · ");

        return `
      <div class="card">
        <div class="card-top">
            <div>
                <div class="card-main-title">${r.nombre || "(Sin nombre)"}</div>
                <div class="card-meta">
                    ${contacto}
                    ${r.direccion ? `<br>🏠 ${r.direccion}` : ""}
                </div>
                <div class="card-tags" style="margin-top:8px">
                    <span class="tag">Estado: ${r.estado || "-"}</span>
                    ${r.responsable ? `<span class="tag tag-responsable">${r.responsable}</span>` : ""}
                </div>
                ${r.notas ? `<div class="card-notas"><strong>Notas:</strong> ${r.notas}</div>` : ""}
            </div>
            <div class="card-buttons">
                <button class="btn-edit" onclick="openFormEditarById(${r.id})">Editar</button>
                <button class="btn-delete" onclick="eliminarRepartidor(${r.id})">Eliminar</button>
                <button class="btn-add-historial" onclick="openModalActRep(${r.id}, '${r.nombre}')">+ Actividad</button>
            </div>
        </div>
        <div class="historial">
            <div class="historial-header">
                <strong>Historial (${acts.length})</strong>
                <button class="btn-toggle-historial" onclick="this.parentElement.parentElement.classList.toggle('open')">Ver</button>
            </div>
            <div class="historial-list">
                 ${acts.length ? acts.map(a => `
                    <div class="historial-item">
                        <div class="historial-desc">${a.descripcion}</div>
                        <div class="historial-fecha">${formatFechaISO(a.fecha_accion)} · ${a.usuario || ""}</div>
                    </div>
                 `).join("") : `<div class="historial-empty">Sin movimientos.</div>`}
            </div>
        </div>
      </div>
      `;
    }).join("");

    listaDiv.innerHTML = html;
}

/* =========================================================
   EXCEL (REPARTIDORES)
   ========================================================= */

// Helpers para Excel (Dates)
function excelDateToISO(v) {
    if (!v) return null;
    if (v instanceof Date && !Number.isNaN(v.getTime())) {
        const d = new Date(v);
        d.setHours(0, 0, 0, 0);
        return d.toISOString().slice(0, 10);
    }
    if (typeof v === "number") {
        // Excel base date logic
        const epoch = new Date(Date.UTC(1899, 11, 30));
        const d = new Date(epoch.getTime() + v * 24 * 60 * 60 * 1000);
        d.setHours(0, 0, 0, 0);
        return d.toISOString().slice(0, 10);
    }
    const s = (v || "").toString().trim();
    if (!s) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    // DD/MM/YYYY
    const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (m) {
        const dd = String(m[1]).padStart(2, "0");
        const mm = String(m[2]).padStart(2, "0");
        const yyyy = m[3];
        return `${yyyy}-${mm}-${dd}`;
    }
    return null;
}

function parseExcelFileToJson(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const wb = XLSX.read(data, { type: "array", cellDates: true });
                const sheetName = wb.SheetNames[0];
                const ws = wb.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(ws, { defval: "" });
                resolve(json);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

function getRowField(row, ...keys) {
    const rowKeys = Object.keys(row || {});
    for (const k of keys) {
        const found = rowKeys.find((rk) => rk.toLowerCase() === k.toLowerCase());
        if (found) return row[found];
    }
    return "";
}

function mapRowToRepartidor(row) {
    // Adaptado para repartidores
    const nombre = (getRowField(row, "nombre", "name") || "").toString().trim();
    const telefono = (getRowField(row, "telefono", "tel", "celular") || "").toString().trim();
    const email = (getRowField(row, "email", "mail", "correo") || "").toString().trim();
    const localidad = (getRowField(row, "localidad", "ciudad") || "").toString().trim();
    const direccion = (getRowField(row, "direccion", "domicilio") || "").toString().trim();
    const estado = (getRowField(row, "estado") || "").toString().trim() || "Documentación sin gestionar";
    const responsable = (getRowField(row, "responsable") || "").toString().trim() || null;
    const notas = (getRowField(row, "notas", "nota", "observaciones") || "").toString().trim();

    return {
        nombre,
        telefono: telefono || null,
        email: email || null,
        localidad: localidad || null,
        direccion: direccion || null,
        estado,
        responsable,
        notas: notas || null
    };
}

function descargarModeloRepartidoresExcel() {
    if (typeof XLSX === 'undefined') {
        alert("Error crítico: La librería XLSX no está cargada. Recarga la página.");
        return;
    }

    try {
        const headers = [
            "nombre",
            "telefono",
            "email",
            "localidad",
            "direccion",
            "estado",
            "responsable",
            "notas"
        ];

        const example = [
            {
                nombre: "Ej: Juan Pérez",
                telefono: "+54 11 1234-5678",
                email: "juan@repartidor.com",
                localidad: "CABA",
                direccion: "Av. Corrientes 1234",
                estado: "Documentación sin gestionar",
                responsable: "Toto",
                notas: "Moto 110cc",
            },
        ];

        const ws = XLSX.utils.json_to_sheet(example, { header: headers });
        XLSX.utils.sheet_add_aoa(ws, [headers], { origin: "A1" });
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "modelo_repartidores");

        try {
            const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([wbout], { type: "application/octet-stream" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "modelo_repartidores.xlsx";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error(e);
            alert("Error descargando modelo: " + e.message);
        }

    } catch (e) {
        alert("Error generando Excel: " + e.message);
        console.error(e);
    }
}

async function exportarRepartidoresExcel() {
    const { data, error } = await supabaseClient.from("repartidores").select("*").order("id");

    if (error) {
        alert("Error exportando: " + error.message);
        return;
    }

    const rows = (data || []).map(r => ({
        id: r.id,
        nombre: r.nombre,
        telefono: r.telefono,
        email: r.email,
        localidad: r.localidad,
        direccion: r.direccion,
        estado: r.estado,
        responsable: r.responsable,
        notas: r.notas,
        created_at: r.created_at
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "repartidores");

    // Usar Blob y link manual para mayor control
    try {
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([wbout], { type: "application/octet-stream" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "repartidores_export.xlsx";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (e) {
        console.error(e);
        alert("Error al descargar el archivo: " + e.message);
    }
}

async function importarRepartidoresDesdeExcel(file) {
    try {
        const json = await parseExcelFileToJson(file);
        if (!json || !json.length) return alert("El archivo parece vacío.");

        let count = 0;
        let errors = 0;

        for (const row of json) {
            const mapped = mapRowToRepartidor(row);
            if (!mapped.nombre) continue; // Skip empty names

            const { error } = await supabaseClient.from("repartidores").insert([mapped]);
            if (error) {
                console.error("Error importando fila", row, error);
                errors++;
            } else {
                count++;
            }
        }

        alert(`Importación finalizada.\nCargados: ${count}\nErrores: ${errors}`);
        currentPage = 1;
        cargarRepartidores();
    } catch (e) {
        console.error(e);
        alert("Error al procesar archivo Excel.");
    }
}

/* ============================
   INIT
   ============================ */
document.addEventListener("DOMContentLoaded", async () => {
    // Theme
    const t = localStorage.getItem(THEME_KEY) || "light";
    applyTheme(t);
    document.getElementById("btnToggleTheme")?.addEventListener("click", () => {
        const current = document.documentElement.getAttribute("data-theme");
        applyTheme(current === "dark" ? "light" : "dark");
    });

    await requireAuthOrRedirect();
    loadFilters();
    initModalFormUI();
    initModalActRepUI();

    document.getElementById("filtroNombre")?.addEventListener("input", debounce(() => { saveFilters(); currentPage = 1; cargarRepartidores(); }));
    document.getElementById("filtroTelefono")?.addEventListener("input", debounce(() => { saveFilters(); currentPage = 1; cargarRepartidores(); }));
    document.getElementById("filtroLocalidad")?.addEventListener("input", debounce(() => { saveFilters(); currentPage = 1; cargarRepartidores(); }));
    document.getElementById("filtroEstado")?.addEventListener("change", () => { saveFilters(); currentPage = 1; cargarRepartidores(); });
    document.getElementById("filtroResponsable")?.addEventListener("change", () => { saveFilters(); currentPage = 1; cargarRepartidores(); });

    document.getElementById("btnPrevPagina")?.addEventListener("click", () => { if (currentPage > 1) { currentPage--; cargarRepartidores(); } });
    document.getElementById("btnNextPagina")?.addEventListener("click", () => { if (currentPage < totalPages) { currentPage++; cargarRepartidores(); } });
    document.getElementById("pageSize")?.addEventListener("change", () => { currentPage = 1; cargarRepartidores(); });

    document.getElementById("formRepartidor")?.addEventListener("submit", guardarRepartidor);
    document.getElementById("btnReset")?.addEventListener("click", resetFormulario);

    document.getElementById("btnRepDescargarModelo")?.addEventListener("click", (e) => {
        e.preventDefault();
        descargarModeloRepartidoresExcel();
    });

    document.getElementById("btnRepExportarExcel")?.addEventListener("click", (e) => {
        e.preventDefault();
        exportarRepartidoresExcel();
    });

    const inputImport = document.getElementById("inputRepExcel");
    if (inputImport) {
        inputImport.addEventListener("change", (e) => {
            if (e.target.files && e.target.files[0]) {
                importarRepartidoresDesdeExcel(e.target.files[0]);
                e.target.value = ""; // reset
            }
        });
    }

    // Initial Load
    cargarRepartidores();
});
