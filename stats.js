// =========================================================
// CONEXIÓN SUPABASE
// =========================================================
const SUPABASE_URL = "https://mflftikcvsnniwwanrkj.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mbGZ0aWtjdnNubml3d2FucmtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NjcyMjAsImV4cCI6MjA3OTE0MzIyMH0.Z_EsaegFay24E0rOoX2PpwvWasWm5tfLcJiRrgs1nBY";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Tema consistente con el CRM
const THEME_KEY = "crm_theme";

// Normalización suave para evitar “3 - Primer ingreso” vs “3 - Primer Ingreso”
function normalizeEstado(v) {
  if (!v) return "Sin estado";
  const s = String(v).trim();
  if (s.toLowerCase() === "3 - primer ingreso") return "3 - Primer Ingreso";
  return s;
}

// Config de estados para el gráfico (colores se ajustan en modo noche)
const ESTADOS_CONFIG = [
  { value: "1 - Cliente relevado", label: "1 - Cliente relevado", color: "#ef4444" },
  { value: "2 - Local Visitado No Activo", label: "2 - Local Visitado No Activo", color: "#f97316" },
  { value: "3 - Primer Ingreso", label: "3 - Primer Ingreso", color: "#eab308" },
  { value: "4 - Local Creado", label: "4 - Local Creado", color: "#3b82f6" },
  { value: "5 - Local Visitado Activo", label: "5 - Local Visitado Activo", color: "#0ea5e9" },
  { value: "6 - Local No Interesado", label: "6 - Local No Interesado", color: "#6b7280" },
];

const charts = {
  rubros: null,
  estados: null,
  responsables: null,
  promedioResp: null,

  // NUEVO: consumidores
  estadosConsumidores: null,
};

// =========================================================
// THEME
// =========================================================
function applyTheme(theme) {
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  localStorage.setItem(THEME_KEY, theme);

  const btn = document.getElementById("btnToggleTheme");
  if (btn) btn.textContent = theme === "dark" ? "Modo día" : "Modo noche";
}

// =========================================================
// CHART.JS THEME (SOLO COLORES / CONTRASTE)
// =========================================================
function getCssVar(name, fallback) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}
function isDarkTheme() {
  return (document.documentElement.getAttribute("data-theme") || "light") === "dark";
}

// Paleta fluo (solo para modo noche)
function getFluoPalette(n) {
  const base = [
    "#00E5FF", // cyan
    "#A3FF12", // lime
    "#FF2BD6", // magenta
    "#7C3CFF", // violet
    "#3B82F6", // blue
    "#FF9F1C", // orange
    "#22FFB8", // mint
    "#FF3D3D", // red
    "#FFD400", // yellow
    "#00A3FF", // sky
  ];
  const out = [];
  for (let i = 0; i < n; i++) out.push(base[i % base.length]);
  return out;
}

function applyChartTheme() {
  const dark = isDarkTheme();

  const text = getCssVar("--text", dark ? "#f3f4f6" : "#0b1220");
  const border = dark ? "rgba(255,255,255,0.10)" : "rgba(2,6,23,0.10)";
  const grid = dark ? "rgba(0,229,255,0.10)" : "rgba(2,6,23,0.10)";

  Chart.defaults.color = text;
  Chart.defaults.borderColor = border;
  Chart.defaults.scale.grid.color = grid;
  Chart.defaults.scale.ticks.color = text;
  Chart.defaults.plugins.legend.labels.color = text;

  Chart.defaults.plugins.tooltip.backgroundColor = dark ? "rgba(12,12,12,0.95)" : "rgba(255,255,255,0.98)";
  Chart.defaults.plugins.tooltip.borderColor = dark ? "rgba(0,229,255,0.45)" : "rgba(2,6,23,0.18)";
  Chart.defaults.plugins.tooltip.borderWidth = 1;
  Chart.defaults.plugins.tooltip.titleColor = text;
  Chart.defaults.plugins.tooltip.bodyColor = text;

  Chart.defaults.animation.duration = 550;
}

// =========================================================
// HELPERS UI
// =========================================================
function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = String(value);
}

function destroyChart(key) {
  const ch = charts[key];
  if (ch && typeof ch.destroy === "function") ch.destroy();
  charts[key] = null;
}

function safeTrim(v, fallback) {
  const s = (v ?? "").toString().trim();
  return s || fallback;
}

// =========================================================
// HELPERS SUPABASE (para tolerar columnas opcionales)
// =========================================================
async function selectWithOptionalActivo(table, columns) {
  // Intenta filtrar activo=true; si la columna no existe, reintenta sin filtro
  const r1 = await supabaseClient.from(table).select(columns).eq("activo", true);
  if (!r1.error) return r1;

  const msg = (r1.error?.message || "").toLowerCase();
  if (msg.includes("column") && msg.includes("activo") && msg.includes("does not exist")) {
    return await supabaseClient.from(table).select(columns);
  }

  // Error real (tabla no existe u otra cosa)
  return r1;
}

async function selectConsumidoresConEstado() {
  // Probamos estado, si falla probamos estado_consumidor
  const r1 = await selectWithOptionalActivo("consumidores", "id, estado, ultima_actividad, created_at");
  if (!r1.error) return { ...r1, estadoField: "estado" };

  const msg = (r1.error?.message || "").toLowerCase();
  if (msg.includes("column") && msg.includes("estado") && msg.includes("does not exist")) {
    const r2 = await selectWithOptionalActivo("consumidores", "id, estado_consumidor, ultima_actividad, created_at");
    if (!r2.error) return { ...r2, estadoField: "estado_consumidor" };
    return { ...r2, estadoField: "estado_consumidor" };
  }
  return { ...r1, estadoField: "estado" };
}

// =========================================================
// LOAD STATS
// =========================================================
async function cargarEstadisticas() {
  applyChartTheme();

  // Reset charts to avoid overlay
  destroyChart("rubros");
  destroyChart("estados");
  destroyChart("responsables");
  destroyChart("promedioResp");
  destroyChart("estadosConsumidores");

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const hoyStr = hoy.toISOString().split("T")[0];

  const hace7 = new Date(hoy);
  hace7.setDate(hoy.getDate() - 7);

  const hace30 = new Date(hoy);
  hace30.setDate(hoy.getDate() - 30);

  const dentro7 = new Date(hoy);
  dentro7.setDate(hoy.getDate() + 7);
  const dentro7Str = dentro7.toISOString().split("T")[0];

  // ==========================
  // Clientes activos
  // ==========================
  const { data: clientes, error: errClientes } = await supabaseClient
    .from("clientes")
    .select("id, rubro, estado, fecha_proximo_contacto, responsable, ultima_actividad")
    .eq("activo", true);

  if (errClientes) {
    console.error(errClientes);
    alert("No se pudieron cargar las estadísticas (clientes).");
    return;
  }

  const lista = clientes || [];
  const totalClientes = lista.length;

  // Conteos
  const rubrosCount = new Map();        // rubro -> count
  const estadosCount = new Map();       // estado -> count
  const responsablesCount = new Map();  // responsable -> count

  // Agenda
  let conFecha = 0;
  let vencidos = 0;
  let sinFecha = 0;
  let proxHoy = 0;
  let prox7 = 0;
  let proxFuturo = 0;

  // Salud cartera
  let clientesActivos30 = 0;
  let clientesDormidos30 = 0;
  let clientesSinHistorial = 0;

  for (const c of lista) {
    const rubroKey = safeTrim(c.rubro, "Sin definir");
    rubrosCount.set(rubroKey, (rubrosCount.get(rubroKey) || 0) + 1);

    const estadoKey = normalizeEstado(c.estado);
    estadosCount.set(estadoKey, (estadosCount.get(estadoKey) || 0) + 1);

    const respKey = safeTrim(c.responsable, "Sin responsable");
    responsablesCount.set(respKey, (responsablesCount.get(respKey) || 0) + 1);

    // Agenda
    const fProx = c.fecha_proximo_contacto;
    if (fProx) {
      conFecha++;
      if (fProx < hoyStr) {
        vencidos++;
      } else if (fProx === hoyStr) {
        proxHoy++;
      } else if (fProx <= dentro7Str) {
        prox7++;
      } else {
        proxFuturo++;
      }
    } else {
      sinFecha++;
    }

    // Salud cartera
    if (!c.ultima_actividad) {
      clientesSinHistorial++;
      clientesDormidos30++;
    } else {
      const ua = new Date(c.ultima_actividad);
      if (!Number.isNaN(ua.getTime()) && ua >= hace30) clientesActivos30++;
      else clientesDormidos30++;
    }
  }

  // ==========================
  // Actividades 30 días (para volumen + promedio)
  // ==========================
  let actividades7 = 0;
  let actividades30 = 0;
  const actividadesPorUsuario = new Map();

  const { data: actividades, error: errAct } = await supabaseClient
    .from("actividades")
    .select("id, fecha, usuario, cliente_id")
    .gte("fecha", hace30.toISOString());

  if (errAct) {
    console.error(errAct);
    // seguimos, pero actividades quedan en 0
  } else {
    for (const a of actividades || []) {
      const f = new Date(a.fecha);
      if (Number.isNaN(f.getTime())) continue;

      actividades30++;
      if (f >= hace7) actividades7++;

      const userKey = safeTrim(a.usuario, "Sin usuario");
      actividadesPorUsuario.set(userKey, (actividadesPorUsuario.get(userKey) || 0) + 1);
    }
  }

  // KPIs (Clientes)
  setText("statTotalClientes", totalClientes);
  setText("statConFecha", conFecha);
  setText("statVencidos", vencidos);
  setText("statSinFecha", sinFecha);

  setText("statConFechaText", conFecha);
  setText("statVencidosText", vencidos);
  setText("statSinFechaText", sinFecha);

  setText("statProxHoy", proxHoy);
  setText("statProx7", prox7);
  setText("statProxFuturo", proxFuturo);

  setText("statAct7", actividades7);
  setText("statAct30", actividades30);

  setText("statClientesActivos30", clientesActivos30);
  setText("statClientesDormidos30", clientesDormidos30);
  setText("statSinHistorial", clientesSinHistorial);

  // Render charts + lists (Clientes)
  dibujarChartRubrosOrdenado(rubrosCount);
  dibujarChartEstados(estadosCount);
  dibujarChartResponsables(responsablesCount);
  renderListaActividadUsuarios(actividadesPorUsuario);

  // Promedio por responsable: tabla + gráfico
  renderPromedioContactosPorResponsable(lista, actividades || [], hace30);

  // =========================================================
  // NUEVO: CONSUMIDORES FINALES
  // =========================================================
  await cargarEstadisticasConsumidores(hace7, hace30);
}

// =========================================================
// NUEVO: ESTADÍSTICAS CONSUMIDORES
// =========================================================
async function cargarEstadisticasConsumidores(hace7, hace30) {
  // KPIs placeholders (por si falla)
  setText("statTotalConsumidores", "-");
  setText("statConsAct7", "-");
  setText("statConsAct30", "-");

  // Estados consumidores
  const estadosConsCount = new Map();

  // 1) Consumidores
  const resCons = await selectConsumidoresConEstado();
  if (resCons.error) {
    console.warn("Consumidores: no se pudo leer tabla/columnas.", resCons.error);
    // Render “sin datos” en listas si existen
    renderListaSimpleVacia("listaEstadosConsumidores", "No hay consumidores (o no existe la tabla).");
    renderListaSimpleVacia("listaActividadUsuariosConsumidores", "No hay actividades de consumidores (o no existe la tabla).");
    return;
  }

  const consumidores = resCons.data || [];
  const estadoField = resCons.estadoField || "estado";

  setText("statTotalConsumidores", consumidores.length);

  for (const c of consumidores) {
    const rawEstado = c?.[estadoField];
    const estadoKey = normalizeEstado(rawEstado);
    estadosConsCount.set(estadoKey, (estadosConsCount.get(estadoKey) || 0) + 1);
  }

  // 2) Actividades consumidores (30 días)
  let consAct7 = 0;
  let consAct30 = 0;
  const actConsPorUsuario = new Map();

  const { data: actCons, error: errActCons } = await supabaseClient
    .from("actividades_consumidores")
    .select("id, fecha, usuario, consumidor_id")
    .gte("fecha", hace30.toISOString());

  if (errActCons) {
    console.warn("actividades_consumidores: no se pudo leer.", errActCons);
  } else {
    for (const a of actCons || []) {
      const f = new Date(a.fecha);
      if (Number.isNaN(f.getTime())) continue;

      consAct30++;
      if (f >= hace7) consAct7++;

      const userKey = safeTrim(a.usuario, "Sin usuario");
      actConsPorUsuario.set(userKey, (actConsPorUsuario.get(userKey) || 0) + 1);
    }
  }

  setText("statConsAct7", consAct7);
  setText("statConsAct30", consAct30);

  // Chart + list estados consumidores
  dibujarChartEstadosGenerico({
    canvasId: "chartEstadosConsumidores",
    listId: "listaEstadosConsumidores",
    titleKind: "consumidor",
    countMap: estadosConsCount,
  });

  // Lista actividad consumidores por usuario
  renderListaActividadUsuariosEn(
    "listaActividadUsuariosConsumidores",
    actConsPorUsuario,
    "No hay actividades de consumidores registradas en los últimos 30 días."
  );
}

function renderListaSimpleVacia(listId, msg) {
  const ul = document.getElementById(listId);
  if (!ul) return;
  ul.innerHTML = "";
  const li = document.createElement("li");
  li.textContent = msg;
  ul.appendChild(li);
}

// =========================================================
// RUBROS: PIE ORDENADO (mayor -> menor) + FLUO en DARK
// =========================================================
function dibujarChartRubrosOrdenado(rubrosCount) {
  const canvas = document.getElementById("chartRubros");
  if (!canvas) return;

  const ordered = Array.from(rubrosCount.entries()).sort((a, b) => b[1] - a[1]);
  const labels = ordered.map(([k]) => k);
  const data = ordered.map(([, v]) => v);

  const dark = isDarkTheme();
  const backgroundColor = dark
    ? getFluoPalette(labels.length)
    : labels.map((_, i) => ([
        "#3b82f6", "#22c55e", "#f97316", "#eab308", "#a855f7",
        "#ec4899", "#6366f1", "#14b8a6", "#f43f5e", "#6b7280",
      ])[i % 10]);

  charts.rubros = new Chart(canvas, {
    type: "pie",
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor,
        borderColor: dark ? "#0c0c0c" : "rgba(255,255,255,0.8)",
        borderWidth: dark ? 2 : 1,
      }],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: "bottom" },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const value = ctx.raw || 0;
              const total = data.reduce((acc, n) => acc + n, 0) || 1;
              const perc = ((value * 100) / total).toFixed(1);
              return `${ctx.label}: ${value} (${perc}%)`;
            },
          },
        },
      },
    },
  });

  const listaRubros = document.getElementById("listaRubros");
  if (listaRubros) {
    listaRubros.innerHTML = "";
    const total = data.reduce((acc, n) => acc + n, 0) || 1;

    labels.forEach((label, idx) => {
      const value = data[idx];
      const perc = ((value * 100) / total).toFixed(1);
      const li = document.createElement("li");
      li.innerHTML = `
        <span class="stats-list-label">${label}</span>
        <span class="stats-list-value">${value} <span class="chip">${perc}%</span></span>
      `;
      listaRubros.appendChild(li);
    });
  }
}

// =========================================================
// ESTADOS (CLIENTES): BAR HORIZONTAL + FLUO en DARK
// =========================================================
function dibujarChartEstados(estadosCount) {
  const canvas = document.getElementById("chartEstados");
  if (!canvas) return;

  const labels = ESTADOS_CONFIG.map((e) => e.label);
  const data = ESTADOS_CONFIG.map((e) => estadosCount.get(e.value) || 0);

  const dark = isDarkTheme();
  const backgroundColor = dark
    ? getFluoPalette(labels.length)
    : ESTADOS_CONFIG.map((e) => e.color);

  charts.estados = new Chart(canvas, {
    type: "bar",
    data: { labels, datasets: [{ data, backgroundColor, borderRadius: 10 }] },
    options: {
      responsive: true,
      indexAxis: "y",
      scales: {
        x: { beginAtZero: true, ticks: { stepSize: 1 } },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const v = ctx.raw || 0;
              return `${v} cliente${v === 1 ? "" : "s"}`;
            },
          },
        },
      },
    },
  });

  const ul = document.getElementById("listaEstados");
  if (ul) {
    ul.innerHTML = "";
    const total = data.reduce((acc, n) => acc + n, 0) || 1;

    labels.forEach((label, idx) => {
      const value = data[idx];
      const perc = ((value * 100) / total).toFixed(1);
      const li = document.createElement("li");
      li.innerHTML = `
        <span class="stats-list-label">${label}</span>
        <span class="stats-list-value">${value} <span class="chip">${perc}%</span></span>
      `;
      ul.appendChild(li);
    });
  }
}

// =========================================================
// NUEVO: ESTADOS GENÉRICO (Consumidores)
// - Toma los estados reales del Map, los ordena por cantidad
// - Gráfico bar horizontal + fluo en dark
// =========================================================
function dibujarChartEstadosGenerico({ canvasId, listId, titleKind, countMap }) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ordered = Array.from((countMap || new Map()).entries()).sort((a, b) => b[1] - a[1]);
  const labels = ordered.map(([k]) => k);
  const data = ordered.map(([, v]) => v);

  // Si no hay estados, mostramos vacío
  if (labels.length === 0) {
    renderListaSimpleVacia(listId, `No hay estados de ${titleKind} para mostrar.`);
    return;
  }

  const dark = isDarkTheme();
  const backgroundColor = dark ? getFluoPalette(labels.length) : labels.map((_, i) => ([
    "#3b82f6", "#22c55e", "#f97316", "#eab308", "#a855f7",
    "#ec4899", "#6366f1", "#14b8a6", "#f43f5e", "#6b7280",
  ])[i % 10]);

  charts.estadosConsumidores = new Chart(canvas, {
    type: "bar",
    data: { labels, datasets: [{ data, backgroundColor, borderRadius: 10 }] },
    options: {
      responsive: true,
      indexAxis: "y",
      scales: {
        x: { beginAtZero: true, ticks: { stepSize: 1 } },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const v = ctx.raw || 0;
              return `${v} ${titleKind}${v === 1 ? "" : "es"}`;
            },
          },
        },
      },
    },
  });

  const ul = document.getElementById(listId);
  if (ul) {
    ul.innerHTML = "";
    const total = data.reduce((acc, n) => acc + n, 0) || 1;

    labels.forEach((label, idx) => {
      const value = data[idx];
      const perc = ((value * 100) / total).toFixed(1);
      const li = document.createElement("li");
      li.innerHTML = `
        <span class="stats-list-label">${label}</span>
        <span class="stats-list-value">${value} <span class="chip">${perc}%</span></span>
      `;
      ul.appendChild(li);
    });
  }
}

// =========================================================
// RESPONSABLES: BAR VERTICAL + FLUO en DARK
// =========================================================
function dibujarChartResponsables(responsablesCount) {
  const canvas = document.getElementById("chartResponsables");
  if (!canvas) return;

  const ordered = Array.from(responsablesCount.entries()).sort((a, b) => b[1] - a[1]);
  const labels = ordered.map(([k]) => k);
  const data = ordered.map(([, v]) => v);

  const dark = isDarkTheme();
  const backgroundColor = dark
    ? getFluoPalette(labels.length)
    : labels.map((_, i) => ([
        "#6366f1", "#22c55e", "#f97316", "#eab308", "#a855f7",
        "#ec4899", "#0ea5e9", "#f43f5e", "#6b7280",
      ])[i % 9]);

  charts.responsables = new Chart(canvas, {
    type: "bar",
    data: { labels, datasets: [{ data, backgroundColor, borderRadius: 10 }] },
    options: {
      responsive: true,
      scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const v = ctx.raw || 0;
              return `${v} cliente${v === 1 ? "" : "s"}`;
            },
          },
        },
      },
    },
  });

  const ul = document.getElementById("listaResponsables");
  if (ul) {
    ul.innerHTML = "";
    const total = data.reduce((acc, n) => acc + n, 0) || 1;

    labels.forEach((label, idx) => {
      const value = data[idx];
      const perc = ((value * 100) / total).toFixed(1);
      const li = document.createElement("li");
      li.innerHTML = `
        <span class="stats-list-label">${label}</span>
        <span class="stats-list-value">${value} <span class="chip">${perc}%</span></span>
      `;
      ul.appendChild(li);
    });
  }
}

// =========================================================
// ACTIVIDAD POR USUARIO (LISTA) - CLIENTES
// =========================================================
function renderListaActividadUsuarios(actividadesPorUsuario) {
  renderListaActividadUsuariosEn(
    "listaActividadUsuarios",
    actividadesPorUsuario,
    "No hay actividades registradas en los últimos 30 días."
  );
}

// NUEVO: versión parametrizable (clientes/consumidores)
function renderListaActividadUsuariosEn(listId, actividadesPorUsuario, emptyMsg) {
  const ul = document.getElementById(listId);
  if (!ul) return;

  ul.innerHTML = "";

  if (!actividadesPorUsuario || actividadesPorUsuario.size === 0) {
    const li = document.createElement("li");
    li.textContent = emptyMsg || "Sin datos.";
    ul.appendChild(li);
    return;
  }

  const entries = Array.from(actividadesPorUsuario.entries()).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((acc, [, v]) => acc + v, 0) || 1;

  entries.forEach(([usuario, cant]) => {
    const perc = ((cant * 100) / total).toFixed(1);
    const li = document.createElement("li");
    li.innerHTML = `
      <span class="stats-list-label">${usuario}</span>
      <span class="stats-list-value">${cant} <span class="chip">${perc}%</span></span>
    `;
    ul.appendChild(li);
  });
}

// =========================================================
// PROMEDIO CONTACTOS POR RESPONSABLE: TABLA + GRÁFICO
// - promedio = contactos_30d / clientes_asignados
// - incluye clientes con 0 contactos
// - FLUO en DARK
// =========================================================
function renderPromedioContactosPorResponsable(clientes, actividades30, desdeFecha) {
  const tbody = document.getElementById("tablaPromedioResponsable");
  const canvas = document.getElementById("chartPromedioResponsable");
  if (!tbody) return;

  // Mapa cliente_id -> responsable
  const clienteAResp = new Map();
  // Mapa responsable -> Set(cliente_id)
  const respAClientes = new Map();

  (clientes || []).forEach((c) => {
    const resp = safeTrim(c.responsable, "Sin responsable");
    clienteAResp.set(c.id, resp);
    if (!respAClientes.has(resp)) respAClientes.set(resp, new Set());
    respAClientes.get(resp).add(c.id);
  });

  // Mapa responsable -> contactos en rango
  const respAContactos = new Map();
  (actividades30 || []).forEach((a) => {
    const f = new Date(a.fecha);
    if (Number.isNaN(f.getTime())) return;
    if (desdeFecha && f < desdeFecha) return;

    const resp = clienteAResp.get(a.cliente_id) || "Sin responsable";
    respAContactos.set(resp, (respAContactos.get(resp) || 0) + 1);
  });

  // Construimos filas + dataset
  const rows = [];
  for (const [resp, setIds] of respAClientes.entries()) {
    const clientesAsignados = setIds.size;
    const contactos = respAContactos.get(resp) || 0;
    const promedio = clientesAsignados > 0 ? contactos / clientesAsignados : 0;
    rows.push({ resp, clientesAsignados, contactos, promedio });
  }

  // Orden visual: por promedio desc, y si empatan por contactos desc
  rows.sort((a, b) => (b.promedio - a.promedio) || (b.contactos - a.contactos) || a.resp.localeCompare(b.resp, "es"));

  // Render tabla
  tbody.innerHTML = "";
  rows.forEach((r) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.resp}</td>
      <td>${r.clientesAsignados}</td>
      <td>${r.contactos}</td>
      <td>${r.promedio.toFixed(2)}</td>
    `;
    tbody.appendChild(tr);
  });

  // Render chart
  if (!canvas) return;

  const labels = rows.map((r) => r.resp);
  const data = rows.map((r) => Number(r.promedio.toFixed(2)));

  const dark = isDarkTheme();
  const barColor = dark ? "#00E5FF" : "#3b82f6";

  charts.promedioResp = new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        { label: "Promedio de contactos", data, backgroundColor: barColor, borderRadius: 10 }
      ],
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 0.5 } },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: (ctx) => `Promedio: ${ctx.raw}` },
        },
      },
    },
  });
}

// =========================================================
// INIT
// =========================================================
document.addEventListener("DOMContentLoaded", () => {
  const savedTheme = localStorage.getItem(THEME_KEY) || "light";
  applyTheme(savedTheme);
  applyChartTheme();

  const btnTheme = document.getElementById("btnToggleTheme");
  if (btnTheme) {
    btnTheme.addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme") || "light";
      applyTheme(current === "light" ? "dark" : "light");
      applyChartTheme();
      cargarEstadisticas();
    });
  }

  const btnRefresh = document.getElementById("btnRefrescarStats");
  if (btnRefresh) btnRefresh.addEventListener("click", () => cargarEstadisticas());

  cargarEstadisticas();
});
