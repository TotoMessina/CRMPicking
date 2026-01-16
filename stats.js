/* =========================================================
   stats.js — catálogo de usuarios desde public.usuarios
   Mantiene históricos desde BD (clientes.responsable / actividades.usuario)
   NO usa localStorage como fuente de “usuarios existentes”.

   Requiere:
   - Supabase JS (window.supabase)
   - Chart.js (window.Chart)
========================================================= */

// =========================================================
// CONEXIÓN SUPABASE
// =========================================================
// =========================================================
// CONEXIÓN SUPABASE (common.js)
// =========================================================
const supabaseClient = window.supabaseClient;

/* ============================
   AUTH - Login Gate
   Requiere auth.js y guard.js idealmente.
============================ */
async function requireAuthOrRedirect() {
  if (window.CRM_GUARD_READY) {
    try {
      await window.CRM_GUARD_READY;
    } catch (_) { }
  }

  if (window.CRM_USER && window.CRM_USER.activo === true) return window.CRM_USER;

  try {
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) throw error;

    const session = data?.session;
    if (!session?.user) {
      window.location.href = "login.html";
      return null;
    }

    if (!window.CRM_USER) {
      const { data: perfil, error: e2 } = await supabaseClient
        .from("usuarios")
        .select("id, email, nombre, role, activo")
        .eq("id", session.user.id)
        .single();

      if (!e2 && perfil && perfil.activo === true) {
        window.CRM_USER = perfil;
      } else {
        window.CRM_USER = {
          id: session.user.id,
          email: session.user.email || "",
          nombre: (session.user.email || "Usuario").split("@")[0],
          role: "user",
          activo: true,
        };
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
  return n || "-";
}

// =========================================================
// CONFIG
// =========================================================
// =========================================================
// CONFIG & THEME
// =========================================================
const CFG = {
  tables: {
    clientes: "clientes",
    consumidores: "consumidores",
    actividades: "actividades",
    actividadesConsumidores: "actividades_consumidores",
    actividadesConsumidores: "actividades_consumidores",
    usuarios: "usuarios",
    repartidores: "repartidores",
  },
  pageSize: 1000,
  ranges: [
    { value: "7d", label: "7 días", days: 7 },
    { value: "30d", label: "30 días", days: 30 },
    { value: "60d", label: "60 días", days: 60 },
    { value: "90d", label: "90 días", days: 90 },
    { value: "6m", label: "6 meses", days: 182 },
    { value: "1y", label: "1 año", days: 365 },
  ],
  chartMinHeight: 320,
};

// Modern Theme Palette
const THEME = {
  colors: {
    primary: '#4f46e5', // Indigo 600
    secondary: '#10b981', // Emerald 500
    accent: '#f59e0b', // Amber 500
    danger: '#ef4444', // Red 500
    info: '#3b82f6', // Blue 500
    slate: '#475569', // Slate 600
    grid: 'rgba(255, 255, 255, 0.05)',
    text: '#94a3b8', // Slate 400
  },
  fontFamily: "'Inter', sans-serif",
};

// =========================================================
// STATE (Charts)
// =========================================================
const CHARTS = {
  rubros: null,
  estados: null,
  creados: null,
  activadoresDia: null,
  activadoresConversion: null,
  promedio: null,
  altas: null,
};

// =========================================================
// HELPERS
// =========================================================
function $(id) {
  return document.getElementById(id);
}
function setText(id, val) {
  const el = $(id);
  if (el) el.textContent = val;
}
function fmtInt(n) {
  return typeof n === "number" && !Number.isNaN(n) ? n.toLocaleString("es-AR") : "0";
}
function pad2(n) {
  return String(n).padStart(2, "0");
}
function startOfLocalDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d, days) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}
function toLocalDayKey(dateObj) {
  return `${dateObj.getFullYear()}-${pad2(dateObj.getMonth() + 1)}-${pad2(dateObj.getDate())}`;
}
function parseDate(value) {
  if (!value) return null;
  // Fix: "YYYY-MM-DD" is parsed as UTC midnight by default in JS. 
  // We want Local Midnight. Appending "T00:00:00" usually forces local parsing in modern browsers,
  // or we can use the constructor with arguments.

  if (typeof value === "string" && value.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}
function isoFromLocalStart(dateObj) {
  return startOfLocalDay(dateObj).toISOString();
}
function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/**
 * Crea un gradiente vertical simple para fondos de chart
 */
function createGradient(ctx, colorStart, colorEnd) {
  const gradient = ctx.createLinearGradient(0, 0, 0, 400);
  gradient.addColorStop(0, colorStart);
  gradient.addColorStop(1, colorEnd);
  return gradient;
}

/**
 * Quita cualquier "(Histórico)" (o variantes) y normaliza espacios.
 */
function cleanName(name) {
  return String(name || "")
    .replace(/\(hist[oó]rico\)/gi, "")
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normName(s) {
  return cleanName(s)
    .normalize("NFKC")
    .toLowerCase();
}

function canonizeName(name, canonMap) {
  const raw = cleanName(name);
  if (!raw) return "";
  const k = normName(raw);
  return canonMap?.get(k) || raw;
}

function displayNameWithHistoricFlag(name, activeSet) {
  const base = cleanName(name);
  if (!base) return "Sin dato";
  const isReal = activeSet?.has(normName(base));
  return isReal ? base : `${base} (Histórico)`;
}

// =========================================================
// SUPABASE (paginado)
// =========================================================
async function fetchAll(table, selectCols, applyFiltersFn) {
  const out = [];
  let from = 0;
  while (true) {
    let q = supabaseClient.from(table).select(selectCols).range(from, from + CFG.pageSize - 1);
    if (typeof applyFiltersFn === "function") q = applyFiltersFn(q);
    const { data, error } = await q;
    if (error) throw error;
    const rows = Array.isArray(data) ? data : [];
    out.push(...rows);
    if (rows.length < CFG.pageSize) break;
    from += CFG.pageSize;
  }
  return out;
}

async function countExact(table, applyFiltersFn) {
  let q = supabaseClient.from(table).select("*", { count: "exact", head: true });
  if (typeof applyFiltersFn === "function") q = applyFiltersFn(q);
  const { count, error } = await q;
  if (error) throw error;
  return typeof count === "number" ? count : 0;
}

// =========================================================
// CATÁLOGO DE USUARIOS
// =========================================================
async function getUserUniverse({ fromISO, toISO } = {}) {
  const activeUsers = [];
  const activeSet = new Set();

  const { data: uData, error: uErr } = await supabaseClient
    .from(CFG.tables.usuarios)
    .select("nombre, activo")
    .eq("activo", true);

  if (!uErr && Array.isArray(uData)) {
    for (const u of uData) {
      const n = cleanName(u?.nombre || "");
      if (!n) continue;
      const k = normName(n);
      if (!activeSet.has(k)) {
        activeSet.add(k);
        activeUsers.push(n);
      }
    }
  }

  const canon = new Map();
  for (const n of activeUsers) canon.set(normName(n), n);

  const histSet = new Set();
  const clientesHist = await fetchAll(CFG.tables.clientes, "responsable,activo", (q) => q.eq("activo", true).not("responsable", "is", null));
  for (const c of clientesHist) {
    const n = cleanName(c?.responsable || "");
    if (n) histSet.add(n);
  }

  const actsHist = await fetchAll(
    CFG.tables.actividades,
    "usuario,fecha",
    (q) => {
      let qq = q.not("usuario", "is", null);
      if (fromISO) qq = qq.gte("fecha", fromISO);
      if (toISO) qq = qq.lt("fecha", toISO); // Strict less than end of day (or lte if inclusive)
      return qq;
    }
  );
  for (const a of actsHist) {
    const n = cleanName(a?.usuario || "");
    if (n) histSet.add(n);
  }

  const historicalUsers = [];
  for (const n of histSet) {
    const k = normName(n);
    if (!activeSet.has(k)) historicalUsers.push(n);
  }
  historicalUsers.sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));

  const universe = [
    ...activeUsers.sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" })),
    ...historicalUsers.map((n) => `${n} (Histórico)`),
  ];

  return { activeUsers, historicalUsers, universe, activeSet, canon };
}

// =========================================================
// GROUP / SERIES
// =========================================================
function groupCount(rows, field, emptyLabel = "Sin dato") {
  const m = new Map();
  for (const r of rows) {
    const raw = r?.[field];
    const v = raw != null && String(raw).trim() !== "" ? String(raw).trim() : emptyLabel;
    m.set(v, (m.get(v) || 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

function buildDayBuckets(startDate, endDate) {
  const buckets = [];
  // Copia segura de start
  let current = new Date(startDate);
  // Asegurar horas 0
  current.setHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  // Safety break: max 366 days to avoid infinite loops
  let count = 0;
  while (current <= end && count < 370) {
    buckets.push({
      key: toLocalDayKey(current),
      label: `${pad2(current.getDate())}/${pad2(current.getMonth() + 1)}`
    });
    // Avanzar 1 dia
    current.setDate(current.getDate() + 1);
    count++;
  }
  return buckets;
}

function seriesByDay(rows, dateField, buckets) {
  const map = new Map();
  for (const b of buckets) map.set(b.key, 0);

  for (const r of rows) {
    const d = parseDate(r?.[dateField]);
    if (!d) continue;
    const key = toLocalDayKey(d);
    if (map.has(key)) map.set(key, (map.get(key) || 0) + 1);
  }
  return { labels: buckets.map((b) => b.label), data: buckets.map((b) => map.get(b.key) || 0) };
}

// =========================================================
// UI: select único
// =========================================================
// =========================================================
// UI: select único
// =========================================================

function syncDatesFromPreset(preset) {
  const fromEl = $("dateFrom");
  const toEl = $("dateTo");
  if (!fromEl || !toEl) return;

  if (preset === "custom") return;

  const found = CFG.ranges.find((r) => r.value === preset);
  if (!found) return;

  const today = new Date();
  const toDate = new Date(today);
  const fromDate = addDays(today, -(found.days - 1));

  fromEl.value = toLocalDayKey(fromDate);
  toEl.value = toLocalDayKey(toDate);
}

function getRangeDates() {
  const fromEl = $("dateFrom");
  const toEl = $("dateTo");

  // Default to 30d if invalid
  if (!fromEl?.value || !toEl?.value) {
    const today = new Date();
    const from = addDays(today, -29);
    return { from: startOfLocalDay(from), to: startOfLocalDay(today) };
  }

  const from = parseDate(fromEl.value);
  const to = parseDate(toEl.value);

  // Fallback if parse fails
  if (!from || !to) {
    const today = new Date();
    const f = addDays(today, -29);
    return { from: startOfLocalDay(f), to: startOfLocalDay(today) };
  }

  return { from: startOfLocalDay(from), to: startOfLocalDay(to) };
}

// =========================================================
// Render helpers (listas / tabla)
// =========================================================
function renderUlList(ulId, items) {
  const ul = $(ulId);
  if (!ul) return;
  ul.innerHTML = "";
  for (const it of items) {
    const li = document.createElement("li");
    li.innerHTML = `<span>${escapeHtml(it.label)}</span><strong>${escapeHtml(String(it.value))}</strong>`;
    ul.appendChild(li);
  }
}

function renderPromedioTable(rows) {
  const tbody = $("tablaPromedioResponsable");
  if (!tbody) return;
  tbody.innerHTML = "";
  for (const r of rows) {
    const tr = document.createElement("tr");
    tr.innerHTML =
      `<td>${escapeHtml(r.resp)}</td>` +
      `<td>${escapeHtml(String(r.clientes))}</td>` +
      `<td>${escapeHtml(String(r.contactos))}</td>` +
      `<td>${escapeHtml(String(r.promedio))}</td>`;
    tbody.appendChild(tr);
  }
}

// =========================================================
// Chart helpers (MODERN)
// =========================================================
function destroyChart(key) {
  if (CHARTS[key]) {
    try {
      CHARTS[key].destroy();
    } catch (_) { }
    CHARTS[key] = null;
  }
}

function ensureCanvasHeight(canvasId) {
  const c = $(canvasId);
  if (!c) return;
  c.style.display = "block";
  c.style.width = "100%";
  c.style.height = `${CFG.chartMinHeight}px`;
  if (c.parentElement) c.parentElement.style.height = `${CFG.chartMinHeight}px`;
}

/**
 * Renders a simple summary table: Category | Total
 */
function renderSummaryTable(containerId, title, dataMap) {
  const container = $(containerId);
  if (!container) return;

  // Convert map to sorted array (Desc)
  const sortedData = [...dataMap.entries()].sort((a, b) => b[1] - a[1]);

  let html = `
    <table class="table-modern table-sm mb-0">
      <thead>
        <tr>
          <th>${title}</th>
          <th class="text-end">Total</th>
        </tr>
      </thead>
      <tbody>
  `;

  if (sortedData.length === 0) {
    html += `<tr><td colspan="2" class="text-center muted">Sin datos</td></tr>`;
  } else {
    for (const [key, val] of sortedData) {
      if (val > 0) {
        html += `
        <tr>
          <td>${key}</td>
          <td class="text-end"><strong>${val}</strong></td>
        </tr>`;
      }
    }
  }

  html += `</tbody></table>`;
  container.innerHTML = html;
}

// Common Chart Options
const COMMON_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: {
        color: THEME.colors.text,
        font: { family: THEME.fontFamily, size: 12 },
        usePointStyle: true,
        boxWidth: 8,
      }
    },
    tooltip: {
      backgroundColor: 'rgba(15, 23, 42, 0.9)',
      titleColor: '#fff',
      bodyColor: '#cbd5e1',
      borderColor: 'rgba(255,255,255,0.1)',
      borderWidth: 1,
      padding: 10,
      cornerRadius: 8,
      displayColors: true,
      usePointStyle: true,
    }
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { color: THEME.colors.text, font: { family: THEME.fontFamily, size: 10 } }
    },
    y: {
      grid: { color: THEME.colors.grid, borderDash: [4, 4] },
      ticks: { color: THEME.colors.text, font: { family: THEME.fontFamily, size: 10 }, beginAtZero: true }
    }
  }
};

function makeDoughnut(canvasId, labels, values) {
  const canvas = $(canvasId);
  if (!canvas) return null;
  ensureCanvasHeight(canvasId);

  // Colores para Dónut (Palette generated)
  const bgColors = [
    THEME.colors.primary,
    THEME.colors.secondary,
    THEME.colors.accent,
    THEME.colors.info,
    THEME.colors.danger,
    '#8b5cf6', // Violet
    '#ec4899', // Pink
    '#6366f1', // Indigo
  ];

  return new Chart(canvas.getContext("2d"), {
    type: "doughnut",
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: bgColors,
        borderWidth: 0,
        hoverOffset: 4
      }]
    },
    options: {
      ...COMMON_OPTIONS,
      cutout: '75%', // Thinner ring
      plugins: {
        ...COMMON_OPTIONS.plugins,
        legend: {
          ...COMMON_OPTIONS.plugins.legend,
          position: 'right' // Clean look
        }
      },
      scales: {
        x: { display: false },
        y: { display: false }
      }
    },
  });
}

function makeBar(canvasId, labels, values) {
  const canvas = $(canvasId);
  if (!canvas) return null;
  ensureCanvasHeight(canvasId);

  return new Chart(canvas.getContext("2d"), {
    type: "bar",
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: THEME.colors.primary,
        borderRadius: 4,
        barPercentage: 0.6,
      }]
    },
    options: {
      ...COMMON_OPTIONS,
      plugins: {
        ...COMMON_OPTIONS.plugins,
        legend: { display: false }
      }
    },
  });
}

function makeLineTwoDatasets(canvasId, labels, aLabel, aData, bLabel, bData) {
  const canvas = $(canvasId);
  if (!canvas) return null;
  ensureCanvasHeight(canvasId);

  const ctx = canvas.getContext("2d");
  const gradA = createGradient(ctx, 'rgba(79, 70, 229, 0.4)', 'rgba(79, 70, 229, 0.0)');
  const gradB = createGradient(ctx, 'rgba(16, 185, 129, 0.4)', 'rgba(16, 185, 129, 0.0)');

  return new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: aLabel,
          data: aData,
          borderColor: THEME.colors.primary,
          backgroundColor: gradA,
          tension: 0.4,
          fill: true,
          pointRadius: 0,
          pointHoverRadius: 6,
          borderWidth: 2
        },
        {
          label: bLabel,
          data: bData,
          borderColor: THEME.colors.secondary,
          backgroundColor: gradB,
          tension: 0.4,
          fill: true,
          pointRadius: 0,
          pointHoverRadius: 6,
          borderWidth: 2
        },
      ],
    },
    options: COMMON_OPTIONS,
  });
}

// =========================================================
// RENDER: TODO según lapso
// =========================================================
async function renderAllByRange() {
  const { from: fromDate, to: toDate } = getRangeDates();

  // fromISO: start of fromDate
  // toISO: start of (toDate + 1 day) -> para usar con less-than si queremos incluir el toDate completo

  const fromISO = isoFromLocalStart(fromDate);

  const nextDay = addDays(toDate, 1);
  const toISO = isoFromLocalStart(nextDay);

  const buckets = buildDayBuckets(fromDate, toDate);

  [
    "chartRubros",
    "chartEstados",
    "chartCreados",
    "chartActivadoresDia",
    "chartActivadoresConversion",
    "chartRubrosPorActivador",
    "chartPromedioResponsable",
    "chartAltasDiarias",
  ].forEach(ensureCanvasHeight);

  // Catálogo de usuarios (activos + históricos del rango)
  const userUniverse = await getUserUniverse({ fromISO });
  const activeUsers = userUniverse.activeUsers;
  const activeSet = userUniverse.activeSet;
  const canon = userUniverse.canon;

  // =======================================================
  // CLIENTES
  // =======================================================
  const totalClientesActivos = await countExact(CFG.tables.clientes, (q) => q.eq("activo", true));
  setText("statTotalClientes", fmtInt(totalClientesActivos));

  // Agenda
  const todayDate0 = startOfLocalDay(new Date());
  const in7_0 = addDays(todayDate0, 7);

  const agendaRows = await fetchAll(CFG.tables.clientes, "fecha_proximo_contacto,activo", (q) => q.eq("activo", true));

  let conFecha = 0,
    sinFecha = 0,
    vencidos = 0,
    proxHoy = 0,
    prox7 = 0,
    proxFuturo = 0;
  for (const r of agendaRows) {
    const d = parseDate(r?.fecha_proximo_contacto);
    if (!d) {
      sinFecha++;
      continue;
    }
    conFecha++;
    const d0 = startOfLocalDay(d);
    if (d0 < todayDate0) vencidos++;
    if (d0.getTime() === todayDate0.getTime()) proxHoy++;
    else if (d0 > todayDate0 && d0 <= in7_0) prox7++;
    else if (d0 > in7_0) proxFuturo++;
  }

  setText("statConFecha", fmtInt(conFecha));
  setText("statVencidos", fmtInt(vencidos));
  setText("statSinFecha", fmtInt(sinFecha));
  setText("statProxHoy", fmtInt(proxHoy));
  setText("statProx7", fmtInt(prox7));
  setText("statProxFuturo", fmtInt(proxFuturo));
  setText("statConFechaText", fmtInt(conFecha));
  setText("statVencidosText", fmtInt(vencidos));
  setText("statSinFechaText", fmtInt(sinFecha));

  // Actividades clientes EN RANGO
  const actInRange = await countExact(CFG.tables.actividades, (q) => q.gte("fecha", fromISO).lt("fecha", toISO));
  setText("statAct7", fmtInt(actInRange));
  setText("statAct30", fmtInt(actInRange));

  // Salud cartera EN RANGO
  const activosEnRango = await countExact(CFG.tables.clientes, (q) => q.eq("activo", true).gte("ultima_actividad", fromISO).lt("ultima_actividad", toISO));
  const dormidosEnRango = await countExact(CFG.tables.clientes, (q) =>
    q.eq("activo", true).lt("ultima_actividad", fromISO).not("ultima_actividad", "is", null)
  );
  const sinHistorial = await countExact(CFG.tables.clientes, (q) => q.eq("activo", true).is("ultima_actividad", null));

  setText("statClientesActivos30", fmtInt(activosEnRango));
  setText("statClientesDormidos30", fmtInt(dormidosEnRango));
  setText("statSinHistorial", fmtInt(sinHistorial));

  // Distribuciones actuales
  const clientesMeta = await fetchAll(CFG.tables.clientes, "rubro,estado,responsable,creado_por,activo", (q) => q.eq("activo", true));

  const rub = groupCount(clientesMeta, "rubro", "Sin rubro");
  destroyChart("rubros");
  CHARTS.rubros = makeDoughnut("chartRubros", rub.map((x) => x[0]), rub.map((x) => x[1]));
  renderUlList("listaRubros", rub.map(([label, count]) => ({ label, value: fmtInt(count) })));

  const est = groupCount(clientesMeta, "estado", "Sin estado");
  destroyChart("estados");
  CHARTS.estados = makeDoughnut("chartEstados", est.map((x) => x[0]), est.map((x) => x[1]));
  renderUlList("listaEstados", est.map(([label, count]) => ({ label, value: fmtInt(count) })));

  // =======================================================
  // Responsables: CANON + FLAG HISTÓRICO SOLO EN RENDER
  // =======================================================
  const respCounts = new Map();

  for (const c of clientesMeta) {
    const rRaw = c?.responsable ? String(c.responsable) : "";
    const canonName = rRaw && rRaw.trim() ? canonizeName(rRaw, canon) : "Sin responsable";
    respCounts.set(canonName, (respCounts.get(canonName) || 0) + 1);
  }

  // Garantizar que todos los usuarios reales aparezcan aunque tengan 0
  for (const u of activeUsers) {
    if (!respCounts.has(u)) respCounts.set(u, 0);
  }

  const respEntries = Array.from(respCounts.entries())
    .map(([name, count]) => {
      const base = cleanName(name) || "Sin responsable";
      const isReal = activeSet.has(normName(base));
      return { name: isReal ? base : `${base} (Histórico)`, count, real: isReal };
    })
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      if (a.real !== b.real) return a.real ? -1 : 1;
      return a.name.localeCompare(b.name, "es", { sensitivity: "base" });
    });

  // destroyChart("responsables");
  // CHARTS.responsables = ... (Removed from UI)
  // renderUlList("listaResponsables", ...);

  // =======================================================
  // Creado Por (Clientes)
  // =======================================================
  const creados = groupCount(clientesMeta, "creado_por", "Desconocido");

  destroyChart("creados");
  CHARTS.creados = makeDoughnut(
    "chartCreados",
    creados.map(x => x[0]),
    creados.map(x => x[1])
  );

  renderUlList(
    "listaCreados",
    creados.map(([label, count]) => ({ label, value: fmtInt(count) }))
  );

  // =======================================================
  // ACTIVADORES (Rendimiento)
  // =======================================================
  // 1. Identificar usuarios con rol 'Activador'
  const { data: usersActivadores } = await supabaseClient
    .from(CFG.tables.usuarios)
    .select("nombre")
    .eq("activo", true)
    .ilike("role", "%activador%"); // Case insensitive match

  const setActivadores = new Set();
  if (usersActivadores) {
    usersActivadores.forEach(u => {
      if (u.nombre) setActivadores.add(normName(u.nombre));
    });
  }

  console.log("Activadores encontrados:", usersActivadores); // Debug

  // 2. Filtrar clientes creados en rango por esos activadores
  // Ya tenemos 'clientesMeta' pero solo tiene "rubro,estado,responsable,creado_por,activo"
  // Necesitamos la FECHA de creacion para el grafico diario.
  // Vamos a hacer fetch extra o usar 'clientsCreatedInRange' si lo tuvieramos.
  // Hacemos un fetch especifico para esto:

  const clientesCreadosRango = await fetchAll(
    CFG.tables.clientes,
    "creado_por,created_at,estado,rubro,interes",
    (q) => q.eq("activo", true).gte("created_at", fromISO).lt("created_at", toISO)
  );

  // Estructura para el gráfico apilado:
  // Key = dayKey, Value = Map(status -> count)
  const dailyStatusMap = new Map();
  // Inicializar dias
  for (const b of buckets) {
    dailyStatusMap.set(b.key, new Map());
  }

  const allFoundStatuses = new Set();

  // Estructuras para breakdowns
  const breakdownPorActivador = new Map();
  const rubrosPorActivador = new Map(); // Activator -> Map<Rubro, Count>
  const allRubrosFound = new Set();

  for (const c of clientesCreadosRango) {
    const creador = cleanName(c.creado_por);
    if (!creador) continue;
    const k = normName(creador);

    // Es activador?
    if (setActivadores.has(k)) {
      // 1. Breakdown Tabla (Total por activador)
      if (!breakdownPorActivador.has(creador)) {
        breakdownPorActivador.set(creador, { total: 0, statuses: {} });
      }
      const entry = breakdownPorActivador.get(creador);
      entry.total++;

      const st = c.estado || "Sin estado";
      entry.statuses[st] = (entry.statuses[st] || 0) + 1;

      allFoundStatuses.add(st);

      // 2. Breakdown Rubros
      const rubro = c.rubro || "Sin Rubro";
      allRubrosFound.add(rubro);

      if (!rubrosPorActivador.has(creador)) {
        rubrosPorActivador.set(creador, new Map());
      }
      const rMap = rubrosPorActivador.get(creador);
      rMap.set(rubro, (rMap.get(rubro) || 0) + 1);


      // 2. Chart (Por dia y estado)
      const d = parseDate(c.created_at);
      if (d) {
        const dk = toLocalDayKey(d);
        if (dailyStatusMap.has(dk)) {
          const dayMap = dailyStatusMap.get(dk);
          dayMap.set(st, (dayMap.get(st) || 0) + 1);
        }
      }
    }
  }

  // Preparar Datasets para Stacked Bar
  const STATUS_COLORS = {
    "1 - Cliente relevado": THEME.colors.slate,
    "2 - Local Visitado No Activo": THEME.colors.danger,
    "3 - Primer Ingreso": THEME.colors.accent,
    "4 - Local Creado": THEME.colors.secondary,
    "5 - Local Visitado Activo": THEME.colors.info,
    "6 - Local No Interesado": "#ef4444",
    "Sin estado": "#cbd5e1"
  };
  const getStatusColor = (st) => STATUS_COLORS[st] || "#a78bfa";

  const sortedStatuses = Array.from(allFoundStatuses).sort();

  const datasets = sortedStatuses.map(st => {
    const data = buckets.map(b => dailyStatusMap.get(b.key)?.get(st) || 0);
    return {
      label: st,
      data: data,
      backgroundColor: getStatusColor(st),
      stack: 'Stack 0',
      borderRadius: 4,
      barPercentage: 0.6,
    };
  });

  // Render Stacked Chart
  // Plugin for Data Labels (Activadores)
  const dataLabelsPluginActivadores = {
    id: 'customDataLabelsActivadores',
    afterDatasetsDraw(chart) {
      const { ctx } = chart;
      chart.data.datasets.forEach((dataset, i) => {
        const meta = chart.getDatasetMeta(i);
        if (meta.hidden) return;
        meta.data.forEach((element, index) => {
          const val = dataset.data[index];
          if (val > 0) {
            const { x, y, base } = element.getProps(['x', 'y', 'base'], true);
            const cachedY = (y + base) / 2;

            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = `bold 11px ${THEME.fontFamily}`;
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = 'rgba(0,0,0,0.8)';
            ctx.shadowBlur = 3;
            // Slightly smaller threshold/size than the main daily chart if bars are thin
            if (Math.abs(base - y) > 12) {
              ctx.fillText(val, x, cachedY);
            }
            ctx.restore();
          }
        });
      });
    }
  };

  destroyChart("activadoresDia");
  const canvasAct = $("chartActivadoresDia");
  if (canvasAct) {
    ensureCanvasHeight("chartActivadoresDia");
    CHARTS.activadoresDia = new Chart(canvasAct.getContext("2d"), {
      type: "bar",
      data: {
        labels: buckets.map(b => b.label),
        datasets: datasets
      },
      plugins: [dataLabelsPluginActivadores],
      options: {
        ...COMMON_OPTIONS,
        plugins: {
          ...COMMON_OPTIONS.plugins,
          tooltip: {
            ...COMMON_OPTIONS.plugins.tooltip,
            mode: 'index',
            intersect: false
          },
          legend: {
            ...COMMON_OPTIONS.plugins.legend,
            position: 'bottom',
            onClick: function (e, legendItem, legend) {
              const index = legendItem.datasetIndex;
              const ci = legend.chart;
              if (ci.isDatasetVisible(index)) {
                ci.hide(index);
                legendItem.hidden = true;
              } else {
                ci.show(index);
                legendItem.hidden = false;
              }
            }
          }
        },
        scales: {
          x: { ...COMMON_OPTIONS.scales.x, stacked: true },
          y: { ...COMMON_OPTIONS.scales.y, stacked: true }
        }
      }
    });
  }

  // Render CONVERSION CHART (Horizontal Bar)
  destroyChart("activadoresConversion");
  const canvasConv = $("chartActivadoresConversion");
  if (canvasConv) {
    ensureCanvasHeight("chartActivadoresConversion");

    // Calculate Conversion Rates
    // "Conversion" = (Status 4 + Status 5) / Total
    const conversionData = [];

    for (const [name, data] of breakdownPorActivador.entries()) {
      const total = data.total || 0;
      if (total === 0) continue;

      let effective = 0;
      // Check exact strings or partials if needed. Using logic from keys.
      // Status keys might be "4 - Local Creado", "5 - Local Visitado Activo"
      for (const stKey in data.statuses) {
        if (stKey.startsWith("4") || stKey.startsWith("5")) {
          effective += data.statuses[stKey];
        }
      }

      const rate = (effective / total) * 100;
      conversionData.push({ name, rate, total, effective });
    }

    // Sort by Rate (High to Low)
    conversionData.sort((a, b) => b.rate - a.rate);

    console.log("Conversion Data:", conversionData); // Debug

    if (conversionData.length === 0) {
      // Show empty state if needed, or just clear
      destroyChart("activadoresConversion");
      return;
    }

    const labels = conversionData.map(d => `${d.name} (${Math.round(d.rate)}%)`);
    const values = conversionData.map(d => d.rate);

    // Gradient Green to Blue
    const ctxConv = canvasConv.getContext("2d");
    const gradConv = createGradient(ctxConv, THEME.colors.secondary, THEME.colors.primary);

    CHARTS.activadoresConversion = new Chart(ctxConv, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [{
          label: "Efectividad %",
          data: values,
          backgroundColor: gradConv,
          borderRadius: 4,
          barPercentage: 0.6,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y', // Horizontal Layout
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            titleColor: '#fff',
            bodyColor: '#cbd5e1',
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label: (ctx) => {
                const item = conversionData[ctx.dataIndex];
                if (!item) return "";
                return `${Math.round(item.rate)}% (${item.effective}/${item.total})`;
              }
            }
          }
        },
        scales: {
          x: {
            // Value Axis (Horizontal)
            min: 0,
            max: 100,
            grid: { color: THEME.colors.grid, borderDash: [4, 4] },
            ticks: {
              color: THEME.colors.text,
              font: { family: THEME.fontFamily, size: 10 },
              callback: (v) => v + '%'
            }
          },
          y: {
            // Category Axis (Vertical)
            grid: { display: false },
            ticks: {
              color: THEME.colors.text,
              font: { family: THEME.fontFamily, size: 11 }
            }
          }
        }
      }
    });
  }

  // Render Table Breakdown (Modern Pills)
  const tbodyActiv = $("tablaActivadoresDetalle");
  if (tbodyActiv) {
    tbodyActiv.innerHTML = "";
    const sortedActivs = [...breakdownPorActivador.entries()].sort((a, b) => b[1].total - a[1].total);

    if (sortedActivs.length === 0) {
      tbodyActiv.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:1rem; color:var(--text-muted)">Sin actividad reciente.</td></tr>';
    } else {
      for (const [name, data] of sortedActivs) {
        const stEntries = Object.entries(data.statuses).sort((a, b) => b[1] - a[1]);
        const stHtml = stEntries.map(([stName, stCount]) => {
          const color = getStatusColor(stName);
          return `<span style="display:inline-block; background:${color}20; color:${color}; border:1px solid ${color}40; padding:2px 8px; border-radius:12px; font-size:0.75rem; margin-right:4px; margin-bottom:2px;">
                        ${escapeHtml(stName.split('-').pop().trim())}: <strong>${stCount}</strong>
                      </span>`;
        }).join("");

        const tr = document.createElement("tr");
        tr.innerHTML = `
             <td>${escapeHtml(name)}</td>
             <td><strong>${fmtInt(data.total)}</strong></td>
             <td>${stHtml}</td>
           `;
        tbodyActiv.appendChild(tr);
      }
    }
  }

  // Render DAILY STACKED BAR Chart (Rubros [Activadores] - TOTAL)
  destroyChart("rubrosPorActivador");
  const canvasRub = $("chartRubrosPorActivador");
  if (canvasRub) {
    ensureCanvasHeight("chartRubrosPorActivador");

    // 1. Group Data by Day + Rubro (All statuses)
    const rubrosTotalDayMap = new Map(); // Rubro -> Map<DayKey, Count>
    const allRubrosTotalFound = new Set();

    for (const c of clientesCreadosRango) {
      const creador = cleanName(c.creado_por);
      if (!creador) continue;
      const k = normName(creador);

      // Only Activators
      if (setActivadores.has(k)) {
        const rubro = c.rubro || "Sin Rubro";
        allRubrosTotalFound.add(rubro);

        const d = parseDate(c.created_at);
        if (d) {
          const dk = toLocalDayKey(d);

          if (!rubrosTotalDayMap.has(rubro)) {
            rubrosTotalDayMap.set(rubro, new Map());
          }
          const dMap = rubrosTotalDayMap.get(rubro);
          dMap.set(dk, (dMap.get(dk) || 0) + 1);
        }
      }
    }

    const allRubrosTotal = Array.from(allRubrosTotalFound);

    // ----------------------------------------------------
    // SORTING & TABLE GENERATION
    // ----------------------------------------------------
    // 1. Calculate totals
    const rubrosTotalsMap = new Map();
    for (const rubro of allRubrosTotal) {
      let total = 0;
      const dMap = rubrosTotalDayMap.get(rubro);
      if (dMap) {
        for (const count of dMap.values()) total += count;
      }
      rubrosTotalsMap.set(rubro, total);
    }

    // 2. Sort Descending
    allRubrosTotal.sort((a, b) => (rubrosTotalsMap.get(b) || 0) - (rubrosTotalsMap.get(a) || 0));

    // 3. Render Table
    renderSummaryTable("tableRubrosTotalContainer", "Rubro", rubrosTotalsMap);


    if (allRubrosTotal.length > 0) {
      // Reuse Color Palette
      const rubroColors = [
        THEME.colors.primary,
        THEME.colors.secondary,
        THEME.colors.accent,
        THEME.colors.danger,
        THEME.colors.info,
        '#8b5cf6', // Violet
        '#ec4899', // Pink
        '#14b8a6', // Teal
        '#f97316', // Orange
        '#6366f1', // Indigo
        '#84cc16', // Lime
      ];

      const datasetsRubrosTotal = allRubrosTotal.map((rubro, idx) => {
        const data = buckets.map(b => {
          const dMap = rubrosTotalDayMap.get(rubro);
          return dMap ? (dMap.get(b.key) || 0) : 0;
        });

        return {
          label: rubro,
          data: data,
          backgroundColor: rubroColors[idx % rubroColors.length],
          stack: 'Stack 0',
        };
      });

      // Customized Data Labels Plugin
      const dataLabelsPluginRubrosTotal = {
        id: 'customDataLabelsRubrosTotal',
        afterDatasetsDraw(chart) {
          const { ctx } = chart;
          chart.data.datasets.forEach((dataset, i) => {
            const meta = chart.getDatasetMeta(i);
            if (meta.hidden) return;
            meta.data.forEach((element, index) => {
              const val = dataset.data[index];
              if (val > 0) {
                const { x, y, base } = element.getProps(['x', 'y', 'base'], true);
                const cachedY = (y + base) / 2;

                ctx.save();
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.font = `bold 12px ${THEME.fontFamily}`;
                ctx.fillStyle = '#ffffff';
                ctx.shadowColor = 'rgba(0,0,0,0.8)';
                ctx.shadowBlur = 3;
                ctx.shadowOffsetX = 1;
                ctx.shadowOffsetY = 1;

                if (Math.abs(base - y) > 14) {
                  ctx.fillText(val, x, cachedY);
                }
                ctx.restore();
              }
            });
          });
        }
      };

      CHARTS.rubrosPorActivador = new Chart(canvasRub.getContext("2d"), {
        type: "bar",
        data: {
          labels: buckets.map(b => b.label),
          datasets: datasetsRubrosTotal
        },
        plugins: [dataLabelsPluginRubrosTotal],
        options: {
          ...COMMON_OPTIONS,
          plugins: {
            ...COMMON_OPTIONS.plugins,
            tooltip: { mode: 'index', intersect: false },
            legend: { ...COMMON_OPTIONS.plugins.legend, position: 'top' }
          },
          scales: {
            x: { ...COMMON_OPTIONS.scales.x, stacked: true },
            y: { ...COMMON_OPTIONS.scales.y, stacked: true, ticks: { ...COMMON_OPTIONS.scales.y.ticks, precision: 0 } }
          }
        }
      });
    }
  }

  // =========================================================
  // Render STACKED BAR Chart (Rubros [Activadores] - SOLO ACTIVOS - DIARIO)
  // =========================================================
  destroyChart("rubrosActivadorActivos");
  const canvasRubActivos = $("chartRubrosActivadorActivos");
  if (canvasRubActivos) {
    ensureCanvasHeight("chartRubrosActivadorActivos");

    // 1. Filter Data & Group by Day + Rubro
    // Structure: Map<Rubro, Map<DayKey, Count>>
    const rubroDayMap = new Map();
    const allRubrosActivosFound = new Set();
    const TARGET_STATUS_PREFIX = "5";

    for (const c of clientesCreadosRango) {
      const creador = cleanName(c.creado_por);
      if (!creador) continue;
      const k = normName(creador);

      if (setActivadores.has(k)) {
        const st = c.estado || "";
        if (st.startsWith(TARGET_STATUS_PREFIX)) {
          const rubro = c.rubro || "Sin Rubro";
          allRubrosActivosFound.add(rubro);

          const d = parseDate(c.created_at);
          if (d) {
            const dk = toLocalDayKey(d);

            if (!rubroDayMap.has(rubro)) {
              rubroDayMap.set(rubro, new Map());
            }
            const dMap = rubroDayMap.get(rubro);
            dMap.set(dk, (dMap.get(dk) || 0) + 1);
          }
        }
      }
    }

    const allRubrosActivos = Array.from(allRubrosActivosFound).sort();

    if (allRubrosActivos.length > 0) {
      // Palette (Same as above)
      const rubroColors = [
        THEME.colors.primary,
        THEME.colors.secondary,
        THEME.colors.accent,
        THEME.colors.danger,
        THEME.colors.info,
        '#8b5cf6', // Violet
        '#ec4899', // Pink
        '#14b8a6', // Teal
        '#f97316', // Orange
        '#6366f1', // Indigo
        '#84cc16', // Lime
      ];

      const datasetsActivos = allRubrosActivos.map((rubro, idx) => {
        // Map over buckets (Days) to ensure chronological order and zeros
        const data = buckets.map(b => {
          const dMap = rubroDayMap.get(rubro);
          return dMap ? (dMap.get(b.key) || 0) : 0;
        });

        return {
          label: rubro,
          data: data,
          backgroundColor: rubroColors[idx % rubroColors.length],
          stack: 'Stack 0',
        };
      });

      // Plugin for Data Labels (IMPROVED VISIBILITY & CENTERING)
      const dataLabelsPluginActivos = {
        id: 'customDataLabelsActivos',
        afterDatasetsDraw(chart) {
          const { ctx } = chart;
          chart.data.datasets.forEach((dataset, i) => {
            const meta = chart.getDatasetMeta(i);
            if (meta.hidden) return;
            meta.data.forEach((element, index) => {
              const val = dataset.data[index];
              if (val > 0) {
                // Get Props. For a vertical bar, x is center width-wise.
                // y is the 'end' of the bar (top for positive).
                // base is the 'start' of the bar (bottom for positive).
                // width is bar width.
                // height is bar length (can be negative if goes down, usually positive for standard bars here).

                // However, Chart.js elements have .getCenterPoint() which is safest.
                // But .getProps returns raw properties.

                const { x, y, base } = element.getProps(['x', 'y', 'base'], true);

                // Calculate vertical center
                // For a standard vertical bar: y is top, base is bottom.
                const cachedY = (y + base) / 2;

                ctx.save();
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                // Increase font size and weight
                ctx.font = `bold 12px ${THEME.fontFamily}`;

                // Color & Shadow for contrast
                ctx.fillStyle = '#ffffff';
                ctx.shadowColor = 'rgba(0,0,0,0.8)';
                ctx.shadowBlur = 3;
                ctx.shadowOffsetX = 1;
                ctx.shadowOffsetY = 1;

                // Draw if height is sufficient
                if (Math.abs(base - y) > 14) {
                  ctx.fillText(val, x, cachedY);
                }
                ctx.restore();
              }
            });
          });
        }
      };

      CHARTS.rubrosActivadorActivos = new Chart(canvasRubActivos.getContext("2d"), {
        type: "bar",
        data: {
          labels: buckets.map(b => b.label), // X-Axis = Days
          datasets: datasetsActivos
        },
        plugins: [dataLabelsPluginActivos],
        options: {
          ...COMMON_OPTIONS,
          plugins: {
            ...COMMON_OPTIONS.plugins,
            tooltip: {
              mode: 'index',
              intersect: false,
              callbacks: {
                // Show total for the day in footer or title?
                // Default stack tooltip is fine.
              }
            },
            legend: { ...COMMON_OPTIONS.plugins.legend, position: 'top' }
          },
          scales: {
            x: {
              ...COMMON_OPTIONS.scales.x,
              stacked: true
            },
            y: {
              ...COMMON_OPTIONS.scales.y,
              stacked: true,
              ticks: { ...COMMON_OPTIONS.scales.y.ticks, precision: 0 }
            }
          }
        }
      });
    }
  }

  // =========================================================
  // Render STACKED BAR Chart (Interés Diario)
  // =========================================================
  destroyChart("interesDiario");
  const canvasInteres = $("chartInteresDiario");
  if (canvasInteres) {
    ensureCanvasHeight("chartInteresDiario");

    // 1. Group Data by Day + Interes
    const interesDayMap = new Map(); // Interes -> Map<DayKey, Count>
    const allInteresFound = new Set();

    for (const c of clientesCreadosRango) {
      const interesRaw = c.interes || "Sin interés";
      const interes = cleanName(interesRaw) || "Sin interés";
      allInteresFound.add(interes);

      const d = parseDate(c.created_at);
      if (d) {
        const dk = toLocalDayKey(d);

        if (!interesDayMap.has(interes)) {
          interesDayMap.set(interes, new Map());
        }
        const dMap = interesDayMap.get(interes);
        dMap.set(dk, (dMap.get(dk) || 0) + 1);
      }
    }

    // Sort Interests: Alto > Medio > Bajo > Others > Sin interés
    const priority = { "Alto": 10, "Medio": 5, "Bajo": 1, "Sin interés": -1 };
    const allInteres = Array.from(allInteresFound).sort((a, b) => {
      const pA = priority[a] !== undefined ? priority[a] : 0;
      const pB = priority[b] !== undefined ? priority[b] : 0;
      return pB - pA;
    });

    if (allInteres.length > 0) {
      // Assign Colors based on Level
      const getInteresColor = (label) => {
        if (label === 'Alto') return THEME.colors.danger;     // Red
        if (label === 'Medio') return THEME.colors.accent;    // Yellow/Amber
        if (label === 'Bajo') return THEME.colors.info;       // Blue
        if (label === 'Sin interés') return THEME.colors.slate;
        return THEME.colors.primary;
      };

      const datasetsInteres = allInteres.map((intLabel) => {
        const data = buckets.map(b => {
          const dMap = interesDayMap.get(intLabel);
          return dMap ? (dMap.get(b.key) || 0) : 0;
        });

        return {
          label: intLabel,
          data: data,
          backgroundColor: getInteresColor(intLabel),
          stack: 'Stack 0',
        };
      });

      // Data Labels Plugin (Centered on Bar)
      const dataLabelsPluginInteres = {
        id: 'customDataLabelsInteres',
        afterDatasetsDraw(chart) {
          const { ctx } = chart;
          chart.data.datasets.forEach((dataset, i) => {
            const meta = chart.getDatasetMeta(i);
            if (meta.hidden) return;
            meta.data.forEach((element, index) => {
              const val = dataset.data[index];
              if (val > 0) {
                const { x, y, base } = element.getProps(['x', 'y', 'base'], true);
                const cachedY = (y + base) / 2;

                ctx.save();
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.font = `bold 12px ${THEME.fontFamily}`;
                ctx.fillStyle = '#ffffff';
                ctx.shadowColor = 'rgba(0,0,0,0.8)';
                ctx.shadowBlur = 3;
                ctx.shadowOffsetX = 1;
                ctx.shadowOffsetY = 1;

                if (Math.abs(base - y) > 14) {
                  ctx.fillText(val, x, cachedY);
                }
                ctx.restore();
              }
            });
          });
        }
      };

      CHARTS.interesDiario = new Chart(canvasInteres.getContext("2d"), {
        type: "bar",
        data: {
          labels: buckets.map(b => b.label),
          datasets: datasetsInteres
        },
        plugins: [dataLabelsPluginInteres],
        options: {
          ...COMMON_OPTIONS,
          plugins: {
            ...COMMON_OPTIONS.plugins,
            tooltip: { mode: 'index', intersect: false },
            legend: { ...COMMON_OPTIONS.plugins.legend, position: 'top' }
          },
          scales: {
            x: { ...COMMON_OPTIONS.scales.x, stacked: true },
            y: { ...COMMON_OPTIONS.scales.y, stacked: true, ticks: { ...COMMON_OPTIONS.scales.y.ticks, precision: 0 } }
          }
        }
      });
    }
  }

  // Clean up old list if exists (legacy)
  const oldList = $("listaActivadoresTotal");
  if (oldList) oldList.innerHTML = "";

  // =======================================================
  // Promedio contactos por responsable EN RANGO (CANON)
  // =======================================================
  const clientesActivos = await fetchAll(CFG.tables.clientes, "id,responsable,activo", (q) => q.eq("activo", true));

  const clientesPorResp = new Map();
  for (const c of clientesActivos) {
    const rRaw = c?.responsable ? String(c.responsable) : "";
    const canonResp = rRaw && rRaw.trim() ? canonizeName(rRaw, canon) : "Sin responsable";
    clientesPorResp.set(canonResp, (clientesPorResp.get(canonResp) || 0) + 1);
  }

  // Asegurar que usuarios reales aparezcan en tabla de promedio
  for (const u of activeUsers) {
    if (!clientesPorResp.has(u)) clientesPorResp.set(u, 0);
  }

  const actsRango = await fetchAll(CFG.tables.actividades, "usuario,fecha", (q) => q.gte("fecha", fromISO).lt("fecha", toISO));

  const contactosPorUser = new Map();
  for (const a of actsRango) {
    const uRaw = a?.usuario ? String(a.usuario) : "";
    const canonUser = uRaw && uRaw.trim() ? canonizeName(uRaw, canon) : "Sin usuario";
    contactosPorUser.set(canonUser, (contactosPorUser.get(canonUser) || 0) + 1);
  }

  const promRows = [];
  for (const [respName, cantClientes] of clientesPorResp.entries()) {
    const base = cleanName(respName) || "Sin responsable";
    const contactos = contactosPorUser.get(respName) || 0;
    const isReal = activeSet.has(normName(base));
    promRows.push({
      resp: isReal ? base : `${base} (Histórico)`,
      clientes: cantClientes,
      contactos,
      promedio: (cantClientes ? contactos / cantClientes : 0).toFixed(2),
      real: isReal,
    });
  }

  promRows.sort((a, b) => {
    const pa = Number(a.promedio);
    const pb = Number(b.promedio);
    if (pb !== pa) return pb - pa;
    if (a.real !== b.real) return a.real ? -1 : 1;
    return a.resp.localeCompare(b.resp, "es", { sensitivity: "base" });
  });

  destroyChart("promedio");
  CHARTS.promedio = makeBar(
    "chartPromedioResponsable",
    promRows.map((x) => x.resp),
    promRows.map((x) => Number(x.promedio))
  );
  renderPromedioTable(promRows);

  // =======================================================
  // Actividad por usuario (clientes) EN RANGO (CANON + FLAG EN RENDER)
  // =======================================================
  const actUsersAgg = new Map();

  // seed: usuarios reales con 0
  for (const u of activeUsers) actUsersAgg.set(u, 0);

  // sumar actividades (canonizando)
  for (const a of actsRango) {
    const uRaw = a?.usuario ? String(a.usuario) : "";
    const canonUser = uRaw && uRaw.trim() ? canonizeName(uRaw, canon) : "Sin usuario";
    actUsersAgg.set(canonUser, (actUsersAgg.get(canonUser) || 0) + 1);
  }

  const actUsersList = Array.from(actUsersAgg.entries())
    .map(([name, count]) => {
      const base = cleanName(name) || "Sin usuario";
      const isReal = activeSet.has(normName(base));
      return { name: isReal ? base : `${base} (Histórico)`, count, real: isReal };
    })
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      if (a.real !== b.real) return a.real ? -1 : 1;
      return a.name.localeCompare(b.name, "es", { sensitivity: "base" });
    });

  renderUlList(
    "listaActividadUsuarios",
    actUsersList.map((x) => ({ label: x.name, value: fmtInt(x.count) }))
  );

  // =======================================================
  // Crecimiento diario EN RANGO
  // =======================================================
  const cliAltas = await fetchAll(CFG.tables.clientes, "created_at,activo", (q) => q.eq("activo", true).gte("created_at", fromISO).lt("created_at", toISO));
  const sCli = seriesByDay(cliAltas, "created_at", buckets);

  destroyChart("altas");
  const canvasAltas = $("chartAltasDiarias");
  if (canvasAltas) {
    ensureCanvasHeight("chartAltasDiarias");
    if (CHARTS.altas) CHARTS.altas.destroy();

    // Solo mostramos Clientes
    const ctx = canvasAltas.getContext("2d");
    const gradient = createGradient(ctx, 'rgba(59, 130, 246, 0.4)', 'rgba(59, 130, 246, 0.0)');

    CHARTS.altas = new Chart(ctx, {
      type: "line",
      data: {
        labels: buckets.map(b => b.label),
        datasets: [
          {
            label: "Clientes Nuevos",
            data: sCli.data,
            tension: 0.4,
            fill: true,
            backgroundColor: gradient,
            borderColor: THEME.colors.info,
            pointRadius: 0,
            pointHoverRadius: 6,
            pointBackgroundColor: "#fff",
            pointBorderColor: THEME.colors.info,
            borderWidth: 2
          }
        ],
      },
      options: COMMON_OPTIONS,
    });
  }

  const ulAltas = $("listaAltasDiarias");
  if (ulAltas) {
    ulAltas.innerHTML = "";
    const take = Math.min(7, buckets.length);
    for (let i = buckets.length - take; i < buckets.length; i++) {
      const val = sCli.data[i] || 0;
      const li = document.createElement("li");
      li.innerHTML = `<span>${escapeHtml(buckets[i].label)}</span> <strong>${fmtInt(val)}</strong>`;
      ulAltas.appendChild(li);
    }
  }

  // =======================================================
  // CONSUMIDORES / REPARTIDORES: REMOVED FOR CLEANUP
  // =======================================================

  // =======================================================
  // INTELLIGENCE / INSIGHTS
  // =======================================================
  calculateInsights({
    cliAltas,
    actInRange: actsRango, // Pasamos las filas reales (actsRango) en lugar del count
    totalClientesActivos,
    activosEnRango: activosEnRango
  }, buckets);
}

// Helper para Insights
function calculateInsights({ cliAltas, actInRange, totalClientesActivos, activosEnRango }, buckets) {
  // 1. Proyección Crecimiento (Clientes)
  // Simple lineal: (Total Nuevos en Rango / Dias Rango) * 90 dias + Total Actual
  // Usamos cliAltas que son ARRAY de objetos {created_at}
  const diasRango = buckets.length || 30;
  const nuevosEnRango = cliAltas.length;
  const tasaDiaria = nuevosEnRango / Math.max(diasRango, 1);

  // Proyectar a 3 meses (90 días)
  const proy3m = Math.round(totalClientesActivos + (tasaDiaria * 90));
  const crecimiento3m = Math.round(tasaDiaria * 90);

  setText("insightProjection", `~${fmtInt(proy3m)} Clientes`);
  setText("insightProjectionMeta", `+${fmtInt(crecimiento3m)} estimados en 90 días (${(tasaDiaria * 30).toFixed(1)}/mes)`);

  // 2. Health Score
  // Ratio: Clientes con actividad reciente / Total Clientes Activos
  let health = 0;
  if (totalClientesActivos > 0) {
    health = Math.round((activosEnRango / totalClientesActivos) * 100);
  }
  const healthEl = $("insightHealthScore");
  if (healthEl) {
    healthEl.textContent = `${health}/100`;
    healthEl.style.color = health >= 70 ? "#4ade80" : (health >= 40 ? "#fbbf24" : "#f87171");
  }

  // 3. Mejor Momento de Contacto (Real)
  // Analizar 'actInRange' (que ahora es actsRango array) buscando patrones de DOW + Hora
  if (Array.isArray(actInRange) && actInRange.length > 0) {
    const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const dayCounts = new Array(7).fill(0);

    const blocks = ["Madrugada", "Mañana", "Mediodía", "Tarde", "Noche"];
    // 0-7, 8-11, 12-13, 14-18, 19-23
    const blockCounts = new Array(5).fill(0);

    for (const act of actInRange) {
      if (!act.fecha) continue;
      const d = new Date(act.fecha);
      const dow = d.getDay(); // 0-6
      const h = d.getHours(); // 0-23

      dayCounts[dow]++;

      let bIdx = 0; // Madrugada
      if (h >= 8 && h < 12) bIdx = 1; // Mañana
      else if (h >= 12 && h < 14) bIdx = 2; // Mediodía
      else if (h >= 14 && h < 19) bIdx = 3; // Tarde
      else if (h >= 19) bIdx = 4; // Noche

      blockCounts[bIdx]++;
    }

    // Find Max Day
    let maxDayIdx = 0;
    for (let i = 1; i < 7; i++) {
      if (dayCounts[i] > dayCounts[maxDayIdx]) maxDayIdx = i;
    }

    // Find Max Block
    let maxBlockIdx = 3; // Default Tarde
    let maxVal = -1;
    for (let i = 0; i < 5; i++) {
      if (blockCounts[i] > maxVal) {
        maxVal = blockCounts[i];
        maxBlockIdx = i;
      }
    }

    const bestDay = days[maxDayIdx];
    const bestBlock = blocks[maxBlockIdx];

    setText("insightBestTime", `${bestDay} - ${bestBlock}`);
  } else {
    setText("insightBestTime", "---");
  }
}

// =========================================================
// UI Wiring
// =========================================================
function wireUi() {
  // ensureGlobalRangeSelect(); // Removed, elements are in HTML

  const presetSel = $("statsRangePreset");
  const dateFrom = $("dateFrom");
  const dateTo = $("dateTo");

  if (presetSel) {
    // Init dates
    syncDatesFromPreset(presetSel.value);

    presetSel.addEventListener("change", () => {
      syncDatesFromPreset(presetSel.value);
    });
  }

  // If user touches dates, switch preset to custom
  const onDateChange = () => {
    if (presetSel) presetSel.value = "custom";
  };
  if (dateFrom) dateFrom.addEventListener("change", onDateChange);
  if (dateTo) dateTo.addEventListener("change", onDateChange);

  // Note: we do NOT auto-refresh on change anymore, user must click Update (per request "posibilidad de ver lapsos de tiempo a gusto" usually implies setting range then searching, avoids heavy queries on every date tick)
  // But original code refreshed on preset change. We can keep that for preset.

  if (presetSel) {
    presetSel.addEventListener("change", async () => {
      // If standard preset, auto-refresh. If custom (via dropdown select?), maybe wait.
      if (presetSel.value !== "custom") {
        try { await renderAllByRange(); } catch (e) { console.error(e); }
      }
    });
  }

  const btn = $("btnRefrescarStats");
  if (btn) {
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      try {
        await renderAllByRange();
      } catch (e) {
        console.error(e);
        alert(`Error al actualizar estadísticas: ${e?.message || e}`);
      } finally {
        btn.disabled = false;
      }
    });
  }
}

// =========================================================
// INIT
// =========================================================
async function initStats() {
  try {
    const profile = await requireAuthOrRedirect();
    if (!profile) return;

    const userEl = document.getElementById("currentUserName");
    if (userEl) userEl.textContent = getAuthUserName();

    if (!window.supabase) throw new Error("Supabase JS no está cargado (window.supabase).");
    if (!window.Chart) throw new Error("Chart.js no está cargado (window.Chart).");

    wireUi();
    await renderAllByRange();
  } catch (e) {
    console.error(e);
    alert(`Error al cargar estadísticas: ${e?.message || e}`);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initStats);
} else {
  initStats();
}
