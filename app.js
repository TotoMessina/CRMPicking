// =========================================================
// 1) Conexión a Supabase (solo ANON KEY)
// =========================================================
const SUPABASE_URL = "https://mflftikcvsnniwwanrkj.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mbGZ0aWtjdnNubml3d2FucmtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NjcyMjAsImV4cCI6MjA3OTE0MzIyMH0.Z_EsaegFay24E0rOoX2PpwvWasWm5tfLcJiRrgs1nBY";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Cache local de clientes (solo de la página actual)
let clientesCache = [];

// Usuario actual y tema
let usuarioActual = localStorage.getItem("usuarioActual") || "";
const THEME_KEY = "crm_theme";
const FILTERS_KEY = "crm_filters";
const FORM_VIS_KEY = "crm_form_visible";

// Solo estos usuarios pueden guardar / registrar historial
const allowedUsers = [
  "Toto",
  "Ruben",
  "Tincho(B)",
  "Fran",
  "Ari",
  "Nati",
  "Dani",
  "Otro",
];

// Modal actividad
let clienteActividadID = null;

// Agenda de próximos contactos (filtro por fecha)
let agendaMode = "todos"; // 'todos' | 'vencidos' | 'fecha' | 'sin_fecha'
let agendaDate = null; // 'YYYY-MM-DD' cuando mode === 'fecha'

// Stats de agenda (para tooltips y contadores)
let agendaStats = { vencidos: 0, fechas: {}, sinFecha: 0 };

// Paginación (en el FRONT)
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
  document.getElementById("formCliente").reset();
  document.getElementById("clienteId").value = "";
  document.getElementById("tituloForm").textContent = "Nuevo cliente";
  document.getElementById("btnGuardar").textContent = "Guardar";

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
    chkSinProx.checked = false;
  }
}

// Tema
function applyTheme(theme) {
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  localStorage.setItem(THEME_KEY, theme);

  const btn = document.getElementById("btnToggleTheme");
  if (btn) {
    btn.textContent =
      theme === "dark" ? "Modo día ☀️" : "Modo noche 🌙";
  }
}

// Usuario válido
function isUsuarioValido() {
  return !!usuarioActual && allowedUsers.includes(usuarioActual);
}

function asegurarUsuarioValido() {
  if (!isUsuarioValido()) {
    alert(
      "Para poder guardar clientes o registrar historial tenés que seleccionar un usuario válido (Toto, Ruben, Tincho(B), Fran, Ari, Nati, Dani u Otro) en el selector de arriba."
    );
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

function saveFilters() {
  const filtroNombre = document.getElementById("filtroNombre");
  const filtroTelefono = document.getElementById("filtroTelefono");
  const filtroRubro = document.getElementById("filtroRubro");
  const filtroEstado = document.getElementById("filtroEstado");

  const data = {
    nombre: filtroNombre ? filtroNombre.value : "",
    telefono: filtroTelefono ? filtroTelefono.value : "",
    rubro: filtroRubro ? filtroRubro.value : "",
    estado: filtroEstado ? filtroEstado.value : "Todos",
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
    const filtroRubro = document.getElementById("filtroRubro");
    const filtroEstado = document.getElementById("filtroEstado");

    if (filtroNombre && typeof f.nombre === "string") {
      filtroNombre.value = f.nombre;
    }
    if (filtroTelefono && typeof f.telefono === "string") {
      filtroTelefono.value = f.telefono;
    }
    if (filtroRubro && typeof f.rubro === "string") {
      filtroRubro.value = f.rubro;
    }
    if (filtroEstado && typeof f.estado === "string") {
      filtroEstado.value = f.estado;
    }
  } catch (e) {
    console.warn("No se pudieron cargar filtros desde localStorage:", e);
  }
}

function setFormVisible(visible) {
  const box = document.getElementById("formClienteBox");
  const form = document.getElementById("formCliente");
  const btn = document.getElementById("btnToggleForm");
  if (!box || !form || !btn) return;

  if (visible) {
    box.classList.remove("form-box--collapsed");
    form.style.display = "block";
    btn.textContent = "Ocultar formulario";
  } else {
    box.classList.add("form-box--collapsed");
    form.style.display = "none";
    btn.textContent = "Mostrar formulario";
  }

  localStorage.setItem(FORM_VIS_KEY, visible ? "1" : "0");
}

function initFormVisibility() {
  const box = document.getElementById("formClienteBox");
  const form = document.getElementById("formCliente");
  const btn = document.getElementById("btnToggleForm");
  if (!box || !form || !btn) return;

  // Leer estado guardado (default: visible)
  const saved = localStorage.getItem(FORM_VIS_KEY);
  const visible = saved === null ? true : saved === "1";

  // Aplicar estado inicial
  if (!visible) {
    box.classList.add("form-box--collapsed");
    form.style.display = "none";
    btn.textContent = "Mostrar formulario";
  } else {
    box.classList.remove("form-box--collapsed");
    form.style.display = "block";
    btn.textContent = "Ocultar formulario";
  }

  // Toggle al hacer click
  btn.addEventListener("click", () => {
    const isVisible = form.style.display !== "none";
    setFormVisible(!isVisible);
  });
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
    const isActive =
      chipMode === mode && (mode !== "fecha" || chipDate === date);
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

  // NUEVO: Chip "Sin fecha" (ya contactados / sin próximo contacto)
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
    const labelDate = d.toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
    });

    const btn = document.createElement("button");
    btn.className = "agenda-chip";
    btn.dataset.mode = "fecha";
    btn.dataset.date = ymd;
    btn.innerHTML = (i === 0 ? "Hoy<br>" : "") + labelDate;
    btn.dataset.labelBase = btn.innerHTML;

    btn.addEventListener("click", () => setAgendaMode("fecha", ymd));
    cont.appendChild(btn);
  }

  // Selección inicial
  setAgendaMode("todos", null);
}

// Aplica los stats (cantidades) en tooltips y contadores
function aplicarStatsAgendaAChips() {
  const cont = document.getElementById("agendaCalendario");
  if (!cont) return;

  const chips = cont.querySelectorAll(".agenda-chip");
  const totalFechados = Object.values(agendaStats.fechas || {}).reduce(
    (acc, n) => acc + n,
    0
  );

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
      chip.title = n
        ? `${n} clientes con contacto vencido`
        : "Sin contactos vencidos";
      chip.innerHTML = n
        ? `${base} <span class="agenda-count">(${n})</span>`
        : base;
    } else if (mode === "sin_fecha") {
      const n = agendaStats.sinFecha || 0;
      chip.title = n
        ? `${n} clientes sin próximo contacto asignado`
        : "Ningún cliente está marcado sin próximo contacto";
      chip.innerHTML = n
        ? `${base} <span class="agenda-count">(${n})</span>`
        : base;
    } else if (mode === "fecha") {
      const date = chip.dataset.date;
      const n =
        (agendaStats.fechas && agendaStats.fechas[date]) || 0;
      chip.title = n
        ? `${n} clientes con contacto este día`
        : "Sin clientes con contacto este día";
      chip.innerHTML = n
        ? `${base} <span class="agenda-count">(${n})</span>`
        : base;
    }
  });
}

// Carga stats desde la BD y aplica a chips
async function cargarAgendaStats() {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const hoyStr = hoy.toISOString().split("T")[0];

  // Clientes CON fecha de próximo contacto
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

  // NUEVO: clientes SIN fecha de próximo contacto (ya contactados / sin agenda)
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
// Paginación UI (se hace sobre el array ya ordenado)
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
  if (btnPrev) {
    btnPrev.disabled = currentPage <= 1;
  }
  if (btnNext) {
    btnNext.disabled = currentPage >= totalPages || totalClientes === 0;
  }
  if (pageSizeSelect && Number(pageSizeSelect.value) !== pageSize) {
    pageSizeSelect.value = String(pageSize);
  }
}

// =========================================================
// Modal selección de usuario (obligatorio al entrar)
// =========================================================
function initUsuarioModal() {
  const modal = document.getElementById("usuarioModal");
  const selModal = document.getElementById("usuarioModalSelect");
  const btnGuardar = document.getElementById("btnGuardarUsuario");
  if (!modal || !selModal || !btnGuardar) return;

  if (usuarioActual && allowedUsers.includes(usuarioActual)) {
    selModal.value = usuarioActual;
  }

  modal.style.display = "flex";

  btnGuardar.addEventListener("click", () => {
    const value = selModal.value;
    if (!allowedUsers.includes(value)) {
      alert("Seleccioná un usuario para continuar.");
      return;
    }
    usuarioActual = value;
    localStorage.setItem("usuarioActual", usuarioActual);

    const selHeader = document.getElementById("usuarioActual");
    if (selHeader) {
      selHeader.value = usuarioActual;
    }

    modal.style.display = "none";
  });
}

// =========================================================
// 3) ACTIVIDADES (historial)
// =========================================================
async function agregarActividad(clienteId, descripcion) {
  if (!clienteId) return;
  if (!isUsuarioValido()) return;

  const { error } = await supabaseClient.from("actividades").insert([
    {
      cliente_id: clienteId,
      descripcion,
      usuario: usuarioActual || null,
    },
  ]);

  if (error) {
    console.error("Error agregando actividad:", error);
    alert("No se pudo registrar la actividad.");
  }
}

// =========================================================
// 4) CARGA DE CLIENTES + HISTORIAL + RUBROS (orden global por historial)
// =========================================================
async function cargarClientes() {
  const listaDiv = document.getElementById("lista");
  listaDiv.innerHTML = "<p>Cargando...</p>";

  // pageSize desde el select
  const pageSizeSelect = document.getElementById("pageSize");
  if (pageSizeSelect) {
    const val = Number(pageSizeSelect.value);
    if (!Number.isNaN(val) && (val === 25 || val === 50)) {
      pageSize = val;
    }
  }

  const filtroNombre = document.getElementById("filtroNombre").value.trim();
  const filtroTelefono = document.getElementById("filtroTelefono").value.trim();
  const filtroRubro = document.getElementById("filtroRubro").value;
  const filtroEstado = document.getElementById("filtroEstado").value;

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const hoyStr = hoy.toISOString().split("T")[0];

  // --- Rubros para el filtro ---
  try {
    const { data: rubrosData, error: errRubros } = await supabaseClient
      .from("clientes")
      .select("rubro")
      .eq("activo", true);

    if (!errRubros) {
      const selectRubro = document.getElementById("filtroRubro");
      if (selectRubro) {
        const prev = selectRubro.value;
        const rubrosSet = new Set(
          (rubrosData || [])
            .map((c) => c.rubro)
            .filter((r) => r && r.toString().trim() !== "")
        );

        selectRubro.innerHTML = "";
        const optTodos = document.createElement("option");
        optTodos.value = "";
        optTodos.textContent = "Todos los rubros";
        selectRubro.appendChild(optTodos);

        const rubrosOrdenados = Array.from(rubrosSet).sort((a, b) =>
          a.localeCompare(b, "es", { sensitivity: "base" })
        );

        rubrosOrdenados.forEach((r) => {
          const opt = document.createElement("option");
          opt.value = r;
          opt.textContent = r;
          selectRubro.appendChild(opt);
        });

        if (prev && rubrosSet.has(prev)) {
          selectRubro.value = prev;
        }
      }
    } else {
      console.error("Error cargando rubros para filtro:", errRubros);
    }
  } catch (e) {
    console.error("Error inesperado cargando rubros:", e);
  }

  // --- Cargar clientes filtrados (todos, sin range) ---
  let query = supabaseClient
    .from("clientes")
    .select(
      "id, nombre, telefono, rubro, estado, fecha_proximo_contacto, hora_proximo_contacto, notas",
      { count: "exact" }
    )
    .eq("activo", true);

  if (agendaMode === "fecha" && agendaDate) {
    query = query.eq("fecha_proximo_contacto", agendaDate);
  } else if (agendaMode === "vencidos") {
    query = query.lt("fecha_proximo_contacto", hoyStr);
  } else if (agendaMode === "sin_fecha") {
    query = query.is("fecha_proximo_contacto", null);
  }

  if (filtroEstado && filtroEstado !== "Todos") {
    query = query.eq("estado", filtroEstado);
  }
  if (filtroNombre) {
    query = query.ilike("nombre", `%${filtroNombre}%`);
  }
  if (filtroTelefono) {
    query = query.ilike("telefono", `%${filtroTelefono}%`);
  }
  if (filtroRubro) {
    query = query.eq("rubro", filtroRubro);
  }

  query = query.order("id", { ascending: true });

  const { data: clientesAll, error, count } = await query;

  if (error) {
    console.error("Error cargando clientes:", error);
    listaDiv.innerHTML = "<p>Error al cargar clientes.</p>";
    return;
  }

  const clientes = clientesAll || [];
  totalClientes = count ?? clientes.length ?? 0;

  if (!clientes.length) {
    clientesCache = [];
    totalPages = 1;
    updatePaginationUI();
    document.getElementById("contador").textContent = `(0)`;
    listaDiv.innerHTML = "<p>No hay clientes cargados.</p>";
    return;
  }

  // --- Actividades de todos los clientes filtrados ---
  const idsAll = clientes.map((c) => c.id);
  const { data: actividades, error: errorAct } = await supabaseClient
    .from("actividades")
    .select("id, cliente_id, fecha, descripcion, usuario")
    .in("cliente_id", idsAll)
    .order("fecha", { ascending: false });

  if (errorAct) {
    console.error("Error cargando actividades:", errorAct);
  }

  const actividadesPorCliente = {};
  const lastActivityMap = {};

  (actividades || []).forEach((a) => {
    if (!actividadesPorCliente[a.cliente_id]) {
      actividadesPorCliente[a.cliente_id] = [];
    }
    actividadesPorCliente[a.cliente_id].push(a);

    const d = new Date(a.fecha);
    if (!Number.isNaN(d.getTime())) {
      const prev = lastActivityMap[a.cliente_id];
      if (!prev || d > prev) {
        lastActivityMap[a.cliente_id] = d;
      }
    }
  });

  // --- Orden global por última actividad ---
  clientes.sort((a, b) => {
    const da = lastActivityMap[a.id];
    const db = lastActivityMap[b.id];

    if (da && db) return db - da;
    if (da && !db) return -1;
    if (!da && db) return 1;
    return a.id - b.id;
  });

  // --- Paginación en front ---
  totalPages = totalClientes > 0 ? Math.ceil(totalClientes / pageSize) : 1;
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;
  const clientesPagina = clientes.slice(start, end);

  clientesCache = clientesPagina;
  updatePaginationUI();
  document.getElementById("contador").textContent = `(${totalClientes})`;

  // --- Render tarjetas ---
  listaDiv.innerHTML = "";
  clientesPagina.forEach((cliente) => {
    const card = document.createElement("div");
    card.className = "card";
    card.dataset.id = cliente.id;

    const actividadesCliente = actividadesPorCliente[cliente.id] || [];
    const claseEstado = `tag-estado-${cliente.estado.replace(/\s+/g, "")}`;

    const textoFecha =
      cliente.fecha_proximo_contacto
        ? `📅 Próximo contacto: ${formatearFechaSoloDia(
            cliente.fecha_proximo_contacto
          )}`
        : "";
    const textoHora =
      cliente.hora_proximo_contacto
        ? ` a las ${cliente.hora_proximo_contacto.slice(0, 5)}`
        : "";

    // Teléfono clickeable
    let phoneHTML = "";
    if (cliente.telefono) {
      const telDigits = cliente.telefono.replace(/\D/g, "");
      // Si no arranca con 54, le agregamos 54 (Argentina)
      const waNumber = telDigits.startsWith("54")
        ? telDigits
        : "54" + telDigits;

      phoneHTML = `
        <span class="card-phone">
          <a href="tel:${telDigits}" class="phone-link">📞 ${cliente.telefono}</a>
          <a href="https://wa.me/${waNumber}"
            class="wa-link"
            target="_blank"
            rel="noopener noreferrer"
            title="Abrir WhatsApp">
            💬
          </a>
        </span>
      `;
    }

    card.innerHTML = `
      <div class="card-top">
        <div>
          <div class="card-main-title">${cliente.nombre || "(Sin nombre)"}</div>
          <div class="card-meta">
            ${phoneHTML}
            ${textoFecha || textoHora ? " · " : ""}
            ${textoFecha}${textoHora}
          </div>
          <div class="card-tags">
            <span class="tag ${claseEstado}">Estado: ${cliente.estado}</span>
            ${
              cliente.rubro
                ? `<span class="tag">Rubro: ${cliente.rubro}</span>`
                : ""
            }
          </div>
          ${
            cliente.notas
              ? `<div class="card-notas"><strong>Notas:</strong> ${cliente.notas}</div>`
              : ""
          }

          <!-- Acciones rápidas de próximo contacto -->
          <div class="card-quick-actions">
            <span class="quick-label">Próximo contacto rápido:</span>
            <button class="btn-quick" data-action="prox-hoy" data-id="${
              cliente.id
            }">Hoy</button>
            <button class="btn-quick" data-action="prox-maniana" data-id="${
              cliente.id
            }">Mañana</button>
            <button class="btn-quick" data-action="prox-sinfecha" data-id="${
              cliente.id
            }">Sin fecha</button>
          </div>

        </div>
        <div class="card-buttons">
          <button class="btn-actividad" data-action="actividad" data-id="${
            cliente.id
          }">+ Actividad</button>
          <button class="btn-edit" data-action="editar" data-id="${
            cliente.id
          }">Editar</button>
          <button class="btn-delete" data-action="eliminar" data-id="${
            cliente.id
          }">Eliminar</button>
        </div>
      </div>

      <div class="historial">
        <div class="historial-header">
          <strong>Historial (${actividadesCliente.length})</strong>
          <button class="btn-toggle-historial" data-action="toggle-historial" data-id="${
            cliente.id
          }">Ver historial</button>
        </div>
        <div class="historial-list" style="display:none">
          ${
            actividadesCliente.length
              ? actividadesCliente
                  .map(
                    (a) => `
            <div>
              <div>${a.descripcion}</div>
              <div class="historial-fecha">
                ${formatearFecha(a.fecha)}
                ${a.usuario ? ` · <strong>${a.usuario}</strong>` : ""}
              </div>
            </div>`
                  )
                  .join("")
              : "<div>No hay actividades registradas.</div>"
          }
        </div>
      </div>
    `;

    listaDiv.appendChild(card);
  });
}

// =========================================================
// 5) GUARDAR / EDITAR CLIENTE
// =========================================================
async function guardarCliente(e) {
  e.preventDefault();

  if (!asegurarUsuarioValido()) return;

  const id = document.getElementById("clienteId").value || null;
  const nombre = document.getElementById("nombre").value.trim();
  const telefono = document.getElementById("telefono").value.trim();
  const rubro = document.getElementById("rubro").value.trim();
  const estado = document.getElementById("estado").value;
  const fechaProx = document.getElementById("fecha_proximo_contacto").value;
  const horaProxInput = document.getElementById("hora_proximo_contacto");
  const horaProx = horaProxInput ? horaProxInput.value : "";
  const notas = document.getElementById("notas").value.trim();
  const chkSinProx = document.getElementById("sin_proximo_contacto");
  const sinProximo = chkSinProx ? chkSinProx.checked : false;

  if (!nombre) {
    alert("El nombre es obligatorio.");
    return;
  }

  const payload = {
    nombre,
    telefono: telefono || null,
    rubro: rubro || "Sin definir",
    estado,
    fecha_proximo_contacto: fechaProx || null,
    hora_proximo_contacto: horaProx || null,
    notas: notas || null,
  };

  if (sinProximo) {
    payload.fecha_proximo_contacto = null;
    payload.hora_proximo_contacto = null;
  }

  let error;
  let newId = id;

  if (id) {
    const { error: errUpdate } = await supabaseClient
      .from("clientes")
      .update(payload)
      .eq("id", id);

    error = errUpdate;
    if (!error) {
      await agregarActividad(
        id,
        sinProximo
          ? "Cliente actualizado y marcado sin próximo contacto."
          : "Cliente actualizado"
      );
    }
  } else {
    const { data, error: errInsert } = await supabaseClient
      .from("clientes")
      .insert([payload])
      .select("id")
      .single();

    error = errInsert;
    if (!error && data && data.id) {
      newId = data.id;
      await agregarActividad(
        newId,
        sinProximo
          ? "Cliente creado y marcado sin próximo contacto."
          : "Cliente creado"
      );
    }
  }

  if (error) {
    console.error("Error guardando cliente:", error);
    alert("No se pudo guardar el cliente.\n\n" + error.message);
    return;
  }

  resetFormulario();
  await cargarClientes();
  await cargarAgendaStats();
}

// =========================================================
// 6) ELIMINAR CLIENTE (borrado lógico)
// =========================================================
async function eliminarCliente(id) {
  if (!asegurarUsuarioValido()) return;

  if (!confirm("¿Seguro que querés marcar como eliminado este cliente?")) return;

  const { error } = await supabaseClient
    .from("clientes")
    .update({ activo: false })
    .eq("id", id);

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
// 7) EDITAR CLIENTE (rellenar formulario)
// =========================================================
function editarCliente(id) {
  const cliente = clientesCache.find((c) => String(c.id) === String(id));
  if (!cliente) return;

  document.getElementById("clienteId").value = cliente.id;
  document.getElementById("nombre").value = cliente.nombre || "";
  document.getElementById("telefono").value = cliente.telefono || "";
  document.getElementById("rubro").value = cliente.rubro || "";
  document.getElementById("estado").value =
    cliente.estado || "1 - Cliente relevado";
  document.getElementById("fecha_proximo_contacto").value =
    cliente.fecha_proximo_contacto || "";
  const horaInput = document.getElementById("hora_proximo_contacto");
  if (horaInput) {
    horaInput.value = cliente.hora_proximo_contacto || "";
  }
  document.getElementById("notas").value = cliente.notas || "";

  const chkSinProx = document.getElementById("sin_proximo_contacto");
  const inputFecha = document.getElementById("fecha_proximo_contacto");

  const sinProxStored =
    !cliente.fecha_proximo_contacto && !cliente.hora_proximo_contacto;

  if (chkSinProx) chkSinProx.checked = sinProxStored;
  if (inputFecha) inputFecha.disabled = sinProxStored;
  if (horaInput) horaInput.disabled = sinProxStored;

  document.getElementById("tituloForm").textContent = "Editar cliente";
  document.getElementById("btnGuardar").textContent = "Actualizar";
}

// =========================================================
// 8) MODAL DE ACTIVIDAD
// =========================================================
function abrirModalActividad(clienteId) {
  clienteActividadID = clienteId || null;
  const txt = document.getElementById("actividadTexto");
  if (txt) txt.value = "";
  const modal = document.getElementById("actividadModal");
  if (modal) modal.style.display = "flex";
}

function cerrarModalActividad() {
  const modal = document.getElementById("actividadModal");
  if (modal) modal.style.display = "none";
  clienteActividadID = null;
}

async function guardarActividadDesdeModal() {
  if (!clienteActividadID) {
    cerrarModalActividad();
    return;
  }

  if (!asegurarUsuarioValido()) return;

  const txt = document.getElementById("actividadTexto");
  const texto = txt ? txt.value.trim() : "";

  if (!texto) {
    alert("La actividad no puede estar vacía.");
    return;
  }

  await agregarActividad(clienteActividadID, texto);
  cerrarModalActividad();
  await cargarClientes();
  await cargarAgendaStats();
}

async function agregarActividadDesdeCard(id) {
  if (!asegurarUsuarioValido()) return;
  abrirModalActividad(id);
}

async function actualizarProximoContactoRapido(clienteId, tipo) {
  if (!asegurarUsuarioValido()) return;

  let fecha = null;
  let descripcionActividad = "";

  if (tipo === "hoy" || tipo === "maniana") {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    if (tipo === "maniana") {
      d.setDate(d.getDate() + 1);
    }
    fecha = d.toISOString().split("T")[0];
    descripcionActividad =
      tipo === "hoy"
        ? "Próximo contacto marcado para hoy."
        : "Próximo contacto marcado para mañana.";
  } else if (tipo === "sinfecha") {
    fecha = null;
    descripcionActividad = "Cliente marcado sin próximo contacto.";
  }

  const payload = {
    fecha_proximo_contacto: fecha,
    hora_proximo_contacto: null,
  };

  const { error } = await supabaseClient
    .from("clientes")
    .update(payload)
    .eq("id", clienteId);

  if (error) {
    console.error("Error en acción rápida de contacto:", error);
    alert("No se pudo actualizar el próximo contacto.");
    return;
  }

  await agregarActividad(clienteId, descripcionActividad);
  await cargarClientes();
  await cargarAgendaStats();
}

// =========================================================
// 9) EXCEL: DESCARGAR MODELO
// =========================================================
function descargarModeloExcel() {
  const wb = XLSX.utils.book_new();

  const data = [
    [
      "nombre",
      "telefono",
      "rubro",
      "estado",
      "fecha_proximo_contacto (YYYY-MM-DD)",
      "hora_proximo_contacto (HH:MM)",
      "notas",
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, "Clientes");

  XLSX.writeFile(wb, "modelo_clientes.xlsx");
}

// =========================================================
// 9 bis) EXCEL: EXPORTAR CLIENTES + HISTORIAL
// =========================================================
async function exportarExcel() {
  const { data: clientes, error: errCli } = await supabaseClient
    .from("clientes")
    .select(
      "id, nombre, telefono, rubro, estado, fecha_proximo_contacto, hora_proximo_contacto, notas"
    )
    .eq("activo", true)
    .order("id", { ascending: true });

  if (errCli) {
    console.error("Error obteniendo clientes para exportar:", errCli);
    alert("No se pudieron obtener los clientes para exportar.");
    return;
  }

  const ids = (clientes || []).map((c) => c.id);
  let actividades = [];

  if (ids.length) {
    const { data: acts, error: errAct } = await supabaseClient
      .from("actividades")
      .select("cliente_id, fecha, usuario, descripcion")
      .in("cliente_id", ids)
      .order("fecha", { ascending: true });

    if (errAct) {
      console.error("Error obteniendo actividades:", errAct);
    }

    actividades = acts || [];
  }

  const wb = XLSX.utils.book_new();

  // Hoja Clientes
  const dataClientes = [
    [
      "id",
      "nombre",
      "telefono",
      "rubro",
      "estado",
      "fecha_proximo_contacto",
      "hora_proximo_contacto",
      "notas",
    ],
  ];

  (clientes || []).forEach((c) => {
    dataClientes.push([
      c.id,
      c.nombre || "",
      c.telefono || "",
      c.rubro || "",
      c.estado || "",
      c.fecha_proximo_contacto || "",
      c.hora_proximo_contacto || "",
      c.notas || "",
    ]);
  });

  const wsClientes = XLSX.utils.aoa_to_sheet(dataClientes);
  XLSX.utils.book_append_sheet(wb, wsClientes, "Clientes");

  // Hoja Historial
  const clientePorId = {};
  (clientes || []).forEach((c) => {
    clientePorId[c.id] = c;
  });

  const dataHist = [
    [
      "cliente_id",
      "nombre_cliente",
      "telefono_cliente",
      "fecha",
      "usuario",
      "descripcion",
    ],
  ];

  actividades.forEach((a) => {
    const cli = clientePorId[a.cliente_id] || {};
    dataHist.push([
      a.cliente_id,
      cli.nombre || "",
      cli.telefono || "",
      a.fecha || "",
      a.usuario || "",
      a.descripcion || "",
    ]);
  });

  const wsHist = XLSX.utils.aoa_to_sheet(dataHist);
  XLSX.utils.book_append_sheet(wb, wsHist, "Historial");

  XLSX.writeFile(wb, "crm_clientes_historial.xlsx");
}

// =========================================================
// 10) EXCEL: IMPORTAR CLIENTES (UPSERT POR TELÉFONO)
// =========================================================
async function importarDesdeExcel(file) {
  const reader = new FileReader();

  reader.onload = async (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });

      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Lee todas las filas como objetos { nombre, telefono, rubro, estado, ... }
      const json = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      if (!json.length) {
        alert("El archivo no tiene datos.");
        return;
      }

      // Mapeo de filas de Excel -> estructura de la tabla `clientes`
      const registros = json.map((row) => {
        const nombre = (row.nombre || "").toString().trim();

        const telefono = row.telefono
          ? row.telefono.toString().trim()
          : "";

        let rubro = row.rubro ? row.rubro.toString().trim() : "";
        if (!rubro) rubro = "Sin definir";

        let estado = row.estado ? row.estado.toString().trim() : "";
        if (!estado) estado = "1 - Cliente relevado";

        const fecha_proximo_contacto = excelDateToYMD(
          row["fecha_proximo_contacto (YYYY-MM-DD)"]
        );

        const hora_proximo_contacto = row["hora_proximo_contacto (HH:MM)"]
          ? row["hora_proximo_contacto (HH:MM)"].toString().trim()
          : null;

        const notas = row.notas ? row.notas.toString().trim() : null;

        return {
          nombre,
          telefono,
          rubro,
          estado,
          fecha_proximo_contacto,
          hora_proximo_contacto,
          notas,
        };
      });

      // Solo consideramos filas con NOMBRE y TELÉFONO (clave para upsert)
      const registrosValidos = registros.filter(
        (r) => r.nombre && r.telefono
      );

      const omitidosSinTelefono = registros.filter(
        (r) => r.nombre && !r.telefono
      ).length;

      if (!registrosValidos.length) {
        alert(
          "No se encontraron filas válidas (deben tener al menos nombre y teléfono)."
        );
        return;
      }

      // UPSERT por teléfono:
      // - Si el teléfono ya existe en `clientes`, se ACTUALIZAN los campos.
      // - Si no existe, se INSERTA un nuevo cliente.
      const { error } = await supabaseClient
        .from("clientes")
        .upsert(registrosValidos, {
          onConflict: "telefono", // clave única en la tabla
        });

      if (error) {
        console.error(
          "Error importando desde Excel:",
          error,
          "JSON:",
          JSON.stringify(error)
        );
        alert(
          "Hubo un error al importar los clientes.\n\n" +
            (error.message || JSON.stringify(error))
        );
        return;
      }

      let msg = `Importación completada.\n\nClientes insertados/actualizados según teléfono: ${registrosValidos.length}.`;
      if (omitidosSinTelefono > 0) {
        msg += `\nFilas con nombre pero SIN teléfono (omitidas): ${omitidosSinTelefono}.`;
      }

      alert(msg);

      // Refrescamos la UI
      await cargarClientes();
      await cargarAgendaStats();
    } catch (err) {
      console.error("Error inesperado importando Excel:", err);
      alert(
        "Ocurrió un error inesperado al importar el Excel.\n\n" +
          (err.message || String(err))
      );
    }
  };

  reader.readAsArrayBuffer(file);
}

// =========================================================
// 11) EVENTOS DOM
// =========================================================
document.addEventListener("DOMContentLoaded", () => {
  // =========================================================
  // 1) TEMA (claro / oscuro)
  // =========================================================
  const savedTheme = localStorage.getItem(THEME_KEY) || "light";
  applyTheme(savedTheme);

  const btnTheme = document.getElementById("btnToggleTheme");
  if (btnTheme) {
    btnTheme.addEventListener("click", () => {
      const current =
        document.documentElement.getAttribute("data-theme") || "light";
      const next = current === "light" ? "dark" : "light";
      applyTheme(next);
    });
  }

  // =========================================================
  // 2) VISIBILIDAD DEL FORMULARIO (colapsable)
  // =========================================================
  initFormVisibility();

  // =========================================================
  // 3) SELECCIÓN OBLIGATORIA DE USUARIO
  // =========================================================
  const usuarioModal = document.getElementById("usuarioModal");
  const usuarioSelectModal = document.getElementById("usuarioModalSelect");
  const usuarioDropdown = document.getElementById("usuarioActual");

  document.getElementById("btnGuardarUsuario").addEventListener("click", () => {
    const val = usuarioSelectModal.value;
    if (!val) return alert("Debés seleccionar un usuario.");
    window.usuarioActualSeleccionado = val;
    usuarioDropdown.value = val;
    usuarioModal.style.display = "none";
  });

  usuarioDropdown.addEventListener("change", () => {
    const val = usuarioDropdown.value;
    if (!val) return;
    window.usuarioActualSeleccionado = val;
  });

  // =========================================================
  // 4) FILTROS (cargar desde localStorage + guardar)
  // =========================================================
  loadFilters();

  document.getElementById("btnAplicarFiltros").addEventListener("click", () => {
    saveFilters();
    currentPage = 1;
    cargarClientes();
  });

  ["filtroNombre", "filtroTelefono"].forEach((id) => {
    const el = document.getElementById(id);
    el.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        saveFilters();
        currentPage = 1;
        cargarClientes();
      }
    });
  });

  // =========================================================
  // 5) PAGINACIÓN
  // =========================================================
  const pageSizeSelect = document.getElementById("pageSize");
  if (pageSizeSelect) {
    pageSizeSelect.addEventListener("change", () => {
      currentPage = 1;
      renderAgendaCalendario();
      cargarClientes();
    });
  }

  document.getElementById("btnPrevPagina").addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      cargarClientes();
    }
  });

  document.getElementById("btnNextPagina").addEventListener("click", () => {
    currentPage++;
    cargarClientes();
  });

  // =========================================================
  // 6) EXCEL: DESCARGAR MODELO / IMPORTAR / EXPORTAR
  // =========================================================
  document.getElementById("btnDescargarModelo").addEventListener("click", () => {
    descargarModeloExcel();
  });

  const inputExcel = document.getElementById("inputExcel");
  document.getElementById("btnImportarExcel").addEventListener("click", () => {
    inputExcel.click();
  });

  inputExcel.addEventListener("change", () => {
    if (inputExcel.files.length === 1) {
      importarDesdeExcel(inputExcel.files[0]);
      inputExcel.value = "";
    }
  });

  document.getElementById("btnExportarExcel").addEventListener("click", () => {
    exportarExcel();
  });

  // =========================================================
  // 7) TARJETAS (editar / eliminar / actividad / historial / acciones rápidas)
  // =========================================================
  document.getElementById("lista").addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;

    const id = btn.dataset.id;
    const action = btn.dataset.action;

    if (action === "editar") {
      editarCliente(id);

      // Cuando edita, mostramos el formulario automáticamente
      setFormVisible(true);
    }

    else if (action === "eliminar") {
      eliminarCliente(id);
    }

    else if (action === "actividad") {
      agregarActividadDesdeCard(id);
    }

    else if (action === "toggle-historial") {
      const card = btn.closest(".card");
      if (!card) return;
      const listaHist = card.querySelector(".historial-list");
      if (!listaHist) return;
      const visible = listaHist.style.display !== "none";
      listaHist.style.display = visible ? "none" : "block";
      btn.textContent = visible ? "Ver historial" : "Ocultar historial";
    }

    else if (action === "prox-hoy") {
      actualizarProximoContactoRapido(id, "hoy");
    }

    else if (action === "prox-maniana") {
      actualizarProximoContactoRapido(id, "maniana");
    }

    else if (action === "prox-sinfecha") {
      actualizarProximoContactoRapido(id, "sinfecha");
    }
  });

  // =========================================================
  // 8) FORMULARIO: GUARDAR CLIENTE Y CANCELAR EDICIÓN
  // =========================================================
  document.getElementById("formCliente").addEventListener("submit", guardarCliente);

  document.getElementById("btnCancelarEdicion").addEventListener("click", () => {
    resetFormulario();
  });

  // =========================================================
  // 9) MODAL DE ACTIVIDAD (guardar / cerrar)
  // =========================================================
  const btnGuardarAct = document.getElementById("btnGuardarActividad");
  if (btnGuardarAct) {
    btnGuardarAct.addEventListener("click", guardarActividadDesdeModal);
  }

  const btnCerrarAct = document.getElementById("btnCerrarActividad");
  if (btnCerrarAct) {
    btnCerrarAct.addEventListener("click", cerrarModalActividad);
  }

  const actividadModal = document.getElementById("actividadModal");
  if (actividadModal) {
    actividadModal.addEventListener("click", (e) => {
      if (e.target.id === "actividadModal") {
        cerrarModalActividad();
      }
    });
  }

  // =========================================================
  // 10) BOTÓN: MOVER VENCIDOS A SIN FECHA
  // =========================================================
  const btnVencidos = document.getElementById("btnVencidosASinFecha");
  if (btnVencidos) {
    btnVencidos.addEventListener("click", async () => {
      if (!asegurarUsuarioValido()) return;

      const confirmed = confirm(
        "¿Seguro que querés mover TODOS los contactos vencidos a ‘Sin Fecha’?"
      );
      if (!confirmed) return;

      await moverVencidosASinFecha();
    });
  }

  // =========================================================
  // 11) INICIAR AGENDA / ESTADÍSTICAS / CLIENTES
  // =========================================================
  renderAgendaCalendario();
  cargarAgendaStats();
  cargarClientes();
});
