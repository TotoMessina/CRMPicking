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
    { value: "7d", label: "Lapso: 7 días", days: 7 },
    { value: "30d", label: "Lapso: 30 días", days: 30 },
    { value: "60d", label: "Lapso: 60 días", days: 60 },
    { value: "90d", label: "Lapso: 90 días", days: 90 },
    { value: "6m", label: "Lapso: 6 meses", days: 182 },
    { value: "1y", label: "Lapso: 1 año", days: 365 },
  ],
  chartMinHeight: 320,
};

// =========================================================
// STATE (Charts)
// =========================================================
const CHARTS = {
  rubros: null,
  estados: null,
  responsables: null,
  creados: null, // NUEVO
  promedio: null,
  altas: null,
  estadosConsumidores: null,
  estadosRepartidores: null,
  localidadRepartidores: null,
  localidadRepartidores: null,
  responsableRepartidores: null,
  funnelConsumidores: null,
  funnelRepartidores: null,
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
 * Quita cualquier "(Histórico)" (o variantes) y normaliza espacios.
 * IMPORTANTE: esto evita que el front se “auto-contamine” con labels.
 */
function cleanName(name) {
  return String(name || "")
    .replace(/\(hist[oó]rico\)/gi, "") // elimina "(Histórico)" si ya estaba
    .replace(/\u00A0/g, " ")          // NBSP
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Clave normalizada para comparar/matchear.
 */
function normName(s) {
  return cleanName(s)
    .normalize("NFKC")
    .toLowerCase();
}

/**
 * Canoniza un nombre usando el mapa canon (nombre_normalizado => nombre_real_en_usuarios).
 * - Limpia "(Histórico)" si vino “pegado”.
 * - Si existe usuario real, devuelve el nombre exacto del catálogo (ej: "Tincho").
 * - Si no, devuelve el nombre limpio (sin histórico).
 */
function canonizeName(name, canonMap) {
  const raw = cleanName(name);
  if (!raw) return "";
  const k = normName(raw);
  return canonMap?.get(k) || raw;
}

/**
 * Devuelve label de display SIN duplicar histórico:
 * - si es real -> "Tincho"
 * - si no es real -> "Tincho (Histórico)"
 */
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

    // eslint-disable-next-line no-await-in-loop
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
// Fuente: public.usuarios (activos) + históricos desde BD (sin localStorage)
// =========================================================
async function getUserUniverse({ fromISO } = {}) {
  const activeUsers = []; // catálogo “real”
  const activeSet = new Set(); // normalizado

  // 1) Usuarios reales (activos)
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

  // Mapa canon: nombre_normalizado => nombre_real_en_usuarios
  const canon = new Map();
  for (const n of activeUsers) canon.set(normName(n), n);

  // 2) Históricos desde clientes (responsable)
  const histSet = new Set();
  const clientesHist = await fetchAll(
    CFG.tables.clientes,
    "responsable,activo",
    (q) => q.eq("activo", true).not("responsable", "is", null)
  );
  for (const c of clientesHist) {
    const n = cleanName(c?.responsable || "");
    if (!n) continue;
    // guardamos limpio, no decorado
    histSet.add(n);
  }

  // 3) Históricos desde actividades (usuario) (podés limitar por rango)
  const actsHist = await fetchAll(
    CFG.tables.actividades,
    "usuario,fecha",
    (q) => {
      let qq = q.not("usuario", "is", null);
      if (fromISO) qq = qq.gte("fecha", fromISO);
      return qq;
    }
  );
  for (const a of actsHist) {
    const n = cleanName(a?.usuario || "");
    if (!n) continue;
    histSet.add(n);
  }

  // Construir lista histórica que no está en activos
  const historicalUsers = [];
  for (const n of histSet) {
    const k = normName(n);
    if (!activeSet.has(k)) historicalUsers.push(n);
  }
  historicalUsers.sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));

  // Universo (para selects/otros usos si los agregás): activos + históricos ya marcados
  const universe = [
    ...activeUsers.sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" })),
    ...historicalUsers.map((n) => `${n} (Histórico)`),
  ];

  return {
    activeUsers,
    historicalUsers,
    universe,
    activeSet,
    canon,
  };
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

function buildDayBuckets(daysBack) {
  const today = startOfLocalDay(new Date());
  const start = addDays(today, -(daysBack - 1));
  const buckets = [];
  for (let i = 0; i < daysBack; i++) {
    const day = addDays(start, i);
    buckets.push({ key: toLocalDayKey(day), label: `${pad2(day.getDate())}/${pad2(day.getMonth() + 1)}` });
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
function ensureGlobalRangeSelect() {
  const actions = document.querySelector(".stats-topbar-actions");
  if (!actions) return null;

  let sel = $("statsRange");
  if (sel) return sel;

  sel = document.createElement("select");
  sel.id = "statsRange";
  sel.className = "btn-secundario";
  sel.style.minWidth = "220px";
  sel.style.padding = "10px 12px";
  sel.style.borderRadius = "12px";
  sel.style.border = "1px solid rgba(0,0,0,0.18)";
  sel.style.background = "transparent";
  sel.style.cursor = "pointer";

  for (const r of CFG.ranges) {
    const opt = document.createElement("option");
    opt.value = r.value;
    opt.textContent = r.label;
    sel.appendChild(opt);
  }
  sel.value = "30d";

  const btn = $("btnRefrescarStats");
  if (btn) actions.insertBefore(sel, btn);
  else actions.prepend(sel);

  return sel;
}

function getRangeDays() {
  const sel = $("statsRange");
  const v = sel?.value || "30d";
  const found = CFG.ranges.find((r) => r.value === v);
  return found?.days || 30;
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

function renderFunnelList(id, labels, data) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = "";

  // Calcular % de conversion relativa al paso anterior
  // Paso 1 = 100% (Base)
  // Paso 2 = (P2 / P1) %
  // Paso 3 = (P3 / P2) %

  for (let i = 0; i < labels.length; i++) {
    const count = data[i];
    const prev = i > 0 ? data[i - 1] : 0;
    let rate = "-";
    let color = "var(--text-muted)";

    if (i > 0 && prev > 0) {
      const pct = Math.round((count / prev) * 100);
      rate = `${pct}% conv.`;
      color = pct >= 50 ? "#4ade80" : "#f87171";
    } else if (i === 0) {
      rate = "Base 100%";
    }

    const li = document.createElement("li");
    li.style.display = "flex";
    li.style.justifyContent = "space-between";
    li.style.marginBottom = "4px";
    li.innerHTML = `
            <span>${labels[i]}</span>
            <div style="text-align:right;">
                <strong>${fmtInt(count)}</strong>
                <div style="font-size:0.75rem; color:${color};">${rate}</div>
            </div>
        `;
    el.appendChild(li);
  }
}

function makeFunnelChart(id, labels, data, baseColor) {
  const canvas = $(id);
  if (!canvas) return null;
  ensureCanvasHeight(id);
  const ctx = canvas.getContext("2d");

  // Horizontal Bar simulates Funnel
  return new Chart(ctx, {
    type: "bar",
    indexAxis: 'y', // Horizontal
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Cantidad',
          data: data,
          backgroundColor: baseColor,
          borderRadius: 4,
          barPercentage: 0.6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.raw} prospectos`
          }
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          grid: { display: false }
        },
        y: {
          grid: { display: false }
        }
      },
    },
  });
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
// Chart helpers
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

function makeDoughnut(canvasId, labels, values) {
  const canvas = $(canvasId);
  if (!canvas) return null;
  ensureCanvasHeight(canvasId);
  return new Chart(canvas.getContext("2d"), {
    type: "doughnut",
    data: { labels, datasets: [{ data: values, borderWidth: 1 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true } } },
  });
}

function makeBar(canvasId, labels, values) {
  const canvas = $(canvasId);
  if (!canvas) return null;
  ensureCanvasHeight(canvasId);
  return new Chart(canvas.getContext("2d"), {
    type: "bar",
    data: { labels, datasets: [{ data: values, borderWidth: 1 }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
    },
  });
}

function makeLineTwoDatasets(canvasId, labels, aLabel, aData, bLabel, bData) {
  const canvas = $(canvasId);
  if (!canvas) return null;
  ensureCanvasHeight(canvasId);
  return new Chart(canvas.getContext("2d"), {
    type: "line",
    data: {
      labels,
      datasets: [
        { label: aLabel, data: aData, tension: 0.25, fill: false, pointRadius: 2, borderWidth: 2 },
        { label: bLabel, data: bData, tension: 0.25, fill: false, pointRadius: 2, borderWidth: 2 },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: true }, tooltip: { enabled: true } },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
    },
  });
}

// =========================================================
// RENDER: TODO según lapso
// =========================================================
async function renderAllByRange() {
  const days = getRangeDays();
  const today0 = startOfLocalDay(new Date());
  const fromISO = isoFromLocalStart(addDays(today0, -(days - 1)));
  const buckets = buildDayBuckets(days);

  [
    "chartRubros",
    "chartEstados",
    "chartRubros",
    "chartEstados",
    "chartResponsables",
    "chartCreados", // NUEVO
    "chartPromedioResponsable",
    "chartAltasDiarias",
    "chartAltasDiarias",
    "chartEstadosConsumidores",
    "chartEstadosRepartidores",
    "chartLocalidadRepartidores",
    "chartResponsableRepartidores",
    "chartFunnelConsumidores",
    "chartFunnelRepartidores",
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
  const actInRange = await countExact(CFG.tables.actividades, (q) => q.gte("fecha", fromISO));
  setText("statAct7", fmtInt(actInRange));
  setText("statAct30", fmtInt(actInRange));

  // Salud cartera EN RANGO
  const activosEnRango = await countExact(CFG.tables.clientes, (q) => q.eq("activo", true).gte("ultima_actividad", fromISO));
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

  destroyChart("responsables");
  CHARTS.responsables = makeBar(
    "chartResponsables",
    respEntries.map((x) => x.name),
    respEntries.map((x) => x.count)
  );
  renderUlList(
    "listaResponsables",
    respEntries.map((x) => ({ label: x.name, value: fmtInt(x.count) }))
  );

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

  const actsRango = await fetchAll(CFG.tables.actividades, "usuario,fecha", (q) => q.gte("fecha", fromISO));

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
  const [cliAltas, conAltas, repAltas] = await Promise.all([
    fetchAll(CFG.tables.clientes, "created_at,activo", (q) => q.eq("activo", true).gte("created_at", fromISO)),
    fetchAll(CFG.tables.consumidores, "created_at,activo", (q) => q.eq("activo", true).gte("created_at", fromISO)),
    fetchAll(CFG.tables.repartidores, "created_at", (q) => q.gte("created_at", fromISO)), // Repartidores no tiene soft delete 'activo' en DB original a veces, revisar. Asumimos traer todos o filtrar por estado != null
  ]);

  const sCli = seriesByDay(cliAltas, "created_at", buckets);
  const sCon = seriesByDay(conAltas, "created_at", buckets);
  const sRep = seriesByDay(repAltas, "created_at", buckets);

  destroyChart("altas");
  // Update chart helper for 3 datasets or reuse makeLineTwoDatasets logic manually
  const canvasAltas = $("chartAltasDiarias");
  if (canvasAltas) {
    ensureCanvasHeight("chartAltasDiarias");
    if (CHARTS.altas) CHARTS.altas.destroy();
    CHARTS.altas = new Chart(canvasAltas.getContext("2d"), {
      type: "line",
      data: {
        labels: buckets.map(b => b.label),
        datasets: [
          { label: "Clientes", data: sCli.data, tension: 0.25, fill: false, borderColor: "#36a2eb", backgroundColor: "#36a2eb" },
          { label: "Consumidores", data: sCon.data, tension: 0.25, fill: false, borderColor: "#ff6384", backgroundColor: "#ff6384" },
          { label: "Repartidores", data: sRep.data, tension: 0.25, fill: false, borderColor: "#ffce56", backgroundColor: "#ffce56" }
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: true }, tooltip: { enabled: true } },
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
      },
    });
  }

  const ulAltas = $("listaAltasDiarias");
  if (ulAltas) {
    ulAltas.innerHTML = "";
    const take = Math.min(7, buckets.length);
    for (let i = buckets.length - take; i < buckets.length; i++) {
      const li = document.createElement("li");
      li.innerHTML = `<span>${escapeHtml(buckets[i].label)}</span>
      <small>
      Cli: <strong>${fmtInt(sCli.data[i] || 0)}</strong> · 
      Cons: <strong>${fmtInt(sCon.data[i] || 0)}</strong> · 
      Rep: <strong>${fmtInt(sRep.data[i] || 0)}</strong>
      </small>`;
      ulAltas.appendChild(li);
    }
  }

  // =======================================================
  // CONSUMIDORES
  // =======================================================
  const totalConsActivos = await countExact(CFG.tables.consumidores, (q) => q.eq("activo", true));
  setText("statTotalConsumidores", fmtInt(totalConsActivos));

  const consActInRange = await countExact(CFG.tables.actividadesConsumidores, (q) => q.gte("fecha", fromISO));
  setText("statConsAct7", fmtInt(consActInRange));
  setText("statConsAct30", fmtInt(consActInRange));

  const consRows = await fetchAll(CFG.tables.consumidores, "estado,activo", (q) => q.eq("activo", true));
  const estCons = groupCount(consRows, "estado", "Sin estado");
  destroyChart("estadosConsumidores");
  CHARTS.estadosConsumidores = makeDoughnut(
    "chartEstadosConsumidores",
    estCons.map((x) => x[0]),
    estCons.map((x) => x[1])
  );
  renderUlList("listaEstadosConsumidores", estCons.map(([label, count]) => ({ label, value: fmtInt(count) })));

  // === FUNNEL CONSUMIDORES ===
  // Etapas del pipe: Lead -> Contactado -> Interesado -> Cliente
  // Filtramos por estos estados para el funnel
  const stagesCons = ["Lead", "Contactado", "Interesado", "Cliente"];
  const funnelConsData = stagesCons.map(stage => {
    // Find count in estCons array [["Lead", 10], ...]
    const found = estCons.find(x => x[0] === stage);
    return found ? found[1] : 0;
  });

  destroyChart("funnelConsumidores");
  CHARTS.funnelConsumidores = makeFunnelChart(
    "chartFunnelConsumidores",
    stagesCons,
    funnelConsData,
    "rgba(59, 130, 246, 0.7)" // Azul
  );
  renderFunnelList("listaFunnelConsumidores", stagesCons, funnelConsData);


  // Actividad por usuario (consumidores) EN RANGO (CANON + FLAG EN RENDER)
  const actConsRango = await fetchAll(CFG.tables.actividadesConsumidores, "usuario,fecha", (q) => q.gte("fecha", fromISO));

  const consUsersAgg = new Map();
  for (const u of activeUsers) consUsersAgg.set(u, 0);

  for (const a of actConsRango) {
    const uRaw = a?.usuario ? String(a.usuario) : "";
    const canonUser = uRaw && uRaw.trim() ? canonizeName(uRaw, canon) : "Sin usuario";
    consUsersAgg.set(canonUser, (consUsersAgg.get(canonUser) || 0) + 1);
  }

  const consUsersList = Array.from(consUsersAgg.entries())
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
    "listaActividadUsuariosConsumidores",
    consUsersList.map((x) => ({ label: x.name, value: fmtInt(x.count) }))
  );

  // =======================================================
  // REPARTIDORES
  // =======================================================
  const repRows = await fetchAll(CFG.tables.repartidores, "estado,localidad,responsable", (q) => q); // Traer todos
  setText("statTotalRepartidores", fmtInt(repRows.length));

  // Estados
  const estRep = groupCount(repRows, "estado", "Sin estado");
  destroyChart("estadosRepartidores");
  CHARTS.estadosRepartidores = makeDoughnut("chartEstadosRepartidores", estRep.map(x => x[0]), estRep.map(x => x[1]));
  renderUlList("listaEstadosRepartidores", estRep.map(([label, count]) => ({ label, value: fmtInt(count) })));

  // === FUNNEL REPARTIDORES ===
  // Etapas: Documentación sin gestionar -> Cuenta aun no confirmada -> Cuenta confirmada y repartiendo
  const stagesRep = ["Documentación sin gestionar", "Cuenta aun no confirmada", "Cuenta confirmada y repartiendo"];
  const stagesRepShort = ["Sin gestionar", "No confirmada", "Confirmada/Repartiendo"]; // Etiquetas cortas para gráfico
  const funnelRepData = stagesRep.map(stage => {
    const found = estRep.find(x => x[0] === stage);
    return found ? found[1] : 0;
  });

  destroyChart("funnelRepartidores");
  CHARTS.funnelRepartidores = makeFunnelChart(
    "chartFunnelRepartidores",
    stagesRepShort,
    funnelRepData,
    "rgba(245, 158, 11, 0.7)" // Amarillo/Naranja
  );
  renderFunnelList("listaFunnelRepartidores", stagesRepShort, funnelRepData);


  // Localidades
  const locRep = groupCount(repRows, "localidad", "Sin localidad");
  // Top 10 localidades
  const topLocRep = locRep.slice(0, 10);
  destroyChart("localidadRepartidores");
  CHARTS.localidadRepartidores = makeBar(
    "chartLocalidadRepartidores",
    topLocRep.map(x => x[0]),
    topLocRep.map(x => x[1])
  );
  renderUlList("listaLocalidadRepartidores", topLocRep.map(([label, count]) => ({ label, value: fmtInt(count) })));

  // Responsables
  const respRepMap = new Map();
  // Inicializar usuarios activos en 0
  for (const u of activeUsers) respRepMap.set(u, 0);

  for (const r of repRows) {
    const rRaw = r?.responsable ? String(r.responsable) : "";
    const canonName = rRaw && rRaw.trim() ? canonizeName(rRaw, canon) : "Sin responsable";
    respRepMap.set(canonName, (respRepMap.get(canonName) || 0) + 1);
  }

  const respRepEntries = Array.from(respRepMap.entries())
    .map(([name, count]) => {
      const base = cleanName(name) || "Sin responsable";
      const isReal = activeSet.has(normName(base));
      return { name: isReal ? base : `${base} (Histórico)`, count, real: isReal };
    })
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.name.localeCompare(b.name, "es", { sensitivity: "base" });
    });

  destroyChart("responsableRepartidores");
  CHARTS.responsableRepartidores = makeBar(
    "chartResponsableRepartidores",
    respRepEntries.map(x => x.name),
    respRepEntries.map(x => x.count)
  );
  renderUlList("listaResponsableRepartidores", respRepEntries.map(x => ({ label: x.name, value: fmtInt(x.count) })));

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
  ensureGlobalRangeSelect();

  const sel = $("statsRange");
  if (sel) {
    sel.addEventListener("change", async () => {
      try {
        await renderAllByRange();
      } catch (e) {
        console.error(e);
        alert(`Error al aplicar lapso: ${e?.message || e}`);
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
