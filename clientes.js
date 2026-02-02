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
    if (document.getElementById("estilo_contacto")) document.getElementById("estilo_contacto").value = "Sin definir";
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
    if (document.getElementById("created_at_input")) document.getElementById("created_at_input").value = "";

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
  const filtroInteres = document.getElementById("filtroInteres");
  const filtroVisitas = document.getElementById("filtroVisitas");
  const filtroEstilo = document.getElementById("filtroEstilo");

  const data = {
    nombre: filtroNombre ? filtroNombre.value : "",
    telefono: filtroTelefono ? filtroTelefono.value : "",
    direccion: filtroDireccion ? filtroDireccion.value : "",
    rubro: filtroRubro ? filtroRubro.value : "",
    estado: filtroEstado ? filtroEstado.value : "Todos",
    responsable: filtroResponsable ? filtroResponsable.value : "",
    estilo: filtroEstilo ? filtroEstilo.value : "",
    interes: filtroInteres ? filtroInteres.value : "",
    visitas: filtroVisitas ? filtroVisitas.value : "",
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
    const filtroInteres = document.getElementById("filtroInteres");
    const filtroVisitas = document.getElementById("filtroVisitas");
    const filtroEstilo = document.getElementById("filtroEstilo");

    if (filtroNombre && typeof f.nombre === "string") filtroNombre.value = f.nombre;
    if (filtroTelefono && typeof f.telefono === "string") filtroTelefono.value = f.telefono;
    if (filtroDireccion && typeof f.direccion === "string") filtroDireccion.value = f.direccion;
    if (filtroRubro && typeof f.rubro === "string") filtroRubro.value = f.rubro;
    if (filtroEstado && typeof f.estado === "string") filtroEstado.value = f.estado;
    if (filtroResponsable && typeof f.responsable === "string") filtroResponsable.value = f.responsable;
    if (filtroInteres && typeof f.interes === "string") filtroInteres.value = f.interes;
    if (filtroVisitas && typeof f.visitas === "string") filtroVisitas.value = f.visitas;
    if (filtroEstilo && typeof f.estilo === "string") filtroEstilo.value = f.estilo;
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
async function actualizarProximoContactoRapido(clienteId, tipo, customDate = null) {
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
  else if (tipo === "custom") fecha = customDate;

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
    estado, responsable, agendaMode, agendaDate, hoyStr,
    interes, visitas, estilo
  } = filters;

  // 1. Filtro de Visitas (Pre-filter IDs)
  let allowedIds = null;

  if (visitas) {
    const d = new Date();
    d.setHours(0, 0, 0, 0); // Inicio de hoy

    let dateFrom = null;

    if (visitas === "hoy") {
      dateFrom = d.toISOString();
    } else if (visitas === "semana") {
      // Ajustar al lunes de esta semana (o domingo según prefieras)
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // ajustar si lunes es 1
      d.setDate(diff);
      dateFrom = d.toISOString();
    } else if (visitas === "mes") {
      d.setDate(1);
      dateFrom = d.toISOString();
    }

    if (dateFrom) {
      // Buscamos en actividades qué clientes tuvieron actividad >= dateFrom
      const { data: acts, error: errActs } = await supabaseClient
        .from("actividades")
        .select("cliente_id")
        .gte("fecha", dateFrom);

      if (!errActs && acts) {
        allowedIds = [...new Set(acts.map(a => a.cliente_id))];
      } else {
        // En caso de error o vacío, si se pidió filtro y falló, asumimos 0 resultados o mostramos vacio
        allowedIds = [];
      }
    }
  }

  // 2. Query Principal
  let query = supabaseClient
    .from("clientes")
    .select(
      "id, nombre, nombre_local, telefono, mail, direccion, rubro, estado, responsable, interes, estilo_contacto, visitas, status_history, status_date, fecha_proximo_contacto, hora_proximo_contacto, notas, ultima_actividad, venta_digital, venta_digital_cual, created_at",
      { count: "exact" }
    )
    .eq("activo", true);

  // Apply Visit filter
  if (allowedIds !== null) {
    if (allowedIds.length === 0) {
      return { data: [], error: null, count: 0 };
    }
    query = query.in("id", allowedIds);
  }

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

  // Nuevo: Interés
  if (interes) query = query.eq("interes", interes);

  // Nuevo: Estilo
  // if (estilo) query = query.eq("estilo_contacto", estilo);

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
            ${cliente.estilo_contacto ? `<span class="tag tag-estilo">Estilo: ${cliente.estilo_contacto}</span>` : ""}
            ${responsable ? `<span class="tag tag-responsable">Resp: ${responsable}</span>` : ""}
          </div>

          ${cliente.notas ? `<div class="card-notas"><strong>Notas:</strong> ${cliente.notas}</div>` : ""}

          <div class="card-quick-actions">
            <span class="quick-label">Próximo contacto rápido:</span>
            <button class="btn-quick" data-action="prox-hoy" data-id="${cliente.id}">Hoy</button>
            <button class="btn-quick" data-action="prox-maniana" data-id="${cliente.id}">Mañana</button>
            <button class="btn-quick" data-action="prox-sinfecha" data-id="${cliente.id}">Sin fecha</button>
            <button class="btn-quick" data-action="prox-calendario" data-id="${cliente.id}" title="Seleccionar fecha personalizada">📅</button>
            <input type="date" class="quick-date-input" data-id="${cliente.id}" style="position: absolute; width: 0; height: 0; opacity: 0; border: 0; padding: 0; margin: 0; overflow: hidden; pointer-events: none;">
          </div>

          <div class="card-visitas" style="margin-top: 8px; display: flex; align-items: center; gap: 8px;">
             <strong>Visitas: ${cliente.visitas || 0}</strong>
             <button class="btn-circle" data-action="sumar-visita" data-id="${cliente.id}" title="Sumar visita">+</button>
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
    interes: getVal("filtroInteres"),
    visitas: getVal("filtroVisitas"),
    estilo: getVal("filtroEstilo"),
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
  const estilo_contacto = document.getElementById("estilo_contacto") ? document.getElementById("estilo_contacto").value : "Sin definir";
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
    // estilo_contacto: estilo_contacto || null,
    fecha_proximo_contacto: fechaProx || null,
    hora_proximo_contacto: horaProx || null,
    notas: notas || null,
    venta_digital: venta_digital,
    venta_digital_cual: venta_digital ? (venta_digital_cual || null) : null
  };

  // CHECK: Fecha Manual de Alta
  const manualDate = document.getElementById("created_at_input") ? document.getElementById("created_at_input").value : null;
  if (manualDate) {
    // Append current time to ensure it's not shifted by UTC
    const now = new Date();
    // Format: YYYY-MM-DDTHH:mm:ss.sssZ
    // manualDate is YYYY-MM-DD
    const timePart = now.toISOString().split('T')[1];
    payload.created_at = `${manualDate}T${timePart}`;
  }

  if (sinProximo) {
    payload.fecha_proximo_contacto = null;
    payload.hora_proximo_contacto = null;
  }

  // --- TRACKING HISTORY LOGIC START ---
  const nowISO = new Date().toISOString();

  if (id) {
    // 1) Fetch current state (status + feches)
    //    We need to know the OLD status to see if it changed.
    const { data: currentClient, error: fetchErr } = await supabaseClient
      .from("clientes")
      .select("estado, status_date, status_history, created_at")
      .eq("id", id)
      .single();

    if (!fetchErr && currentClient) {
      if (currentClient.estado !== estado) {
        // STATUS CHANGED
        const history = currentClient.status_history || [];
        const oldStatusStart = currentClient.status_date || currentClient.created_at || nowISO;

        // Archive old status
        history.push({
          status: currentClient.estado,
          start_date: oldStatusStart,
          end_date: nowISO
        });

        // Update payload
        payload.status_history = history;
        payload.status_date = nowISO;
      } else {
        // STATUS UNCHANGED
        // Improve: if currentClient.status_date is null, fix it?
        // For now, do nothing -> status_date remains as is.
      }
    }
  } else {
    // NEW CLIENT
    payload.status_date = nowISO;
    payload.status_history = [];
  }
  // --- TRACKING HISTORY LOGIC END ---

  let error;
  let newId = id;

  if (id) {
    const { error: errUpdate } = await supabaseClient.from("clientes").update(payload).eq("id", id);
    error = errUpdate;
    if (!error) {
      // Check if created_at was manually updated
      const manualDate = document.getElementById("created_at_input").value;
      if (manualDate) {
        // We keep the time if possible, or just date?
        // If we just send YYYY-MM-DD, supabase might set time to 00:00 or reject if timestamptz.
        // Ideally we preserve the original time if it's just a date correction, but simple is best:
        // Append T12:00:00Z to ensure it's midday or current time? 
        // Let's use T00:00:00 or T12:00:00.
        // However, if it's a NEW date, we might want current time?
        // User wants to BACKDATE.

        // If we update created_at separately or in payload?
        // Payload is already defined above... wait, I need to add it to payload BEFORE update.
        // But I can do a separate update if needed, or better ADD IT TO PAYLOAD.
      }

      await agregarActividad(id, sinProximo ? "Cliente actualizado y marcado sin próximo contacto." : "Cliente actualizado");
    }
  } else {
    // NUEVO: Agregamos el creador
    payload.creado_por = usuarioActual;

    // Manual Created At (only for new clients? Or Edit too? User said "creation form").
    // Let's support both.
    const manualDate = document.getElementById("created_at_input").value;
    if (manualDate) {
      // Append current time to the selected date to avoid 00:00 UTC shift issues?
      // Or just use the date string, Supabase handles YYYY-MM-DD as 00:00.
      // Let's append current TIME to the selected date.
      const now = new Date();
      const timePart = now.toISOString().split('T')[1];
      payload.created_at = `${manualDate}T${timePart}`;
    }

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

  const estiloContactoSelect = document.getElementById("estilo_contacto");
  if (estiloContactoSelect) estiloContactoSelect.value = cliente.estilo_contacto || "Sin definir";

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

  if (document.getElementById("created_at_input") && cliente.created_at) {
    document.getElementById("created_at_input").value = cliente.created_at.split('T')[0];
  }


  document.getElementById("tituloForm").textContent = "Editar cliente";
  document.getElementById("btnGuardar").textContent = "Actualizar cliente";
}

// =========================================================
// 9) EXCEL: DESCARGAR MODELO / IMPORTAR / EXPORTAR
// =========================================================
// Descargar modelo Excel para importar
function descargarModeloExcel() {
  if (typeof XLSX === 'undefined') {
    alert("La librería Excel (SheetJS) no se ha cargado. Revisa tu conexión.");
    return;
  }
  alert("Generando modelo con fecha_creacion...");
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
    "estilo_contacto", // Added
    "fecha_proximo_contacto",
    "hora_proximo_contacto",
    "notas",
    "venta_digital",
    "venta_digital_cual",
    "interes",
    "fecha_creacion" // Nuevo campo
  ];

  const data = [
    headers,
    ["Ejemplo SRL", "Local Ejemplo", "30-11223344-5", "11-2345-6789", "Av. Rivadavia 1234", "L-V 9-18", "Almacén", "1 - Cliente relevado", "Toto", "Dueño", "2025-01-15", "09:00", "Ejemplo de nota", "false", "", "Alto", "2024-01-01"],
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, "Modelo");

  try {
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modelo_clientes_crm.xlsx";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  } catch (e) {
    alert("Error: " + e.message);
  }
}

// Exportar todos los clientes + historial
// Exportar todos los clientes + historial
async function exportarExcel() {
  const { data: clientes, error: errCli } = await supabaseClient
    .from("clientes")
    .select("id, nombre, nombre_local, cuit, telefono, direccion, horarios_atencion, rubro, estado, responsable, estilo_contacto, fecha_proximo_contacto, hora_proximo_contacto, notas, venta_digital, venta_digital_cual, interes, creado_por, created_at")
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
    ["id", "nombre", "nombre_local", "cuit", "telefono", "direccion", "horarios_atencion", "rubro", "estado", "responsable", "estilo_contacto", "fecha_proximo_contacto", "hora_proximo_contacto", "notas", "venta_digital", "venta_digital_cual", "interes", "creado_por", "created_at"],
  ];

  (clientes || []).forEach((c) => {
    dataClientes.push([
      c.id,
      c.nombre || "",
      c.nombre_local || "",
      c.cuit || "",
      c.telefono || "",
      c.direccion || "",
      c.horarios_atencion || "",
      c.rubro || "",
      c.estado || "",
      c.responsable || "",
      c.estilo_contacto || "",
      c.fecha_proximo_contacto || "",
      c.hora_proximo_contacto || "",
      c.notas || "",
      c.venta_digital || "",
      c.venta_digital_cual || "",
      c.interes || "",
      c.creado_por || "",
      c.created_at || ""
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
    const blob = new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "crm_clientes_historial.xlsx";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
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

        // Custom created_at processing
        let createdAt = null;
        const fechaCreacionRaw = excelDateToYMD(row.fecha_creacion || row.created_at || row.fecha_alta);
        if (fechaCreacionRaw) {
          // Append current time to make it a valid timestamptz
          const now = new Date();
          const timePart = now.toISOString().split('T')[1];
          createdAt = `${fechaCreacionRaw}T${timePart}`;
        }

        return {
          nombre,
          nombre_local: row.nombre_local ? row.nombre_local.toString().trim() : null,
          cuit: row.cuit ? row.cuit.toString().trim() : null,
          telefono: telefono || null,
          direccion,
          rubro,
          horarios_atencion: row.horarios_atencion ? row.horarios_atencion.toString().trim() : null,
          estado,
          responsable: responsable || null,
          estilo_contacto: row.estilo_contacto ? row.estilo_contacto.toString().trim() : "Sin definir",
          interes: row.interes ? row.interes.toString().trim() : "Bajo",
          fecha_proximo_contacto: fechaProx || null,
          hora_proximo_contacto: horaProx || null,
          notas: notas || null,
          venta_digital: row.venta_digital === "true" || row.venta_digital === true,
          venta_digital_cual: row.venta_digital_cual ? row.venta_digital_cual.toString().trim() : null,
          venta_digital_cual: row.venta_digital_cual ? row.venta_digital_cual.toString().trim() : null,
          activo: true,
          created_at: createdAt // may be null (db default) or specific date
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
  // ...

  // Reflejar usuario autenticado
  usuarioActual = getAuthProfileName() || usuarioActual || "";
  localStorage.setItem("usuarioActual", usuarioActual);
  // ===================================
  // WIZARD LOGIC
  // ===================================
  let currentStep = 1;
  const totalSteps = 3;

  function initWizard() {
    currentStep = 1;
    showStep(1);
  }

  function showStep(step) {
    // Hide all
    document.querySelectorAll(".wizard-step").forEach(el => el.classList.remove("active"));
    document.querySelectorAll(".step-indicator").forEach(el => el.classList.remove("active", "completed"));

    // Show current
    const stepEl = document.querySelector(`.wizard-step[data-step="${step}"]`);
    if (stepEl) stepEl.classList.add("active");

    // Updates indicators
    for (let i = 1; i <= totalSteps; i++) {
      const ind = document.querySelector(`.step-indicator[data-step="${i}"]`);
      if (i < step) ind.classList.add("completed");
      if (i === step) ind.classList.add("active");
    }

    // Update Buttons
    const btnPrev = document.getElementById("btnWizardPrev");
    const btnNext = document.getElementById("btnWizardNext");
    const btnGuardar = document.getElementById("btnGuardar");

    if (btnPrev) btnPrev.style.visibility = step === 1 ? "hidden" : "visible";

    if (step === totalSteps) {
      if (btnNext) btnNext.style.display = "none";
      if (btnGuardar) btnGuardar.style.display = "inline-flex";
    } else {
      if (btnNext) btnNext.style.display = "inline-flex";
      if (btnGuardar) btnGuardar.style.display = "none";
    }
  }

  function validateStep(step) {
    const stepEl = document.querySelector(`.wizard-step[data-step="${step}"]`);
    if (!stepEl) return true;

    const inputs = stepEl.querySelectorAll("input, select");
    for (const input of inputs) {
      if (!input.checkValidity()) {
        input.reportValidity();
        return false;
      }
    }
    return true;
  }

  // currentUserNameEl already declared above
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
  if (btnNuevo) btnNuevo.addEventListener("click", () => {
    openNuevoClienteModal();
    initWizard();
  });

  const btnNext = document.getElementById("btnWizardNext");
  const btnPrev = document.getElementById("btnWizardPrev");

  if (btnNext) btnNext.addEventListener("click", () => {
    if (validateStep(currentStep)) {
      currentStep++;
      showStep(currentStep);
    }
  });

  if (btnPrev) btnPrev.addEventListener("click", () => {
    if (currentStep > 1) {
      currentStep--;
      showStep(currentStep);
    }
  });

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

  const filtrosIds = ["filtroNombre", "filtroTelefono", "filtroDireccion", "filtroRubro", "filtroEstado", "filtroResponsable", "filtroInteres", "filtroVisitas", "filtroEstilo"];

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
        initWizard();
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
      } else if (action === "prox-calendario") {
        // Buscar el input date hermano o relacionado
        const card = btn.closest(".card");
        const dateInput = card.querySelector(`.quick-date-input[data-id="${id}"]`);
        if (dateInput) {
          if (dateInput.showPicker) {
            dateInput.showPicker();
          } else {
            // Fallback
            dateInput.click();
          }
        }
      } else if (action === "sumar-visita") {
        // INCREMENTAR VISITA
        // Opción A: update optimista UI + update DB
        // Opción B: update DB + reload
        (async () => {
          try {
            // CHECK OFFLINE
            if (!navigator.onLine) {
              // 1. Queue Action
              window.OfflineManager.addToQueue("ADD_VISIT", { clientId: id });

              // 2. Optimistic UI Update (Blind increment)
              const container = btn.parentElement;
              const strong = container.querySelector('strong');
              if (strong) {
                // Text is "Visitas: 5". Parse number?
                const parts = strong.textContent.split(':');
                if (parts.length > 1) {
                  const num = parseInt(parts[1].trim()) || 0;
                  strong.textContent = `Visitas: ${num + 1}`;
                }
              }
              window.showToast("Guardado localmente. Se subirá al recuperar conexión.", "info");
              return;
            }

            // ONLINE LOGIC (Normal)
            // 1. Fetch current count from DB to be safe
            const { data: currentData, error: fetchErr } = await supabaseClient
              .from('clientes')
              .select('visitas')
              .eq('id', id)
              .single();

            if (fetchErr) throw fetchErr;

            const currentVal = currentData.visitas || 0;
            const newVal = currentVal + 1;

            // 2. Update DB
            const { error } = await supabaseClient
              .from('clientes')
              .update({ visitas: newVal })
              .eq('id', id);

            if (error) throw error;

            // 3. UI Update
            const container = btn.parentElement;
            const strong = container.querySelector('strong');
            if (strong) strong.textContent = `Visitas: ${newVal}`;

            // Log activity to track timestamp
            await agregarActividad(id, "Visita realizada");

          } catch (err) {
            console.error(err);
            alert("Error al sumar visita");
          }
        })();
      }
    });

    // Delegación para el date picker (change)
    lista.addEventListener("change", (e) => {
      if (e.target.classList.contains("quick-date-input")) {
        const id = e.target.dataset.id;
        const val = e.target.value;
        if (val) {
          actualizarProximoContactoRapido(id, "custom", val);
        }
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
  if (window.location.search) {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("action") === "new") {
      // Clean URL
      const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
      window.history.replaceState({ path: newUrl }, "", newUrl);

      // Open Modal
      openNuevoClienteModal();
    }
  }
  // 13) Quick dates in Modal Form (Botones Hoy, Mañana, 1 Sem)
  const btnQuickHoy = document.getElementById("btnQuickHoy");
  const btnQuickManiana = document.getElementById("btnQuickManiana");
  const btnQuickProxSemana = document.getElementById("btnQuickProxSemana");
  const inputFechaProxModal = document.getElementById("fecha_proximo_contacto");

  if (inputFechaProxModal) {
    if (btnQuickHoy) {
      btnQuickHoy.addEventListener("click", () => {
        const today = new Date();
        const ymd = today.toLocaleDateString("sv-SE"); // YYYY-MM-DD
        inputFechaProxModal.value = ymd;
      });
    }
    if (btnQuickManiana) {
      btnQuickManiana.addEventListener("click", () => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        const ymd = d.toLocaleDateString("sv-SE");
        inputFechaProxModal.value = ymd;
      });
    }
    if (btnQuickProxSemana) {
      btnQuickProxSemana.addEventListener("click", () => {
        const d = new Date();
        d.setDate(d.getDate() + 7);
        const ymd = d.toLocaleDateString("sv-SE");
        inputFechaProxModal.value = ymd;
      });
    }
  }

}); // End DOMContentLoaded

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

