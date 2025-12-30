/* =========================================================
   consumidores.js (ACTUALIZADO)
   - Reusa el usuario guardado en Clientes (localStorage: "usuarioActual")
   - CRUD consumidores + historial (actividades_consumidores)
   - Botón "+ Actividad" por consumidor (modal)
   - Filtros + paginación
   - Excel: descargar modelo / importar / exportar
   - NUEVO: Formulario de alta/edición en MODAL (btnNuevoConsumidor)
   ========================================================= */

/* ============================
   CONFIG + THEME + USER
   ============================ */

const SUPABASE_URL = window.SUPABASE_URL || "https://mflftikcvsnniwwanrkj.supabase.co";
const SUPABASE_ANON_KEY =
  window.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mbGZ0aWtjdnNubml3d2FucmtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NjcyMjAsImV4cCI6MjA3OTE0MzIyMH0.Z_EsaegFay24E0rOoX2PpwvWasWm5tfLcJiRrgs1nBY";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn("Faltan SUPABASE_URL / SUPABASE_ANON_KEY.");
}

const supabaseClient = (window.CRM_AUTH && window.CRM_AUTH.supabaseClient)
  ? window.CRM_AUTH.supabaseClient
  : supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const THEME_KEY = "crm_theme";
/* ============================
   AUTH (Supabase) - Login Gate
   Requiere que se carguen auth.js y guard.js en el HTML.
   Si no están, usa fallback con supabaseClient.auth.getSession().
   ============================ */
async function requireAuthOrRedirect() {
  // Esperar a que guard.js termine (evita condiciones de carrera)
  if (window.CRM_GUARD_READY) {
    try { await window.CRM_GUARD_READY; } catch (_) {}
  }

  // Si guard.js ya seteo el usuario, listo
  if (window.CRM_USER && window.CRM_USER.activo === true) return window.CRM_USER;

  // Fallback: chequear sesión y (si existe) cargar perfil desde public.usuarios
  try {
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) throw error;

    const session = data?.session;
    if (!session?.user) {
      window.location.href = "login.html";
      return null;
    }

    // Intentar traer perfil si tu esquema lo usa
    if (!window.CRM_USER) {
      const { data: perfil, error: e2 } = await supabaseClient
        .from("usuarios")
        .select("id, email, nombre, role, activo")
        .eq("id", session.user.id)
        .single();

      if (!e2 && perfil && perfil.activo === true) {
        window.CRM_USER = perfil;
        localStorage.setItem("usuarioActual", (perfil.nombre || "").trim());
      } else {
        // Si no existe tabla usuarios, al menos permitimos entrar con sesión
        window.CRM_USER = {
          id: session.user.id,
          email: session.user.email || "",
          nombre: (session.user.email || "Usuario").split("@")[0],
          role: "user",
          activo: true,
        };
        localStorage.setItem("usuarioActual", (window.CRM_USER.nombre || "").trim());
      }
    }

    if (!window.CRM_USER || window.CRM_USER.activo !== true) {
      window.location.href = "login.html";
      return null;
    }

    return window.CRM_USER;
  } catch (e) {
    console.error("Auth error:", e);
    window.location.href = "login.html";
    return null;
  }
}

function getAuthUserName() {
  const n = (window.CRM_USER?.nombre || "").trim();
  if (n) return n;
  return (localStorage.getItem("usuarioActual") || "").trim();
}

const FILTERS_KEY = "crm_consumidores_filters";

/* En tu CRM de Clientes se usa "usuarioActual". Ahora se prioriza el usuario autenticado (CRM_USER). */
function getUsuarioActual() {
  const authName = getAuthUserName();
  if (authName) return authName;

  // Fallback legacy (si algún módulo viejo escribe estas keys)
  const legacy =
    (localStorage.getItem("crm_usuario") || "").trim() ||
    (localStorage.getItem("usuarioConfirmado") || "").trim();

  if (legacy) {
    localStorage.setItem("usuarioActual", legacy);
    return legacy;
  }
  return "";
}

function asegurarUsuarioValido() {
  const u = getUsuarioActual();
  if (u) return true;

  alert("Tu sesión no es válida. Volvé a iniciar sesión.");
  window.location.href = "login.html";
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

function safeTrim(v) {
  return (v ?? "").toString().trim();
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

// Para queries con columna activo opcional
async function selectWithOptionalActivo(table, columns) {
  const r1 = await supabaseClient.from(table).select(columns).eq("activo", true);
  if (!r1.error) return r1;

  const msg = (r1.error?.message || "").toLowerCase();
  if (msg.includes("column") && msg.includes("activo") && msg.includes("does not exist")) {
    return await supabaseClient.from(table).select(columns);
  }
  return r1;
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
  const t = document.getElementById("modalFormConsTitle");
  if (t) t.textContent = txt;
}

function openFormNuevo() {
  setModalFormTitle("Nuevo consumidor");
  resetFormulario();
  openModalById("modalFormConsumidor");
}

function openFormEditarById(id) {
  const c = consumidoresCache.find((x) => String(x.id) === String(id));
  if (!c) return;

  setModalFormTitle("Editar consumidor");

  setValueIfExists("consumidorId", c.id);
  setValueIfExists("nombre", c.nombre || "");
  setValueIfExists("telefono", c.telefono || "");
  setValueIfExists("mail", c.mail || "");
  setValueIfExists("localidad", c.localidad || "");
  setValueIfExists("barrio", c.barrio || "");
  setValueIfExists("edad", c.edad ?? "");
  setValueIfExists("genero", c.genero || "");
  setValueIfExists("estado", c.estado || "Lead");
  setValueIfExists("responsable", c.responsable || "");
  setValueIfExists("fecha_proximo_contacto", c.fecha_proximo_contacto || "");

  const hora = c.hora_proximo_contacto ? String(c.hora_proximo_contacto).slice(0, 5) : "";
  setValueIfExists("hora_proximo_contacto", hora);

  setValueIfExists("notas", c.notas || "");

  openModalById("modalFormConsumidor");
}

function initModalFormUI() {
  const modal = document.getElementById("modalFormConsumidor");
  const btnNuevo = document.getElementById("btnNuevoConsumidor");

  if (btnNuevo) btnNuevo.addEventListener("click", openFormNuevo);

  if (modal) {
    // Cierra si tocás overlay o un botón con data-close="true"
    modal.addEventListener("click", (e) => {
      const t = e.target;
      if (t?.dataset?.close === "true") closeModalById("modalFormConsumidor");
    });

    // Cierra con ESC
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal.classList.contains("is-open")) closeModalById("modalFormConsumidor");
    });
  }
}

/* ============================
   PAGINACIÓN + FILTROS
   ============================ */

let currentPage = 1;
let totalPages = 1;
let pageSize = 25;
let totalConsumidores = 0;

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
  } catch (_) {}
}

function updatePaginationUI() {
  const info = document.getElementById("pageInfo");
  if (info) info.textContent = `${currentPage}/${totalPages}`;
}

/* ============================
   MODAL ACTIVIDAD (Consumidor)
   ============================ */

let modalActConsTargetId = null;
let modalActConsTargetNombre = "";

function ensureModalElements() {
  return {
    modal: document.getElementById("modalActCons"),
    sub: document.getElementById("modalActConsSub"),
    desc: document.getElementById("actConsDescripcion"),
    dt: document.getElementById("actConsFecha"),
    usuario: document.getElementById("actConsUsuario"),
    btnSave: document.getElementById("btnActConsSave"),
  };
}

function openModalActCons(consumidorId, consumidorNombre) {
  const { modal, sub, desc, dt, usuario } = ensureModalElements();
  if (!modal) return;

  modalActConsTargetId = Number(consumidorId);
  modalActConsTargetNombre = consumidorNombre || "";

  if (sub) sub.textContent = `Consumidor: ${modalActConsTargetNombre} (ID: ${modalActConsTargetId})`;

  if (desc) desc.value = "";
  if (usuario) usuario.value = getUsuarioActual() || "";

  // default: ahora (datetime-local)
  if (dt) {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    dt.value = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  }

  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
}

function closeModalActCons() {
  const { modal } = ensureModalElements();
  if (!modal) return;
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  modalActConsTargetId = null;
  modalActConsTargetNombre = "";
}

async function guardarActividadDesdeModal() {
  if (!asegurarUsuarioValido()) return;
  const { desc, dt, usuario } = ensureModalElements();

  if (!modalActConsTargetId) {
    alert("No hay consumidor seleccionado para agregar actividad.");
    return;
  }

  const descripcion = (desc?.value || "").trim();
  if (!descripcion) {
    alert("La descripción es obligatoria.");
    return;
  }

  let fechaISO = new Date().toISOString();
  if (dt?.value) {
    const d = new Date(dt.value);
    if (!Number.isNaN(d.getTime())) fechaISO = d.toISOString();
  }

  const payload = {
    consumidor_id: modalActConsTargetId,
    descripcion,
    fecha: fechaISO,
    usuario: (usuario?.value || "").trim() || (getUsuarioActual() || null),
  };

  const { error } = await supabaseClient.from("actividades_consumidores").insert([payload]);
  if (error) {
    console.error(error);
    alert("No se pudo guardar la actividad.\n\n" + error.message);
    return;
  }

  // Mantener ultima_actividad sincronizada (si existe la columna)
  try {
    await supabaseClient
      .from("consumidores")
      .update({ ultima_actividad: fechaISO })
      .eq("id", modalActConsTargetId);
  } catch (_) {}

  closeModalActCons();
  await cargarConsumidores();
}

function initModalActConsUI() {
  const { modal, btnSave } = ensureModalElements();

  if (btnSave) btnSave.addEventListener("click", guardarActividadDesdeModal);

  if (modal) {
    modal.addEventListener("click", (e) => {
      const t = e.target;
      if (t?.dataset?.close === "true") closeModalActCons();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal.classList.contains("is-open")) closeModalActCons();
    });
  }
}

/* ============================
   ACTIVIDADES (helper)
   ============================ */

async function agregarActividad(consumidorId, descripcion) {
  if (!consumidorId) return;

  const nombreAuth = (window.CRM_USER && window.CRM_USER.nombre)
    ? String(window.CRM_USER.nombre).trim()
    : "";

  const { error } = await supabaseClient.from("actividades").insert([{
    consumidor_id: consumidorId,
    descripcion,
    usuario: nombreAuth || null, // el trigger completa si viene null
    user_id: (window.CRM_USER && window.CRM_USER.userId) ? window.CRM_USER.userId : null
  }]);

  if (error) {
    console.error("Error agregando actividad:", error);
    alert("No se pudo registrar la actividad.");
  }
}

/* ============================
   CRUD
   ============================ */

let consumidoresCache = [];

function resetFormulario() {
  setValueIfExists("consumidorId", "");

  [
    "nombre",
    "telefono",
    "mail",
    "localidad",
    "barrio",
    "edad",
    "genero",
    "estado",
    "responsable",
    "fecha_proximo_contacto",
    "hora_proximo_contacto",
    "notas",
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (id === "estado") el.value = "Lead";
    else el.value = "";
  });
}

async function guardarConsumidor(e) {
  e.preventDefault();
  if (!asegurarUsuarioValido()) return;

  const id = getVal("consumidorId");
  const nombre = getTrim("nombre");
  if (!nombre) return alert("El nombre es obligatorio.");

  const edadStr = getTrim("edad");
  const edadNum = edadStr ? Number(edadStr) : null;

  const payload = {
    nombre,
    telefono: getTrim("telefono") || null,
    mail: getTrim("mail") || null,
    localidad: getTrim("localidad") || null,
    barrio: getTrim("barrio") || null,
    edad: Number.isFinite(edadNum) ? edadNum : null,
    genero: getVal("genero") || null,
    estado: getVal("estado") || "Lead",
    responsable: getVal("responsable") || null,
    fecha_proximo_contacto: getVal("fecha_proximo_contacto") || null,
    hora_proximo_contacto: getVal("hora_proximo_contacto") || null,
    notas: (getVal("notas") || "").trim() || null,
  };

  let err = null;
  let savedId = id;

  if (id) {
    const { error } = await supabaseClient.from("consumidores").update(payload).eq("id", id);
    err = error;
    if (!err) await agregarActividad(id, "Consumidor actualizado");
  } else {
    const { data, error } = await supabaseClient.from("consumidores").insert([payload]).select("id").single();
    err = error;
    if (!err && data?.id) {
      savedId = data.id;
      await agregarActividad(savedId, "Consumidor creado");
    }
  }

  if (err) {
    console.error(err);
    alert("No se pudo guardar.\n\n" + err.message);
    return;
  }

  resetFormulario();
  closeModalById("modalFormConsumidor"); // NUEVO: cerrar modal al guardar
  currentPage = 1;
  await cargarConsumidores();
}

async function eliminarConsumidor(id) {
  if (!asegurarUsuarioValido()) return;
  if (!confirm("¿Seguro que querés marcar como eliminado este consumidor?")) return;

  const { error } = await supabaseClient.from("consumidores").update({ activo: false }).eq("id", id);
  if (error) return alert("No se pudo eliminar.\n\n" + error.message);

  await agregarActividad(id, "Consumidor eliminado");
  await cargarConsumidores();
}

/* ============================
   LISTADO + HISTORIAL
   ============================ */

async function cargarConsumidores() {
  const listaDiv = document.getElementById("lista");
  if (!listaDiv) return;

  listaDiv.innerHTML = "<p>Cargando...</p>";

  const ps = document.getElementById("pageSize");
  if (ps) {
    const v = Number(ps.value);
    if (!Number.isNaN(v) && (v === 25 || v === 50)) pageSize = v;
  }

  const filtroNombre = getTrim("filtroNombre");
  const filtroTelefono = getTrim("filtroTelefono");
  const filtroLocalidad = getTrim("filtroLocalidad");
  const filtroEstado = getVal("filtroEstado");
  const filtroResponsable = getVal("filtroResponsable");

  let query = supabaseClient
    .from("consumidores")
    .select(
      "id, nombre, telefono, mail, localidad, barrio, edad, genero, estado, responsable, fecha_proximo_contacto, hora_proximo_contacto, notas, ultima_actividad",
      { count: "exact" }
    )
    .eq("activo", true);

  if (filtroEstado && filtroEstado !== "Todos") query = query.eq("estado", filtroEstado);
  if (filtroNombre) query = query.ilike("nombre", `%${filtroNombre}%`);
  if (filtroTelefono) query = query.ilike("telefono", `%${filtroTelefono}%`);
  if (filtroLocalidad) query = query.ilike("localidad", `%${filtroLocalidad}%`);
  if (filtroResponsable) query = query.eq("responsable", filtroResponsable);

  query = query
    .order("ultima_actividad", { ascending: false, nullsFirst: false })
    .order("id", { ascending: true });

  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize - 1;

  const { data: page, error, count } = await query.range(start, end);

  if (error) {
    console.error(error);
    listaDiv.innerHTML = "<p>Error al cargar consumidores.</p>";
    return;
  }

  const consumidores = page || [];
  totalConsumidores = count ?? consumidores.length ?? 0;
  totalPages = totalConsumidores > 0 ? Math.ceil(totalConsumidores / pageSize) : 1;

  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  consumidoresCache = consumidores;

  updatePaginationUI();
  setText("contador", `(${totalConsumidores})`);

  if (!consumidores.length) {
    listaDiv.innerHTML = "<p>No hay consumidores cargados.</p>";
    return;
  }

  // Cargar actividades de los consumidores de esta página
  const ids = consumidores.map((c) => c.id);
  let actsById = {};

  if (ids.length) {
    const { data: acts, error: e2 } = await supabaseClient
      .from("actividades_consumidores")
      .select("id, consumidor_id, fecha, descripcion, usuario")
      .in("consumidor_id", ids)
      .order("fecha", { ascending: false });

    if (e2) console.error(e2);

    (acts || []).forEach((a) => {
      if (!actsById[a.consumidor_id]) actsById[a.consumidor_id] = [];
      actsById[a.consumidor_id].push(a);
    });
  }

  // Render cards
  listaDiv.innerHTML = "";
  consumidores.forEach((c) => {
    const card = document.createElement("div");
    card.className = "card";

    const acts = actsById[c.id] || [];
    const prox = c.fecha_proximo_contacto ? `📅 ${c.fecha_proximo_contacto}` : "Sin próximo contacto";
    const hora = c.hora_proximo_contacto ? ` ${String(c.hora_proximo_contacto).slice(0, 5)}` : "";

    const contacto = [
      c.telefono ? `📞 ${c.telefono}` : "",
      c.mail ? `✉ ${c.mail}` : "",
      c.localidad ? `📍 ${c.localidad}` : "",
    ]
      .filter(Boolean)
      .join(" · ");

    card.innerHTML = `
      <div class="card-top">
        <div>
          <div class="card-main-title">${c.nombre || "(Sin nombre)"}</div>

          <div class="card-meta">
            ${contacto || ""}
            <div class="muted" style="margin-top:6px">${prox}${hora}</div>
          </div>

          <div class="card-tags" style="margin-top:8px">
            <span class="tag">Estado: ${c.estado || "Lead"}</span>
            ${c.responsable ? `<span class="tag tag-responsable">Resp: ${c.responsable}</span>` : ""}
          </div>

          ${c.notas ? `<div class="card-notas"><strong>Notas:</strong> ${c.notas}</div>` : ""}
        </div>

        <div class="card-buttons">
          <button class="btn-edit" data-action="editar" data-id="${c.id}">Editar</button>
          <button class="btn-delete" data-action="eliminar" data-id="${c.id}">Eliminar</button>
          <button class="btn-add-historial" data-action="addAct" data-id="${c.id}">+ Actividad</button>
        </div>
      </div>

      <div class="historial">
        <div class="historial-header">
          <strong>Historial (${acts.length})</strong>

          <div class="historial-actions">
            <button class="btn-toggle-historial" data-action="toggle" data-id="${c.id}">Ver historial</button>
          </div>
        </div>

        <div class="historial-list" style="display:none">
          <div class="historial-container">
            ${
              acts.length
                ? acts
                    .map(
                      (a) => `
                <div class="historial-item">
                  <div class="historial-desc">${a.descripcion}</div>
                  <div class="historial-fecha">${formatFechaISO(a.fecha)}${
                        a.usuario ? " · <strong>" + a.usuario + "</strong>" : ""
                      }</div>
                </div>
              `
                    )
                    .join("")
                : `<div class="historial-empty">No hay actividades registradas.</div>`
            }
          </div>
        </div>
      </div>
    `;

    listaDiv.appendChild(card);
  });
}

/* =========================================================
   EXCEL (CONSUMIDORES)
   ========================================================= */

function consSetStatus(msg) {
  const el = document.getElementById("consImportStatus");
  if (el) el.textContent = msg;
}

function excelDateToISO(v) {
  if (!v) return null;

  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    const d = new Date(v);
    d.setHours(0, 0, 0, 0);
    return d.toISOString().slice(0, 10);
  }

  if (typeof v === "number") {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    const d = new Date(epoch.getTime() + v * 24 * 60 * 60 * 1000);
    d.setHours(0, 0, 0, 0);
    return d.toISOString().slice(0, 10);
  }

  const s = safeTrim(v);
  if (!s) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) {
    const dd = String(m[1]).padStart(2, "0");
    const mm = String(m[2]).padStart(2, "0");
    const yyyy = m[3];
    return `${yyyy}-${mm}-${dd}`;
  }

  return null;
}

function normalizeTimeHHMM(v) {
  if (!v) return null;

  if (typeof v === "number") {
    const totalMinutes = Math.round(v * 24 * 60);
    const hh = String(Math.floor(totalMinutes / 60) % 24).padStart(2, "0");
    const mm = String(totalMinutes % 60).padStart(2, "0");
    return `${hh}:${mm}`;
  }

  const s = safeTrim(v);
  if (!s) return null;

  const m = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (m) {
    const hh = String(m[1]).padStart(2, "0");
    const mm = String(m[2]).padStart(2, "0");
    return `${hh}:${mm}`;
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

function mapRowToConsumidor(row) {
  const nombre = safeTrim(getRowField(row, "nombre", "name"));
  const telefono = safeTrim(getRowField(row, "telefono", "tel", "phone", "celular"));
  const mail = safeTrim(getRowField(row, "mail", "email", "correo"));
  const localidad = safeTrim(getRowField(row, "localidad", "ciudad"));
  const barrio = safeTrim(getRowField(row, "barrio"));
  const edadRaw = getRowField(row, "edad");
  const genero = safeTrim(getRowField(row, "genero", "género"));
  const estado = safeTrim(getRowField(row, "estado")) || "Lead";
  const responsable = safeTrim(getRowField(row, "responsable")) || null;

  const fecha = excelDateToISO(getRowField(row, "fecha_proximo_contacto", "proximo_contacto", "fecha"));
  const hora = normalizeTimeHHMM(getRowField(row, "hora_proximo_contacto", "hora"));
  const notas = safeTrim(getRowField(row, "notas", "nota", "observaciones"));

  const activoRaw = getRowField(row, "activo", "active");
  let activo = true;
  if (activoRaw !== "" && activoRaw !== null && activoRaw !== undefined) {
    const s = safeTrim(activoRaw).toLowerCase();
    if (["0", "false", "no", "n"].includes(s)) activo = false;
    if (["1", "true", "si", "sí", "y", "yes"].includes(s)) activo = true;
  }

  const edad = safeTrim(edadRaw) ? Number(edadRaw) : null;

  return {
    nombre,
    telefono: telefono || null,
    mail: mail || null,
    localidad: localidad || null,
    barrio: barrio || null,
    edad: Number.isFinite(edad) ? edad : null,
    genero: genero || null,
    estado,
    responsable,
    fecha_proximo_contacto: fecha || null,
    hora_proximo_contacto: hora || null,
    notas: notas || null,
    activo,
  };
}

function descargarModeloConsumidoresExcel() {
  const headers = [
    "nombre",
    "telefono",
    "mail",
    "localidad",
    "barrio",
    "edad",
    "genero",
    "estado",
    "responsable",
    "fecha_proximo_contacto",
    "hora_proximo_contacto",
    "notas",
    "activo",
  ];

  const example = [
    {
      nombre: "Ej: María Gómez",
      telefono: "+54 11 5555-5555",
      mail: "maria@gmail.com",
      localidad: "Morón",
      barrio: "Haedo",
      edad: 28,
      genero: "F",
      estado: "Lead",
      responsable: "Toto",
      fecha_proximo_contacto: "2025-12-22",
      hora_proximo_contacto: "16:30",
      notas: "Le interesó promo de fin de año.",
      activo: "true",
    },
  ];

  const ws = XLSX.utils.json_to_sheet(example, { header: headers });
  XLSX.utils.sheet_add_aoa(ws, [headers], { origin: "A1" });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "modelo_consumidores");

  XLSX.writeFile(wb, "modelo_consumidores.xlsx");
}

async function exportarConsumidoresExcel() {
  consSetStatus("Exportando consumidores...");

  const res = await selectWithOptionalActivo(
    "consumidores",
    "id, nombre, telefono, mail, localidad, barrio, edad, genero, estado, responsable, fecha_proximo_contacto, hora_proximo_contacto, notas, activo, created_at, ultima_actividad"
  );

  if (res.error) {
    console.error(res.error);
    consSetStatus("Error exportando.");
    alert("No se pudo exportar: " + res.error.message);
    return;
  }

  const data = res.data || [];
  const rows = data.map((c) => ({
    nombre: c.nombre ?? "",
    telefono: c.telefono ?? "",
    mail: c.mail ?? "",
    localidad: c.localidad ?? "",
    barrio: c.barrio ?? "",
    edad: c.edad ?? "",
    genero: c.genero ?? "",
    estado: c.estado ?? "",
    responsable: c.responsable ?? "",
    fecha_proximo_contacto: c.fecha_proximo_contacto ?? "",
    hora_proximo_contacto: c.hora_proximo_contacto ? String(c.hora_proximo_contacto).slice(0, 5) : "",
    notas: c.notas ?? "",
    activo: c.activo === false ? "false" : "true",
    created_at: c.created_at ?? "",
    ultima_actividad: c.ultima_actividad ?? "",
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "consumidores");

  XLSX.writeFile(wb, "consumidores_export.xlsx");
  consSetStatus(`Exportado: ${rows.length} consumidores.`);
}

async function importarConsumidoresDesdeExcel(file) {
  if (!asegurarUsuarioValido()) return;

  consSetStatus("Leyendo Excel...");
  const rows = await parseExcelFileToJson(file);

  if (!rows.length) {
    consSetStatus("El archivo está vacío.");
    return;
  }

  const consumidores = rows.map(mapRowToConsumidor).filter((c) => c.nombre);

  if (!consumidores.length) {
    consSetStatus("No hay filas válidas (falta nombre).");
    alert("El Excel debe tener una columna 'nombre' con valores.");
    return;
  }

  const seen = new Set();
  const unique = [];
  for (const c of consumidores) {
    const key =
      (c.mail ? `mail:${c.mail.toLowerCase()}` : "") ||
      (c.telefono ? `tel:${c.telefono}` : "") ||
      `nl:${c.nombre.toLowerCase()}|${(c.localidad || "").toLowerCase()}`;

    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(c);
  }

  consSetStatus(`Importando ${unique.length} consumidores...`);

  let creados = 0;
  let actualizados = 0;
  let actividadesCreadas = 0;

  for (const c of unique) {
    let existing = null;

    if (c.mail) {
      const r = await supabaseClient.from("consumidores").select("id").eq("mail", c.mail).maybeSingle();
      if (!r.error && r.data?.id) existing = r.data;
    }

    if (!existing && c.telefono) {
      const r = await supabaseClient.from("consumidores").select("id").eq("telefono", c.telefono).maybeSingle();
      if (!r.error && r.data?.id) existing = r.data;
    }

    if (existing?.id) {
      const { error } = await supabaseClient.from("consumidores").update(c).eq("id", existing.id);
      if (error) {
        console.error("Update consumidor error:", error);
        continue;
      }
      actualizados++;

      const { error: eAct } = await supabaseClient.from("actividades_consumidores").insert([
        { consumidor_id: existing.id, descripcion: "Actualizado por importación Excel", usuario: getUsuarioActual() || null },
      ]);
      if (!eAct) actividadesCreadas++;
    } else {
      const { data, error } = await supabaseClient.from("consumidores").insert([c]).select("id").single();
      if (error) {
        console.error("Insert consumidor error:", error);
        continue;
      }
      creados++;

      const { error: eAct } = await supabaseClient.from("actividades_consumidores").insert([
        { consumidor_id: data.id, descripcion: "Creado por importación Excel", usuario: getUsuarioActual() || null },
      ]);
      if (!eAct) actividadesCreadas++;
    }
  }

  consSetStatus(`Import OK. Creados: ${creados} · Actualizados: ${actualizados} · Actividades: ${actividadesCreadas}`);
  currentPage = 1;
  await cargarConsumidores();
}

function initExcelConsumidoresUI() {
  const btnModelo = document.getElementById("btnConsDescargarModelo");
  const btnExport = document.getElementById("btnConsExportarExcel");
  const input = document.getElementById("inputConsExcel");

  if (typeof XLSX === "undefined") {
    console.error("XLSX no está cargado.");
    if (btnModelo) btnModelo.disabled = true;
    if (btnExport) btnExport.disabled = true;
    if (input) input.disabled = true;
    consSetStatus("Error: falta cargar XLSX (SheetJS).");
    return;
  }

  if (!btnModelo || !btnExport || !input) {
    console.error("Faltan elementos Excel en el HTML (IDs).");
    consSetStatus("Error: faltan botones/inputs de Excel en el HTML.");
    return;
  }

  btnModelo.addEventListener("click", () => {
    try {
      descargarModeloConsumidoresExcel();
    } catch (e) {
      console.error(e);
      alert("No se pudo generar el modelo. Revisá consola.");
    }
  });

  btnExport.addEventListener("click", async () => {
    try {
      await exportarConsumidoresExcel();
    } catch (e) {
      console.error(e);
      alert("No se pudo exportar. Revisá consola.");
    }
  });

  input.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await importarConsumidoresDesdeExcel(file);
    } catch (err) {
      console.error(err);
      alert("No se pudo leer/importar el Excel. Verificá el formato.");
      consSetStatus("Error leyendo/importando Excel.");
    } finally {
      e.target.value = "";
    }
  });
}

/* ============================
   INIT
   ============================ */

document.addEventListener("DOMContentLoaded", async () => {
  const profile = await requireAuthOrRedirect();
  if (!profile) return;

  // Mostrar usuario si existe placeholder
  const userEl = document.getElementById("currentUserName");
  if (userEl) userEl.textContent = getAuthUserName() || "-";

const savedTheme = localStorage.getItem(THEME_KEY) || "light";
  applyTheme(savedTheme);

  document.getElementById("btnToggleTheme")?.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme") || "light";
    applyTheme(current === "light" ? "dark" : "light");
  });

  initModalFormUI();     // NUEVO: modal form alta/edición
  initModalActConsUI();
  initExcelConsumidoresUI();

  loadFilters();

  const filtros = ["filtroNombre", "filtroTelefono", "filtroLocalidad", "filtroEstado", "filtroResponsable"];
  const onFilt = debounce(() => {
    saveFilters();
    currentPage = 1;
    cargarConsumidores();
  }, 250);

  filtros.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener(el.tagName === "SELECT" ? "change" : "input", onFilt);
  });

  document.getElementById("btnAplicarFiltros")?.addEventListener("click", () => {
    saveFilters();
    currentPage = 1;
    cargarConsumidores();
  });

  document.getElementById("pageSize")?.addEventListener("change", () => {
    currentPage = 1;
    cargarConsumidores();
  });

  document.getElementById("btnPrevPagina")?.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      cargarConsumidores();
    }
  });

  document.getElementById("btnNextPagina")?.addEventListener("click", () => {
    if (currentPage < totalPages) {
      currentPage++;
      cargarConsumidores();
    }
  });

  document.getElementById("formConsumidor")?.addEventListener("submit", guardarConsumidor);
  document.getElementById("btnReset")?.addEventListener("click", resetFormulario);

  // Delegación clicks (historial/editar/eliminar/agregar actividad)
  document.getElementById("lista")?.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;

    const action = btn.dataset.action;
    const id = btn.dataset.id;

    if (action === "toggle") {
      const card = btn.closest(".card");
      const box = card?.querySelector(".historial-list");
      if (!box) return;
      const open = box.style.display !== "none";
      box.style.display = open ? "none" : "block";
      btn.textContent = open ? "Ver historial" : "Ocultar";
      return;
    }

    if (action === "addAct") {
      const c = consumidoresCache.find((x) => String(x.id) === String(id));
      openModalActCons(id, c?.nombre || "");
      return;
    }

    // NUEVO: editar abre el MODAL del formulario
    if (action === "editar") return openFormEditarById(id);

    if (action === "eliminar") return eliminarConsumidor(id);
  });

  if (!asegurarUsuarioValido()) return;
  await cargarConsumidores();
});
