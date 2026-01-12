// =========================================================
// 1) Conexión a Supabase (solo ANON KEY)
// =========================================================
// =========================================================
// 1) Conexión a Supabase (usando global window.supabaseClient de common.js)
// =========================================================
const supabaseClient = window.supabaseClient;

// Cache local de clientes (solo de la página actual)
let clientesCache = [];

// Usuario actual y tema
let usuarioActual =
  (window.CRM_USER && window.CRM_USER.nombre ? String(window.CRM_USER.nombre).trim() : "") ||
  (localStorage.getItem("usuarioActual") || "");
const THEME_KEY = "crm_theme";
const FILTERS_KEY = "crm_filters";

// =========================================================
// AUTH CONTEXT (Login real)
// Requiere: auth.js + guard.js cargados en el HTML.
// =========================================================
function getAuthProfileName() {
  return (window.CRM_USER && window.CRM_USER.nombre) ? String(window.CRM_USER.nombre).trim() : "";
}
function isAuthReady() {
  return !!(window.CRM_USER && window.CRM_USER.activo === true);
}


// Cache de rubros para el filtro
let rubrosCache = [];
let rubrosCacheLoaded = false;


const ESTADOS_VALIDOS_MAP = window.ESTADOS_VALIDOS_MAP || {
  "1 - Cliente relevado": "1 - Cliente relevado",
  "2 - Local Visitado No Activo": "2 - Local Visitado No Activo",
  "3 - Primer ingreso": "3 - Primer Ingreso",
  // "3 - Primer Ingreso" duplicated key removed
  "4 - Local Creado": "4 - Local Creado",
  "5 - Local Visitado Activo": "5 - Local Visitado Activo",
  "6 - Local No Interesado": "6 - Local No Interesado",
};

// Modal actividad
let clienteActividadID = null;

// Agenda de próximos contactos (filtro por fecha)
let agendaMode = "todos"; // 'todos' | 'vencidos' | 'fecha' | 'sin_fecha'
let agendaDate = null; // 'YYYY-MM-DD' cuando mode === 'fecha'

// Stats de agenda (para tooltips y contadores)
let agendaStats = { vencidos: 0, fechas: {}, sinFecha: 0 };

// Paginación (real en Supabase)
let currentPage = 1;
let pageSize = 25;
let totalPages = 1;
let totalClientes = 0;

// =========================================================
// 2) Utilidades
// =========================================================
function formatearFecha(fechaISO) {
  if (!fechaISO) return "";
  const d = new Date(fechaISO);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Evitar desfase de 1 día por zona horaria
function formatearFechaSoloDia(fechaISO) {
  if (!fechaISO) return "";

  // Si viene como "YYYY-MM-DD" (date puro de Postgres), no usamos new Date
  if (/^\d{4}-\d{2}-\d{2}$/.test(fechaISO)) {
    const [y, m, d] = fechaISO.split("-");
    return `${d}/${m}/${y}`;
  }

  const d = new Date(fechaISO);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("es-AR");
}

function resetFormulario() {
  const form = document.getElementById("formCliente");
  if (form) form.reset();

  const id = document.getElementById("clienteId");
  if (id) id.value = "";

  const titulo = document.getElementById("tituloForm");
  if (titulo) titulo.textContent = "Nuevo cliente";

  const btnGuardar = document.getElementById("btnGuardar");
  if (btnGuardar) btnGuardar.textContent = "Guardar";

  const inputFecha = document.getElementById("fecha_proximo_contacto");
  const horaInput = document.getElementById("hora_proximo_contacto");
  const chkSinProx = document.getElementById("sin_proximo_contacto");

  if (inputFecha) {
    inputFecha.value = "";
    inputFecha.disabled = false;
  }
  if (horaInput) {
    horaInput.value = "";
    horaInput.disabled = false;
  }
  if (chkSinProx) {
    if (chkSinProx) {
      chkSinProx.checked = false;
    }

    // Reset nuevos campos
    if (document.getElementById("nombre_local")) document.getElementById("nombre_local").value = "";
    if (document.getElementById("cuit")) document.getElementById("cuit").value = "";
    if (document.getElementById("horarios_atencion")) document.getElementById("horarios_atencion").value = "";
    if (document.getElementById("rubro")) document.getElementById("rubro").value = "";
    if (document.getElementById("estado")) document.getElementById("estado").value = "1 - Cliente relevado";
    if (document.getElementById("responsable")) document.getElementById("responsable").value = "";
    if (document.getElementById("interes")) document.getElementById("interes").value = "Bajo";
    const slider = document.getElementById("sliderInteres");
    if (slider) {
      slider.value = 1;
      const l = document.getElementById("labelInteres");
      if (l) l.textContent = "Bajo";
    }

    if (document.getElementById("fecha_proximo_contacto")) document.getElementById("fecha_proximo_contacto").value = "";
    if (document.getElementById("venta_digital")) {
      document.getElementById("venta_digital").value = "false";
      toggleVentaDigital(false);
    }
    if (document.getElementById("venta_digital_cual")) document.getElementById("venta_digital_cual").value = "";

    // Reset Horarios Helpers
    ["chk_lun", "chk_mar", "chk_mie", "chk_jue", "chk_vie", "chk_sab", "chk_dom"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.checked = false;
    });
    if (document.getElementById("time_apertura")) document.getElementById("time_apertura").value = "";
    if (document.getElementById("time_cierre")) document.getElementById("time_cierre").value = "";
  }
}


// Tema
// Tema manejado por common.js (window.applyTheme, window.toggleTheme)

// Usuario válido
function isUsuarioValido() {
  const nombre = getAuthProfileName();
  return isAuthReady() && !!nombre;
}

function asegurarUsuarioValido() {
  if (!isUsuarioValido()) {
    showToast("Tu sesión no es válida. Volvé a iniciar sesión.", "error");
    setTimeout(() => window.location.href = "login.html", 1500);
    return false;
  }
  return true;
}

// Convierte cualquier formato de fecha Excel → YYYY-MM-DD
function excelDateToYMD(value) {
  if (!value && value !== 0) return null;

  // Caso 1: número de fecha de Excel (por ejemplo 45231)
  if (typeof value === "number") {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30)); // 1899-12-30
    const date = new Date(excelEpoch.getTime() + value * 86400000);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString().split("T")[0];
  }

  // Caso 2: objeto Date real
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().split("T")[0];
  }

  // Caso 3: string
  if (typeof value === "string") {
    const clean = value.trim();
    if (!clean) return null;

    // Ya está en formato YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;

    // dd/mm/yyyy
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(clean)) {
      const [d, m, y] = clean.split("/");
      return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }

    // Intentar parseo estándar
    const d2 = new Date(clean);
    if (!Number.isNaN(d2.getTime())) {
      return d2.toISOString().split("T")[0];
    }
  }

  return null;
}

// Debounce genérico
const debounce = window.utils.debounce;

function saveFilters() {
  const filtroNombre = document.getElementById("filtroNombre");
  const filtroTelefono = document.getElementById("filtroTelefono");
  const filtroDireccion = document.getElementById("filtroDireccion");
  const filtroRubro = document.getElementById("filtroRubro");
  const filtroEstado = document.getElementById("filtroEstado");
  const filtroResponsable = document.getElementById("filtroResponsable");

  const data = {
    nombre: filtroNombre ? filtroNombre.value : "",
    telefono: filtroTelefono ? filtroTelefono.value : "",
    direccion: filtroDireccion ? filtroDireccion.value : "",
    rubro: filtroRubro ? filtroRubro.value : "",
    estado: filtroEstado ? filtroEstado.value : "Todos",
    responsable: filtroResponsable ? filtroResponsable.value : "",
  };

  localStorage.setItem(FILTERS_KEY, JSON.stringify(data));
}

function loadFilters() {
  const raw = localStorage.getItem(FILTERS_KEY);
  if (!raw) return;
  try {
    const f = JSON.parse(raw);

    const filtroNombre = document.getElementById("filtroNombre");
    const filtroTelefono = document.getElementById("filtroTelefono");
    const filtroDireccion = document.getElementById("filtroDireccion");
    const filtroRubro = document.getElementById("filtroRubro");
    const filtroEstado = document.getElementById("filtroEstado");
    const filtroResponsable = document.getElementById("filtroResponsable");

    if (filtroNombre && typeof f.nombre === "string") filtroNombre.value = f.nombre;
    if (filtroTelefono && typeof f.telefono === "string") filtroTelefono.value = f.telefono;
    if (filtroDireccion && typeof f.direccion === "string") filtroDireccion.value = f.direccion;
    if (filtroRubro && typeof f.rubro === "string") filtroRubro.value = f.rubro;
    if (filtroEstado && typeof f.estado === "string") filtroEstado.value = f.estado;
    if (filtroResponsable && typeof f.responsable === "string") filtroResponsable.value = f.responsable;
  } catch (e) {
    console.warn("No se pudieron cargar filtros desde localStorage:", e);
  }
}

// =========================================================
// MODAL FORM CLIENTE (ALTA / EDICIÓN)
// =========================================================
function openModalCliente() {
  const modal = document.getElementById("modalFormCliente");
  if (!modal) return;
  modal.style.display = "flex";
}

function closeModalCliente() {
  const modal = document.getElementById("modalFormCliente");
  if (!modal) return;
  modal.style.display = "none";
}

function openNuevoClienteModal() {
  resetFormulario();
  openModalCliente();
}

function openEditarClienteModal(id) {
  editarCliente(id); // rellena form + cambia título/botón
  openModalCliente();
}

// =========================================================
// Agenda / calendario de próximos contactos
// =========================================================
function setAgendaMode(mode, date = null) {
  agendaMode = mode;
  agendaDate = date;
  currentPage = 1;

  const chips = document.querySelectorAll(".agenda-chip");
  chips.forEach((chip) => {
    const chipMode = chip.dataset.mode;
    const chipDate = chip.dataset.date || null;
    const isActive = chipMode === mode && (mode !== "fecha" || chipDate === date);
    chip.classList.toggle("agenda-chip--active", isActive);
  });

  cargarClientes();
}

function renderAgendaCalendario() {
  const cont = document.getElementById("agendaCalendario");
  if (!cont) return;

  cont.innerHTML = "";

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  // Chip "Todos"
  const btnTodos = document.createElement("button");
  btnTodos.textContent = "Todos";
  btnTodos.className = "agenda-chip";
  btnTodos.dataset.mode = "todos";
  btnTodos.dataset.labelBase = btnTodos.textContent;
  btnTodos.addEventListener("click", () => setAgendaMode("todos", null));
  cont.appendChild(btnTodos);

  // Chip "Vencidos"
  const btnVencidos = document.createElement("button");
  btnVencidos.textContent = "Vencidos";
  btnVencidos.className = "agenda-chip";
  btnVencidos.dataset.mode = "vencidos";
  btnVencidos.dataset.labelBase = btnVencidos.textContent;
  btnVencidos.addEventListener("click", () => setAgendaMode("vencidos", null));
  cont.appendChild(btnVencidos);

  // Chip "Sin fecha"
  const btnSinFecha = document.createElement("button");
  btnSinFecha.textContent = "Sin fecha de contacto proximo";
  btnSinFecha.className = "agenda-chip";
  btnSinFecha.dataset.mode = "sin_fecha";
  btnSinFecha.dataset.labelBase = btnSinFecha.textContent;
  btnSinFecha.addEventListener("click", () => setAgendaMode("sin_fecha", null));
  cont.appendChild(btnSinFecha);

  // Chips "Hoy" + próximos 6 días
  for (let i = 0; i < 7; i++) {
    const d = new Date(hoy);
    d.setDate(hoy.getDate() + i);

    const ymd = d.toISOString().split("T")[0];
    const labelDate = d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });

    const btn = document.createElement("button");
    btn.className = "agenda-chip";
    btn.dataset.mode = "fecha";
    btn.dataset.date = ymd;
    btn.innerHTML = (i === 0 ? "Hoy<br>" : "") + labelDate;
    btn.dataset.labelBase = btn.innerHTML;

    btn.addEventListener("click", () => setAgendaMode("fecha", ymd));
    cont.appendChild(btn);
  }

  setAgendaMode("todos", null);
}

// Aplica los stats (cantidades) en chips
function aplicarStatsAgendaAChips() {
  const cont = document.getElementById("agendaCalendario");
  if (!cont) return;

  const chips = cont.querySelectorAll(".agenda-chip");
  const totalFechados = Object.values(agendaStats.fechas || {}).reduce((acc, n) => acc + n, 0);

  chips.forEach((chip) => {
    const mode = chip.dataset.mode;
    const base = chip.dataset.labelBase || chip.innerHTML;

    if (mode === "todos") {
      chip.title = totalFechados
        ? `${totalFechados} clientes con fecha de contacto asignada`
        : "Ningún cliente tiene fecha de contacto asignada";
      chip.innerHTML = base;
    } else if (mode === "vencidos") {
      const n = agendaStats.vencidos || 0;
      chip.title = n ? `${n} clientes con contacto vencido` : "Sin contactos vencidos";
      chip.innerHTML = n ? `${base} <span class="agenda-count">(${n})</span>` : base;
    } else if (mode === "sin_fecha") {
      const n = agendaStats.sinFecha || 0;
      chip.title = n ? `${n} clientes sin próximo contacto asignado` : "Ningún cliente está marcado sin próximo contacto";
      chip.innerHTML = n ? `${base} <span class="agenda-count">(${n})</span>` : base;
    } else if (mode === "fecha") {
      const date = chip.dataset.date;
      const n = (agendaStats.fechas && agendaStats.fechas[date]) || 0;
      chip.title = n ? `${n} clientes con contacto este día` : "Sin clientes con contacto este día";
      chip.innerHTML = n ? `${base} <span class="agenda-count">(${n})</span>` : base;
    }
  });
}

// Carga stats desde la BD y aplica a chips
async function cargarAgendaStats() {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const hoyStr = hoy.toISOString().split("T")[0];

  const { data, error } = await supabaseClient
    .from("clientes")
    .select("fecha_proximo_contacto")
    .eq("activo", true)
    .not("fecha_proximo_contacto", "is", null);

  if (error) {
    console.error("Error cargando stats de agenda:", error);
    agendaStats = { vencidos: 0, fechas: {}, sinFecha: 0 };
    aplicarStatsAgendaAChips();
    return;
  }

  const stats = { vencidos: 0, fechas: {}, sinFecha: 0 };

  (data || []).forEach((c) => {
    const f = c.fecha_proximo_contacto;
    if (!f) return;
    if (f < hoyStr) stats.vencidos++;
    if (!stats.fechas[f]) stats.fechas[f] = 0;
    stats.fechas[f]++;
  });

  const { count: sinFechaCount, error: errSinFecha } = await supabaseClient
    .from("clientes")
    .select("id", { count: "exact", head: true })
    .eq("activo", true)
    .is("fecha_proximo_contacto", null);

  if (errSinFecha) {
    console.error("Error cargando cantidad sin fecha:", errSinFecha);
    stats.sinFecha = 0;
  } else {
    stats.sinFecha = sinFechaCount || 0;
  }

  agendaStats = stats;
  aplicarStatsAgendaAChips();
}

// =========================================================
// Paginación UI
// =========================================================
function updatePaginationUI() {
  const pageInfo = document.getElementById("pageInfo");
  const btnPrev = document.getElementById("btnPrevPagina");
  const btnNext = document.getElementById("btnNextPagina");
  const pageSizeSelect = document.getElementById("pageSize");

  if (pageInfo) {
    const mostrarPagina = totalClientes > 0 ? currentPage : 0;
    pageInfo.textContent = `Página ${mostrarPagina} de ${totalPages}`;
  }
  if (btnPrev) btnPrev.disabled = currentPage <= 1;
  if (btnNext) btnNext.disabled = currentPage >= totalPages || totalClientes === 0;
  if (pageSizeSelect && Number(pageSizeSelect.value) !== pageSize) pageSizeSelect.value = String(pageSize);
}


// =========================================================
// 3) ACTIVIDADES (historial)
// =========================================================
async function agregarActividad(clienteId, descripcion) {
  if (!clienteId) return;

  const nombreAuth = (window.CRM_USER && window.CRM_USER.nombre)
    ? String(window.CRM_USER.nombre).trim()
    : "";

  const { error } = await supabaseClient.from("actividades").insert([{
    cliente_id: clienteId,
    descripcion,
    usuario: nombreAuth || null, // el trigger completa si viene null
    user_id: (window.CRM_USER && window.CRM_USER.userId) ? window.CRM_USER.userId : null
  }]);

  if (error) {
    console.error("Error agregando actividad:", error);
    showToast("No se pudo registrar la actividad.", "error");
  } else {
    showToast("Actividad registrada.", "success");
  }
}

// Quick actions de próximo contacto
async function actualizarProximoContactoRapido(clienteId, tipo) {
  if (!asegurarUsuarioValido()) return;

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  let fecha = null;
  if (tipo === "hoy") fecha = hoy.toISOString().split("T")[0];
  else if (tipo === "maniana") {
    const d = new Date(hoy);
    d.setDate(hoy.getDate() + 1);
    fecha = d.toISOString().split("T")[0];
  } else if (tipo === "sinfecha") fecha = null;

  const payload = { fecha_proximo_contacto: fecha, hora_proximo_contacto: null };

  const { error } = await supabaseClient.from("clientes").update(payload).eq("id", clienteId);

  if (error) {
    console.error("Error actualizando próximo contacto:", error);
    showToast("No se pudo actualizar el próximo contacto.", "error");
    return;
  }

  await agregarActividad(
    clienteId,
    fecha
      ? `Próximo contacto actualizado (${tipo === "hoy" ? "hoy" : "mañana"})`
      : "Cliente marcado sin próximo contacto"
  );

  await cargarClientes();
  await cargarAgendaStats();
}

// =========================================================
// 4) RUBROS (cacheado para el filtro)
// =========================================================
function actualizarSelectRubros(rubros) {
  const selectRubro = document.getElementById("filtroRubro");
  if (!selectRubro) return;

  const prev = selectRubro.value;

  selectRubro.innerHTML = "";
  const optTodos = document.createElement("option");
  optTodos.value = "";
  optTodos.textContent = "Todos los rubros";
  selectRubro.appendChild(optTodos);

  const rubrosOrdenados = Array.from(new Set(rubros))
    .filter((r) => r && r.toString().trim() !== "")
    .sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));

  rubrosOrdenados.forEach((r) => {
    const opt = document.createElement("option");
    opt.value = r;
    opt.textContent = r;
    selectRubro.appendChild(opt);
  });

  if (prev && rubrosOrdenados.includes(prev)) selectRubro.value = prev;
}

async function ensureRubrosCache() {
  if (rubrosCacheLoaded) {
    actualizarSelectRubros(rubrosCache);
    return;
  }

  try {
    const { data, error } = await supabaseClient.from("clientes").select("rubro").eq("activo", true);

    if (error) {
      console.error("Error cargando rubros para filtro:", error);
      rubrosCache = [];
      rubrosCacheLoaded = true;
      return;
    }

    rubrosCache = (data || [])
      .map((c) => c.rubro)
      .filter((r) => r && r.toString().trim() !== "");
    rubrosCacheLoaded = true;
    actualizarSelectRubros(rubrosCache);
  } catch (e) {
    console.error("Error inesperado cargando rubros:", e);
  }
}

// =========================================================
// 5) CARGA DE CLIENTES + HISTORIAL
// =========================================================
// =========================================================
// 5) CARGA DE CLIENTES + HISTORIAL
// =========================================================

async function fetchClientesData(start, end, filters) {
  const {
    nombre, telefono, direccion, rubro,
    estado, responsable, agendaMode, agendaDate, hoyStr
  } = filters;

  let query = supabaseClient
    .from("clientes")
    .select(
      "id, nombre, nombre_local, telefono, mail, direccion, rubro, estado, responsable, interes, fecha_proximo_contacto, hora_proximo_contacto, notas, ultima_actividad, created_at",
      { count: "exact" }
    )
    .eq("activo", true);

  // Agenda Filters
  if (agendaMode === "fecha" && agendaDate) query = query.eq("fecha_proximo_contacto", agendaDate);
  else if (agendaMode === "vencidos") query = query.lt("fecha_proximo_contacto", hoyStr);
  else if (agendaMode === "sin_fecha") query = query.is("fecha_proximo_contacto", null);

  // General Filters
  if (estado && estado !== "Todos") query = query.eq("estado", estado);
  if (nombre) query = query.ilike("nombre", `%${nombre}%`);
  if (telefono) query = query.ilike("telefono", `%${telefono}%`);
  if (direccion) query = query.ilike("direccion", `%${direccion}%`);
  if (rubro) query = query.eq("rubro", rubro);
  if (responsable) query = query.eq("responsable", responsable);

  // Order
  query = query
    .order("created_at", { ascending: false })
    .order("id", { ascending: true });

  const { data, error, count } = await query.range(start, end);
  return { data, error, count };
}

async function fetchActividadesBatch(clientIds) {
  if (!clientIds.length) return {};

  const { data: actividades, error } = await supabaseClient
    .from("actividades")
    .select("id, cliente_id, fecha, descripcion, usuario")
    .in("cliente_id", clientIds)
    .order("fecha", { ascending: false });

  if (error) {
    console.error("Error cargando actividades:", error);
    return {};
  }

  const map = {};
  (actividades || []).forEach((a) => {
    if (!map[a.cliente_id]) map[a.cliente_id] = [];
    map[a.cliente_id].push(a);
  });
  return map;
}

function createClienteCardHTML(cliente, actividades) {
  const claseEstado = `tag-estado-${String(cliente.estado || "").replace(/\s+/g, "")}`;
  const responsable = cliente.responsable || "";
  const direccion = cliente.direccion || "";
  const nombreLocal = cliente.nombre_local || "";

  // Fecha / Hora próximo contacto
  const textoFecha = cliente.fecha_proximo_contacto
    ? `📅 Próximo contacto: ${formatearFechaSoloDia(cliente.fecha_proximo_contacto)}`
    : "";
  const textoHora = cliente.hora_proximo_contacto
    ? ` a las ${String(cliente.hora_proximo_contacto).slice(0, 5)}`
    : "";

  // Teléfono
  let phoneHTML = "";
  if (cliente.telefono) {
    const telDigits = String(cliente.telefono).replace(/\D/g, "");
    const waNumber = telDigits.startsWith("54") ? telDigits : "54" + telDigits;
    phoneHTML = `
      <span class="card-phone">
        <a href="tel:${telDigits}" class="phone-link">📞 ${cliente.telefono}</a>
        <a href="https://wa.me/${waNumber}" class="wa-link" target="_blank" rel="noopener noreferrer" title="Abrir WhatsApp">💬</a>
      </span>`;
  }

  const direccionHTML = direccion ? `<div class="card-meta-line">📍 ${direccion}</div>` : "";

  // Historial HTML
  const historialItems = actividades.length
    ? actividades.map(a => `
        <div class="historial-item">
          <div class="historial-desc">${a.descripcion}</div>
          <div class="historial-fecha">
            ${formatearFecha(a.fecha)}
            ${a.usuario ? ` · <strong>${a.usuario}</strong>` : ""}
          </div>
        </div>`).join("")
    : `<div class="historial-empty">No hay actividades registradas.</div>`;

  return `
    <div class="card" data-id="${cliente.id}">
      <div class="card-top">
        <div>
          <div class="card-main-title">${cliente.nombre || "(Sin nombre)"}</div>
          <div class="card-meta">
            ${phoneHTML}
            ${textoFecha || textoHora ? " · " : ""}
            ${textoFecha}${textoHora}
          </div>

          ${direccionHTML}
          ${nombreLocal ? `<div class="card-meta-line">🏠 ${nombreLocal}</div>` : ""}

          <div class="card-tags">
            <span class="tag ${claseEstado}">Estado: ${cliente.estado}</span>
            ${cliente.rubro ? `<span class="tag">Rubro: ${cliente.rubro}</span>` : ""}
            ${responsable ? `<span class="tag tag-responsable">Resp: ${responsable}</span>` : ""}
          </div>

          ${cliente.notas ? `<div class="card-notas"><strong>Notas:</strong> ${cliente.notas}</div>` : ""}

          <div class="card-quick-actions">
            <span class="quick-label">Próximo contacto rápido:</span>
            <button class="btn-quick" data-action="prox-hoy" data-id="${cliente.id}">Hoy</button>
            <button class="btn-quick" data-action="prox-maniana" data-id="${cliente.id}">Mañana</button>
            <button class="btn-quick" data-action="prox-sinfecha" data-id="${cliente.id}">Sin fecha</button>
          </div>
        </div>

        <div class="card-buttons">
          <button class="btn-actividad" data-action="actividad" data-id="${cliente.id}">+ Actividad</button>
          <button class="btn-edit" data-action="editar" data-id="${cliente.id}">Editar</button>
          <button class="btn-delete" data-action="eliminar" data-id="${cliente.id}">Eliminar</button>
        </div>
      </div>

      <div class="historial">
        <div class="historial-header">
          <strong>Historial (${actividades.length})</strong>
          <button class="btn-toggle-historial" data-action="toggle-historial" data-id="${cliente.id}">
            Ver historial
          </button>
        </div>

        <div class="historial-list" style="display:none">
          <div class="historial-container">
            ${historialItems}
          </div>
        </div>
      </div>
    </div>`;
}

async function cargarClientes() {
  const listaDiv = document.getElementById("lista");
  if (!listaDiv) return;

  listaDiv.innerHTML = "<p>Cargando...</p>";

  // Helper inputs
  const getVal = (id) => { const el = document.getElementById(id); return el ? el.value : ""; };
  const getTrim = (id) => (getVal(id) || "").toString().trim();

  // PageSize
  const pageSizeSelect = document.getElementById("pageSize");
  if (pageSizeSelect) {
    const val = Number(pageSizeSelect.value);
    if (!Number.isNaN(val) && (val === 25 || val === 50)) pageSize = val;
  }

  await ensureRubrosCache();

  // Filters object
  const Filters = {
    nombre: getTrim("filtroNombre"),
    telefono: getTrim("filtroTelefono"),
    direccion: getTrim("filtroDireccion"),
    rubro: getVal("filtroRubro"),
    estado: getVal("filtroEstado"),
    responsable: getVal("filtroResponsable"),
    agendaMode,
    agendaDate,
    hoyStr: new Date().toISOString().split("T")[0]
  };

  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize - 1;

  // 1. Fetch Clients
  const { data: clientes, error, count } = await fetchClientesData(start, end, Filters);

  if (error) {
    console.error("Error cargando clientes:", error);
    listaDiv.innerHTML = "<p>Error al cargar clientes.</p>";
    return;
  }

  const loadedClientes = clientes || [];
  totalClientes = count ?? loadedClientes.length ?? 0;

  // 2. Handle Empty State
  if (!loadedClientes.length) {
    clientesCache = [];
    totalPages = 1;
    updatePaginationUI();
    const contador = document.getElementById("contador");
    if (contador) contador.textContent = `(0)`;
    listaDiv.innerHTML = "<p>No hay clientes cargados.</p>";
    return;
  }

  // 3. Update Pagination & UI
  totalPages = totalClientes > 0 ? Math.ceil(totalClientes / pageSize) : 1;
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  clientesCache = loadedClientes;
  updatePaginationUI();

  const contador = document.getElementById("contador");
  if (contador) contador.textContent = `(${totalClientes})`;

  // 4. Fetch Activities
  const clientIds = loadedClientes.map(c => c.id);
  const actividadesMap = await fetchActividadesBatch(clientIds);

  // 5. Render
  listaDiv.innerHTML = loadedClientes
    .map(c => createClienteCardHTML(c, actividadesMap[c.id] || []))
    .join("");
}

// =========================================================
// 6) GUARDAR / EDITAR CLIENTE
// =========================================================
async function guardarCliente(e) {
  e.preventDefault();

  if (!asegurarUsuarioValido()) return;

  const id = document.getElementById("clienteId").value || null;
  const nombre = document.getElementById("nombre").value.trim();
  const nombre_local = document.getElementById("nombre_local").value.trim();
  const cuit = document.getElementById("cuit").value.trim();
  const telefono = document.getElementById("telefono").value.trim();
  const mail = document.getElementById("mail") ? document.getElementById("mail").value.trim() : "";
  const direccion = document.getElementById("direccion").value.trim();
  const horarios_atencion = document.getElementById("horarios_atencion").value.trim();
  const rubro = document.getElementById("rubro").value.trim();
  const venta_digital = document.getElementById("venta_digital").value === "true";
  const venta_digital_cual = document.getElementById("venta_digital_cual").value.trim();

  const estadoRaw = document.getElementById("estado").value;
  const estado = ESTADOS_VALIDOS_MAP[estadoRaw] || estadoRaw || "1 - Cliente relevado";
  const responsableSelect = document.getElementById("responsable");
  const responsable = responsableSelect ? responsableSelect.value : "";
  const interes = document.getElementById("interes").value;
  const fechaProx = document.getElementById("fecha_proximo_contacto").value;
  const horaProxInput = document.getElementById("hora_proximo_contacto");
  const horaProx = horaProxInput ? horaProxInput.value : "";
  const notas = document.getElementById("notas").value.trim();
  const chkSinProx = document.getElementById("sin_proximo_contacto");
  const sinProximo = chkSinProx ? chkSinProx.checked : false;

  if (!nombre) {
    showToast("El campo 'Nombre (Contacto)' es obligatorio.", "warning");
    return;
  }
  if (!nombre_local) {
    showToast("El campo 'Nombre del Local' es obligatorio.", "warning");
    return;
  }
  if (!telefono) {
    showToast("El campo 'Teléfono' es obligatorio.", "warning");
    return;
  }
  if (!direccion) {
    showToast("El campo 'Dirección' es obligatorio.", "warning");
    return;
  }
  if (!rubro) {
    showToast("El campo 'Rubro' es obligatorio.", "warning");
    return;
  }

  const payload = {
    nombre,
    nombre_local: nombre_local || null,
    cuit: cuit || null,
    telefono: telefono || null,
    mail: mail || null,
    direccion: direccion || null,
    horarios_atencion: horarios_atencion || null,
    rubro: rubro || "Sin definir",
    estado,
    responsable: responsable || null,
    interes: interes || null,
    fecha_proximo_contacto: fechaProx || null,
    hora_proximo_contacto: horaProx || null,
    notas: notas || null,
    venta_digital: venta_digital,
    venta_digital_cual: venta_digital ? (venta_digital_cual || null) : null
  };

  if (sinProximo) {
    payload.fecha_proximo_contacto = null;
    payload.hora_proximo_contacto = null;
  }

  let error;
  let newId = id;

  if (id) {
    const { error: errUpdate } = await supabaseClient.from("clientes").update(payload).eq("id", id);
    error = errUpdate;
    if (!error) {
      await agregarActividad(id, sinProximo ? "Cliente actualizado y marcado sin próximo contacto." : "Cliente actualizado");
    }
  } else {
    // NUEVO: Agregamos el creador
    payload.creado_por = usuarioActual;

    const { data, error: errInsert } = await supabaseClient
      .from("clientes")
      .insert([payload])
      .select("id")
      .single();

    error = errInsert;
    if (!error && data && data.id) {
      newId = data.id;
      await agregarActividad(newId, sinProximo ? "Cliente creado y marcado sin próximo contacto." : "Cliente creado");
    }
  }

  if (error) {
    console.error("Error guardando cliente:", error);
    alert("No se pudo guardar el cliente.\n\n" + error.message);
    return;
  }

  resetFormulario();
  closeModalCliente(); // NUEVO: cerrar modal al guardar OK
  await cargarClientes();
  await cargarAgendaStats();
}

// =========================================================
// 7) ELIMINAR CLIENTE (borrado lógico)
// =========================================================
async function eliminarCliente(id) {
  if (!asegurarUsuarioValido()) return;

  if (!confirm("¿Seguro que querés marcar como eliminado este cliente?")) return;

  const { error } = await supabaseClient.from("clientes").update({ activo: false }).eq("id", id);

  if (error) {
    console.error("Error eliminando cliente:", error);
    alert("No se pudo eliminar el cliente.");
    return;
  }

  await agregarActividad(id, "Cliente eliminado");
  await cargarClientes();
  await cargarAgendaStats();
}

// =========================================================
// 8) EDITAR CLIENTE (rellenar formulario)
// =========================================================
function editarCliente(id) {
  const cliente = clientesCache.find((c) => String(c.id) === String(id));
  if (!cliente) return;

  document.getElementById("clienteId").value = cliente.id;
  document.getElementById("nombre").value = cliente.nombre || "";
  document.getElementById("nombre_local").value = cliente.nombre_local || "";
  document.getElementById("cuit").value = cliente.cuit || "";
  document.getElementById("telefono").value = cliente.telefono || "";

  const mailInput = document.getElementById("mail");
  if (mailInput) mailInput.value = cliente.mail || "";

  document.getElementById("direccion").value = cliente.direccion || "";
  document.getElementById("horarios_atencion").value = cliente.horarios_atencion || "";
  document.getElementById("rubro").value = cliente.rubro || "";

  const estadoEditRaw = cliente.estado || "1 - Cliente relevado";
  document.getElementById("estado").value = ESTADOS_VALIDOS_MAP[estadoEditRaw] || estadoEditRaw;

  const responsableSelect = document.getElementById("responsable");
  if (responsableSelect) responsableSelect.value = cliente.responsable || "";

  const valInteres = cliente.interes || "Bajo";
  document.getElementById("interes").value = valInteres;

  const slider = document.getElementById("sliderInteres");
  if (slider) {
    const mapRev = { "Bajo": 1, "Medio": 2, "Alto": 3 };
    slider.value = mapRev[valInteres] || 1;
    const l = document.getElementById("labelInteres");
    if (l) l.textContent = valInteres;
  }

  document.getElementById("fecha_proximo_contacto").value = cliente.fecha_proximo_contacto || "";

  const horaProxInput = document.getElementById("hora_proximo_contacto");
  if (horaProxInput) horaProxInput.value = cliente.hora_proximo_contacto || "";

  const chkSinProx = document.getElementById("sin_proximo_contacto");
  if (chkSinProx) {
    const sinFecha = !cliente.fecha_proximo_contacto && !cliente.hora_proximo_contacto;
    chkSinProx.checked = sinFecha;
    document.getElementById("fecha_proximo_contacto").disabled = sinFecha;
    if (horaProxInput) horaProxInput.disabled = sinFecha;
  }

  document.getElementById("notas").value = cliente.notas || "";

  // Venta digital
  const isDigital = !!cliente.venta_digital;
  document.getElementById("venta_digital").value = isDigital ? "true" : "false";
  toggleVentaDigital(isDigital);
  document.getElementById("venta_digital_cual").value = cliente.venta_digital_cual || "";


  document.getElementById("tituloForm").textContent = "Editar cliente";
  document.getElementById("btnGuardar").textContent = "Actualizar cliente";
}

// =========================================================
// 9) EXCEL: DESCARGAR MODELO / IMPORTAR / EXPORTAR
// =========================================================
function descargarModeloExcel() {
  const wb = XLSX.utils.book_new();

  const headers = [
    "nombre",
    "nombre_local",
    "cuit",
    "telefono",
    "direccion",
    "horarios_atencion",
    "rubro",
    "estado",
    "responsable",
    "fecha_proximo_contacto",
    "hora_proximo_contacto",
    "notas",
    "venta_digital",
    "venta_digital_cual"
  ];

  const data = [
    headers,
    ["Ejemplo SRL", "Local Ejemplo", "30-11223344-5", "11-2345-6789", "Av. Rivadavia 1234", "L-V 9-18", "Almacén", "1 - Cliente relevado", "Toto", "2025-01-15", "09:00", "Ejemplo de nota", "false", ""],
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, "Modelo");

  try {
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modelo_clientes_crm.xlsx";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (e) {
    alert("Error: " + e.message);
  }
}

// Exportar todos los clientes + historial
async function exportarExcel() {
  const { data: clientes, error: errCli } = await supabaseClient
    .from("clientes")
    .select("id, nombre, nombre_local, cuit, telefono, direccion, horarios_atencion, rubro, estado, responsable, fecha_proximo_contacto, hora_proximo_contacto, notas, venta_digital, venta_digital_cual")
    .eq("activo", true);

  if (errCli) {
    console.error("Error exportando clientes:", errCli);
    alert("No se pudieron exportar los clientes.");
    return;
  }

  const ids = (clientes || []).map((c) => c.id);
  const { data: actividades, error: errAct } = await supabaseClient
    .from("actividades")
    .select("cliente_id, fecha, usuario, descripcion")
    .in("cliente_id", ids || []);

  if (errAct) {
    console.error("Error exportando historial:", errAct);
    alert("No se pudo exportar el historial.");
    return;
  }

  const wb = XLSX.utils.book_new();

  const dataClientes = [
    ["id", "nombre", "nombre_local", "cuit", "telefono", "direccion", "horarios_atencion", "rubro", "estado", "responsable", "fecha_proximo_contacto", "hora_proximo_contacto", "notas", "venta_digital", "venta_digital_cual"],
  ];

  (clientes || []).forEach((c) => {
    dataClientes.push([
      c.id,
      c.nombre || "",
      c.telefono || "",
      c.direccion || "",
      c.rubro || "",
      c.estado || "",
      c.responsable || "",
      c.fecha_proximo_contacto || "",
      c.hora_proximo_contacto || "",
      c.notas || "",
    ]);
  });

  const wsClientes = XLSX.utils.aoa_to_sheet(dataClientes);
  XLSX.utils.book_append_sheet(wb, wsClientes, "Clientes");

  const clientePorId = {};
  (clientes || []).forEach((c) => (clientePorId[c.id] = c));

  const dataHist = [["cliente_id", "nombre_cliente", "telefono_cliente", "fecha", "usuario", "descripcion"]];

  (actividades || []).forEach((a) => {
    const cli = clientePorId[a.cliente_id] || {};
    dataHist.push([a.cliente_id, cli.nombre || "", cli.telefono || "", a.fecha || "", a.usuario || "", a.descripcion || ""]);
  });

  const wsHist = XLSX.utils.aoa_to_sheet(dataHist);
  XLSX.utils.book_append_sheet(wb, wsHist, "Historial");

  try {
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "crm_clientes_historial.xlsx";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (e) {
    alert("Error: " + e.message);
  }
}

// Importar clientes (upsert por teléfono)
async function importarDesdeExcel(file) {
  const reader = new FileReader();

  reader.onload = async (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });

      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      if (!json.length) {
        alert("El archivo no tiene datos.");
        return;
      }

      const registros = json.map((row) => {
        const nombre = (row.nombre || "").toString().trim();

        const telefono = row.telefono ? row.telefono.toString().trim() : "";

        let direccion = row.direccion ? row.direccion.toString().trim() : "";
        if (!direccion) direccion = null;

        let rubro = row.rubro ? row.rubro.toString().trim() : "";
        if (!rubro) rubro = "Sin definir";

        let estadoRaw = row.estado ? row.estado.toString().trim() : "";
        if (!estadoRaw) estadoRaw = "1 - Cliente relevado";
        const estado = ESTADOS_VALIDOS_MAP[estadoRaw] || "1 - Cliente relevado";

        const responsable = row.responsable ? row.responsable.toString().trim() : "";

        const fechaProx = excelDateToYMD(row.fecha_proximo_contacto);
        const horaProx = row.hora_proximo_contacto ? row.hora_proximo_contacto.toString().substring(0, 5) : "";

        const notas = row.notas ? row.notas.toString().trim() : "";

        return {
          nombre,
          telefono: telefono || null,
          direccion,
          rubro,
          estado,
          responsable: responsable || null,
          fecha_proximo_contacto: fechaProx || null,
          hora_proximo_contacto: horaProx || null,
          notas: notas || null,
          activo: true,
        };
      });

      const rowsValidas = registros.filter((r) => r.nombre);

      if (!rowsValidas.length) {
        alert("No hay filas válidas para importar (requieren nombre).");
        return;
      }

      const conTelefono = rowsValidas.filter((r) => r.telefono);
      const sinTelefono = rowsValidas.filter((r) => !r.telefono);

      if (conTelefono.length) {
        const { error: errUpsert } = await supabaseClient.from("clientes").upsert(conTelefono, { onConflict: "telefono" });
        if (errUpsert) {
          console.error("Error en upsert de clientes:", errUpsert);
          alert("Ocurrió un error al importar (upsert por teléfono).");
          return;
        }
      }

      if (sinTelefono.length) {
        const { error: errInsert } = await supabaseClient.from("clientes").insert(sinTelefono);
        if (errInsert) {
          console.error("Error insertando clientes sin teléfono:", errInsert);
          alert("Ocurrió un error al importar los clientes sin teléfono (inserts).");
          return;
        }
      }

      alert("Importación completada correctamente.");
      await cargarClientes();
      await cargarAgendaStats();
    } catch (err) {
      console.error("Error procesando el archivo Excel:", err);
      alert("No se pudo procesar el archivo Excel.");
    }
  };

  reader.readAsArrayBuffer(file);
}

// =========================================================
// 10) MODAL DE ACTIVIDAD
// =========================================================
function abrirActividadModal(clienteId) {
  clienteActividadID = clienteId;
  const modal = document.getElementById("actividadModal");
  const textarea = document.getElementById("actividadTexto");
  if (!modal || !textarea) return;
  textarea.value = "";
  modal.style.display = "flex";
  textarea.focus();
}

function cerrarActividadModal() {
  const modal = document.getElementById("actividadModal");
  if (!modal) return;
  modal.style.display = "none";
  clienteActividadID = null;
}

// =========================================================
// 11) INIT DOMContentLoaded
// =========================================================
document.addEventListener("DOMContentLoaded", () => {
  // 1) Tema (Manejado por common.js)


  document.addEventListener("DOMContentLoaded", async () => {
    // Esperar a que guard.js termine (evita rebotes)
    if (window.CRM_GUARD_READY) await window.CRM_GUARD_READY;

    // Si el guard te redirigió, esto ni corre; pero por seguridad:
    if (!(window.CRM_USER && window.CRM_USER.activo)) return;

    // Usuario autenticado
    usuarioActual = (window.CRM_USER.nombre || "").trim();
    localStorage.setItem("usuarioActual", usuarioActual);

    const currentUserNameEl = document.getElementById("currentUserName");
    if (currentUserNameEl) currentUserNameEl.textContent = usuarioActual || "-";

    // A partir de acá, tu init normal:
    // renderAgendaCalendario();
    // cargarAgendaStats();
    // cargarClientes();
    // ...
  });

  // Reflejar usuario autenticado
  usuarioActual = getAuthProfileName() || usuarioActual || "";
  localStorage.setItem("usuarioActual", usuarioActual);
  const currentUserNameEl = document.getElementById("currentUserName");
  if (currentUserNameEl) currentUserNameEl.textContent = usuarioActual || "-";

  // Si existe el <select id="usuarioActual"> (legacy), lo deshabilitamos
  const selHeader = document.getElementById("usuarioActual");
  if (selHeader) {
    selHeader.disabled = true;
    const opt = Array.from(selHeader.options || []).find(o => o.value === usuarioActual);
    if (opt) selHeader.value = usuarioActual;
  }

  // Logout (si existe botón)
  document.getElementById("btnLogout")?.addEventListener("click", async () => {
    try { await supabaseClient.auth.signOut(); } catch (_) { }
    localStorage.removeItem("usuarioActual");
    window.location.href = "login.html";
  });

  // 3) Modal cliente: abrir/cerrar + overlay click + ESC
  const btnNuevo = document.getElementById("btnNuevoCliente");
  if (btnNuevo) btnNuevo.addEventListener("click", openNuevoClienteModal);

  const btnCerrarModal = document.getElementById("btnCerrarModalCliente");
  if (btnCerrarModal) btnCerrarModal.addEventListener("click", () => {
    resetFormulario();
    closeModalCliente();
  });

  const btnCancelar = document.getElementById("btnCancelarEdicion");
  if (btnCancelar) btnCancelar.addEventListener("click", () => {
    resetFormulario();
    closeModalCliente();
  });

  const modalForm = document.getElementById("modalFormCliente");
  if (modalForm) {
    modalForm.addEventListener("click", (e) => {
      if (e.target === modalForm) {
        resetFormulario();
        closeModalCliente();
      }
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const modal = document.getElementById("modalFormCliente");
      if (modal && modal.style.display === "flex") {
        resetFormulario();
        closeModalCliente();
      }
    }
  });

  // 4) Fecha / sin próximo contacto
  const inputFechaProx = document.getElementById("fecha_proximo_contacto");
  const inputHoraProx = document.getElementById("hora_proximo_contacto");
  const btnPickFecha = document.getElementById("btnPickFecha");
  const chkSinProx = document.getElementById("sin_proximo_contacto");

  if (inputFechaProx && btnPickFecha) {
    btnPickFecha.addEventListener("click", () => {
      if (inputFechaProx.disabled) {
        if (chkSinProx) chkSinProx.checked = false;
        inputFechaProx.disabled = false;
        if (inputHoraProx) inputHoraProx.disabled = false;
      }

      if (typeof inputFechaProx.showPicker === "function") inputFechaProx.showPicker();
      else {
        inputFechaProx.focus();
        inputFechaProx.click();
      }
    });
  }

  // 5) Filtros (cargar desde localStorage + guardar con debounce)
  loadFilters();

  const filtrosIds = ["filtroNombre", "filtroTelefono", "filtroDireccion", "filtroRubro", "filtroEstado", "filtroResponsable"];

  // NUEVO: Sync Slider (Interés)
  const slider = document.getElementById("sliderInteres");
  if (slider) {
    const mapVal = { "1": "Bajo", "2": "Medio", "3": "Alto" };
    slider.addEventListener("input", () => {
      const txt = mapVal[slider.value] || "-";
      const label = document.getElementById("labelInteres");
      if (label) label.textContent = txt;
      const el = document.getElementById("interes");
      if (el) el.value = txt;
    });
  }

  const aplicarFiltrosDebounced = debounce(() => {
    saveFilters();
    currentPage = 1;
    cargarClientes();
  }, 300);

  filtrosIds.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;

    const evt = el.tagName === "SELECT" ? "change" : "input";
    el.addEventListener(evt, aplicarFiltrosDebounced);

    el.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        saveFilters();
        currentPage = 1;
        cargarClientes();
      }
    });
  });

  // 6) Paginación
  const pageSizeSelect = document.getElementById("pageSize");
  if (pageSizeSelect) {
    pageSizeSelect.addEventListener("change", () => {
      const val = Number(pageSizeSelect.value);
      if (!Number.isNaN(val) && (val === 25 || val === 50)) pageSize = val;
      currentPage = 1;
      cargarClientes();
    });
  }

  const btnPrevPagina = document.getElementById("btnPrevPagina");
  if (btnPrevPagina) {
    btnPrevPagina.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--;
        cargarClientes();
      }
    });
  }

  const btnNextPagina = document.getElementById("btnNextPagina");
  if (btnNextPagina) {
    btnNextPagina.addEventListener("click", () => {
      if (currentPage < totalPages) {
        currentPage++;
        cargarClientes();
      }
    });
  }

  // 7) Excel
  const btnDescargarModelo = document.getElementById("btnDescargarModelo");
  if (btnDescargarModelo) btnDescargarModelo.addEventListener("click", (e) => {
    e.preventDefault();
    descargarModeloExcel()
  });

  const inputExcel = document.getElementById("inputExcel");
  const btnImportarExcel = document.getElementById("btnImportarExcel");
  if (btnImportarExcel && inputExcel) {
    btnImportarExcel.addEventListener("click", (e) => {
      e.preventDefault();
      inputExcel.click()
    });

    inputExcel.addEventListener("change", () => {
      if (inputExcel.files.length === 1) {
        importarDesdeExcel(inputExcel.files[0]);
        inputExcel.value = "";
      }
    });
  }

  const btnExportarExcel = document.getElementById("btnExportarExcel");
  if (btnExportarExcel) btnExportarExcel.addEventListener("click", (e) => {
    e.preventDefault();
    exportarExcel()
  });

  // 8) Formulario cliente
  const formCliente = document.getElementById("formCliente");
  if (formCliente) formCliente.addEventListener("submit", guardarCliente);

  // 9) Tarjetas (delegación de eventos)
  const lista = document.getElementById("lista");
  if (lista) {
    lista.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;

      const id = btn.dataset.id;
      const action = btn.dataset.action;

      if (action === "editar") {
        openEditarClienteModal(id);
      } else if (action === "eliminar") {
        eliminarCliente(id);
      } else if (action === "actividad") {
        abrirActividadModal(id);
      } else if (action === "toggle-historial") {
        const card = btn.closest(".card");
        if (!card) return;
        const listaHist = card.querySelector(".historial-list");
        if (!listaHist) return;
        const visible = listaHist.style.display !== "none";
        listaHist.style.display = visible ? "none" : "block";
        btn.textContent = visible ? "Ver historial" : "Ocultar historial";
      } else if (action === "prox-hoy") {
        actualizarProximoContactoRapido(id, "hoy");
      } else if (action === "prox-maniana") {
        actualizarProximoContactoRapido(id, "maniana");
      } else if (action === "prox-sinfecha") {
        actualizarProximoContactoRapido(id, "sinfecha");
      }
    });
  }

  // 10) Modal actividad
  const btnGuardarActividad = document.getElementById("btnGuardarActividad");
  const btnCerrarActividad = document.getElementById("btnCerrarActividad");
  const textareaActividad = document.getElementById("actividadTexto");

  if (btnGuardarActividad && textareaActividad) {
    btnGuardarActividad.addEventListener("click", async () => {
      const texto = textareaActividad.value.trim();
      if (!texto) {
        showToast("Escribí la actividad antes de guardar.", "warning");
        return;
      }
      if (!clienteActividadID) {
        showToast("No se encontró el cliente para esta actividad.", "error");
        return;
      }
      await agregarActividad(clienteActividadID, texto);
      cerrarActividadModal();
      await cargarClientes();
      await cargarAgendaStats();
    });
  }

  if (btnCerrarActividad) btnCerrarActividad.addEventListener("click", () => cerrarActividadModal());

  if (btnCerrarActividad) btnCerrarActividad.addEventListener("click", () => cerrarActividadModal());

  // 11) Toggle Venta Digital
  const selectDigital = document.getElementById("venta_digital");
  if (selectDigital) {
    selectDigital.addEventListener("change", (e) => {
      toggleVentaDigital(e.target.value === "true");
    });
  }

  // 12) Agenda + stats + primera carga
  renderAgendaCalendario(); // dispara cargarClientes()
  cargarAgendaStats();

  // 12) Check URL Actions (from Dashboard)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("action") === "new") {
    // Clean URL
    const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
    window.history.replaceState({ path: newUrl }, "", newUrl);

    // Open Modal
    openNuevoClienteModal();
  }
});

function toggleVentaDigital(show) {
  const divCual = document.getElementById("divVentaDigitalCual");
  if (!divCual) return;
  divCual.style.display = show ? "block" : "none";
}

// 12) Auto-fill Horarios Logic
document.addEventListener("DOMContentLoaded", () => {
  const ids = ["chk_lun", "chk_mar", "chk_mie", "chk_jue", "chk_vie", "chk_sab", "chk_dom", "time_apertura", "time_cierre"];

  function actualizarHorarioTexto() {
    const dias = [];
    if (document.getElementById("chk_lun")?.checked) dias.push("Lun");
    if (document.getElementById("chk_mar")?.checked) dias.push("Mar");
    if (document.getElementById("chk_mie")?.checked) dias.push("Mié");
    if (document.getElementById("chk_jue")?.checked) dias.push("Jue");
    if (document.getElementById("chk_vie")?.checked) dias.push("Vie");
    if (document.getElementById("chk_sab")?.checked) dias.push("Sáb");
    if (document.getElementById("chk_dom")?.checked) dias.push("Dom");

    const apertura = document.getElementById("time_apertura")?.value;
    const cierre = document.getElementById("time_cierre")?.value;

    if (dias.length === 0 && !apertura && !cierre) return;

    let txt = "";

    // Simplificación: "Lun a Vie" si están todos
    const esLunVie = dias.length === 5 && dias[0] === "Lun" && dias[1] === "Mar" && dias[2] === "Mié" && dias[3] === "Jue" && dias[4] === "Vie";

    if (esLunVie) {
      txt = "Lun a Vie";
    } else {
      txt = dias.join(", ");
    }

    if (apertura || cierre) {
      if (txt) txt += " ";
      txt += `${apertura || "?"} - ${cierre || "?"} hs`;
    }

    const inputTarget = document.getElementById("horarios_atencion");
    if (inputTarget) inputTarget.value = txt;
  }

  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("change", actualizarHorarioTexto);
  });
});

