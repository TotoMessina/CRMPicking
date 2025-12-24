/* =========================================================
   stats.js (PEGAR TAL CUAL) — TODO DEPENDE DEL SELECT DE LAPSO
   Select único: #statsRange (se inserta en la topbar actions)

   Tablas/columnas (tuyas):
   - clientes(created_at, activo, rubro, estado, responsable, fecha_proximo_contacto, ultima_actividad)
   - consumidores(created_at, activo, estado, responsable, ultima_actividad)
   - actividades(cliente_id, fecha, usuario)
   - actividades_consumidores(consumidor_id, fecha, usuario)

   Requiere:
   - Supabase JS (window.supabase)
   - Chart.js (window.Chart)
========================================================= */

// =========================================================
// CONEXIÓN SUPABASE (COMO PEDISTE)
// =========================================================
const SUPABASE_URL = "https://mflftikcvsnniwwanrkj.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mbGZ0aWtjdnNubml3d2FucmtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NjcyMjAsImV4cCI6MjA3OTE0MzIyMH0.Z_EsaegFay24E0rOoX2PpwvWasWm5tfLcJiRrgs1nBY";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// =========================================================
// CONFIG
// =========================================================
const CFG = {
  tables: {
    clientes: "clientes",
    consumidores: "consumidores",
    actividades: "actividades",
    actividadesConsumidores: "actividades_consumidores"
  },
  pageSize: 1000,
  ranges: [
    { value: "7d", label: "Lapso: 7 días", days: 7 },
    { value: "30d", label: "Lapso: 30 días", days: 30 },
    { value: "60d", label: "Lapso: 60 días", days: 60 },
    { value: "90d", label: "Lapso: 90 días", days: 90 },
    { value: "6m", label: "Lapso: 6 meses", days: 182 },
    { value: "1y", label: "Lapso: 1 año", days: 365 }
  ],
  chartMinHeight: 320
};

// =========================================================
// STATE (Charts)
// =========================================================
const CHARTS = {
  rubros: null,
  estados: null,
  responsables: null,
  promedio: null,
  altas: null,
  estadosConsumidores: null
};

// =========================================================
// HELPERS
// =========================================================
function $(id) { return document.getElementById(id); }
function setText(id, val) { const el = $(id); if (el) el.textContent = val; }
function fmtInt(n) { return (typeof n === "number" && !Number.isNaN(n)) ? n.toLocaleString("es-AR") : "0"; }
function pad2(n) { return String(n).padStart(2, "0"); }
function startOfLocalDay(d) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function addDays(d, days) { const x = new Date(d); x.setDate(x.getDate() + days); return x; }
function toLocalDayKey(dateObj) { return `${dateObj.getFullYear()}-${pad2(dateObj.getMonth()+1)}-${pad2(dateObj.getDate())}`; }
function parseDate(value) { if (!value) return null; const d = new Date(value); return Number.isNaN(d.getTime()) ? null : d; }
function isoFromLocalStart(dateObj) { return startOfLocalDay(dateObj).toISOString(); }
function escapeHtml(s) {
  return String(s)
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");
}

// =========================================================
// SUPABASE (paginado + count)
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
// GROUP / SERIES
// =========================================================
function groupCount(rows, field, emptyLabel = "Sin dato") {
  const m = new Map();
  for (const r of rows) {
    const raw = r?.[field];
    const v = raw != null && String(raw).trim() !== "" ? String(raw).trim() : emptyLabel;
    m.set(v, (m.get(v) || 0) + 1);
  }
  return [...m.entries()].sort((a,b) => b[1]-a[1]);
}

function buildDayBuckets(daysBack) {
  const today = startOfLocalDay(new Date());
  const start = addDays(today, -(daysBack - 1));
  const buckets = [];
  for (let i = 0; i < daysBack; i++) {
    const day = addDays(start, i);
    buckets.push({ key: toLocalDayKey(day), label: `${pad2(day.getDate())}/${pad2(day.getMonth()+1)}` });
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

  return { labels: buckets.map(b => b.label), data: buckets.map(b => map.get(b.key) || 0) };
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
  const found = CFG.ranges.find(r => r.value === v);
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
    try { CHARTS[key].destroy(); } catch (_) {}
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
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true } } }
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
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
    }
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
        { label: bLabel, data: bData, tension: 0.25, fill: false, pointRadius: 2, borderWidth: 2 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: true }, tooltip: { enabled: true } },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
    }
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

  // Ajuste visual de canvases (evita height 0)
  [
    "chartRubros",
    "chartEstados",
    "chartResponsables",
    "chartPromedioResponsable",
    "chartAltasDiarias",
    "chartEstadosConsumidores"
  ].forEach(ensureCanvasHeight);

  // =======================================================
  // CLIENTES
  // =======================================================
  // Total clientes activos (GLOBAL). Si lo querés POR RANGO, cambiá a .gte("created_at", fromISO)
  const totalClientesActivos = await countExact(CFG.tables.clientes, q => q.eq("activo", true));
  setText("statTotalClientes", fmtInt(totalClientesActivos));

  // Agenda (no depende del lapso; es “estado actual” del pipeline)
  const todayDate0 = startOfLocalDay(new Date());
  const in7_0 = addDays(todayDate0, 7);

  const agendaRows = await fetchAll(
    CFG.tables.clientes,
    "fecha_proximo_contacto,activo",
    q => q.eq("activo", true)
  );

  let conFecha = 0, sinFecha = 0, vencidos = 0, proxHoy = 0, prox7 = 0, proxFuturo = 0;
  for (const r of agendaRows) {
    const d = parseDate(r?.fecha_proximo_contacto);
    if (!d) { sinFecha++; continue; }
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

  // Actividades clientes EN RANGO (reemplaza 7d/30d)
  const actInRange = await countExact(CFG.tables.actividades, q => q.gte("fecha", fromISO));
  setText("statAct7", fmtInt(actInRange));   // reusamos estos campos del HTML
  setText("statAct30", fmtInt(actInRange));  // para no tocar HTML

  // Salud cartera EN RANGO (usa ultima_actividad)
  // Activos en rango: ultima_actividad >= fromISO
  const activosEnRango = await countExact(
    CFG.tables.clientes,
    q => q.eq("activo", true).gte("ultima_actividad", fromISO)
  );
  // Dormidos: ultima_actividad < fromISO AND NOT NULL
  const dormidosEnRango = await countExact(
    CFG.tables.clientes,
    q => q.eq("activo", true).lt("ultima_actividad", fromISO).not("ultima_actividad", "is", null)
  );
  // Sin historial: ultima_actividad IS NULL
  const sinHistorial = await countExact(
    CFG.tables.clientes,
    q => q.eq("activo", true).is("ultima_actividad", null)
  );

  setText("statClientesActivos30", fmtInt(activosEnRango));   // reusamos IDs del HTML
  setText("statClientesDormidos30", fmtInt(dormidosEnRango)); // reusamos IDs del HTML
  setText("statSinHistorial", fmtInt(sinHistorial));

  // Distribuciones (actuales, no de rango): rubro/estado/responsable (solo activos)
  const clientesMeta = await fetchAll(
    CFG.tables.clientes,
    "rubro,estado,responsable,activo",
    q => q.eq("activo", true)
  );

  const rub = groupCount(clientesMeta, "rubro", "Sin rubro");
  destroyChart("rubros");
  CHARTS.rubros = makeDoughnut("chartRubros", rub.map(x => x[0]), rub.map(x => x[1]));
  renderUlList("listaRubros", rub.map(([label, count]) => ({ label, value: fmtInt(count) })));

  const est = groupCount(clientesMeta, "estado", "Sin estado");
  destroyChart("estados");
  CHARTS.estados = makeDoughnut("chartEstados", est.map(x => x[0]), est.map(x => x[1]));
  renderUlList("listaEstados", est.map(([label, count]) => ({ label, value: fmtInt(count) })));

  const resp = groupCount(clientesMeta, "responsable", "Sin responsable");
  destroyChart("responsables");
  CHARTS.responsables = makeBar("chartResponsables", resp.map(x => x[0]), resp.map(x => x[1]));
  renderUlList("listaResponsables", resp.map(([label, count]) => ({ label, value: fmtInt(count) })));

  // Promedio contactos por responsable EN RANGO (actividades.usuario en rango / clientes por responsable)
  const clientesActivos = await fetchAll(CFG.tables.clientes, "id,responsable,activo", q => q.eq("activo", true));
  const clientesPorResp = new Map();
  for (const c of clientesActivos) {
    const r = c?.responsable && String(c.responsable).trim() ? String(c.responsable).trim() : "Sin responsable";
    clientesPorResp.set(r, (clientesPorResp.get(r) || 0) + 1);
  }

  const actsRango = await fetchAll(CFG.tables.actividades, "usuario,fecha", q => q.gte("fecha", fromISO));
  const contactosPorUser = new Map();
  for (const a of actsRango) {
    const u = a?.usuario && String(a.usuario).trim() ? String(a.usuario).trim() : "Sin usuario";
    contactosPorUser.set(u, (contactosPorUser.get(u) || 0) + 1);
  }

  const promRows = [];
  for (const [r, cantClientes] of clientesPorResp.entries()) {
    const contactos = contactosPorUser.get(r) || 0;
    promRows.push({ resp: r, clientes: cantClientes, contactos, promedio: (cantClientes ? (contactos / cantClientes) : 0).toFixed(2) });
  }
  promRows.sort((a,b) => Number(b.promedio) - Number(a.promedio));

  destroyChart("promedio");
  CHARTS.promedio = makeBar("chartPromedioResponsable", promRows.map(x => x.resp), promRows.map(x => Number(x.promedio)));
  renderPromedioTable(promRows);

  // Actividad por usuario (clientes) EN RANGO
  const actUsersAgg = groupCount(actsRango, "usuario", "Sin usuario");
  renderUlList("listaActividadUsuarios", actUsersAgg.map(([label, count]) => ({ label, value: fmtInt(count) })));

  // Crecimiento diario EN RANGO (altas por día)
  const [cliAltas, conAltas] = await Promise.all([
    fetchAll(CFG.tables.clientes, "created_at,activo", q => q.eq("activo", true).gte("created_at", fromISO)),
    fetchAll(CFG.tables.consumidores, "created_at,activo", q => q.eq("activo", true).gte("created_at", fromISO))
  ]);

  const sCli = seriesByDay(cliAltas, "created_at", buckets);
  const sCon = seriesByDay(conAltas, "created_at", buckets);

  destroyChart("altas");
  CHARTS.altas = makeLineTwoDatasets("chartAltasDiarias", sCli.labels, "Clientes", sCli.data, "Consumidores", sCon.data);

  const ulAltas = $("listaAltasDiarias");
  if (ulAltas) {
    ulAltas.innerHTML = "";
    const take = Math.min(7, buckets.length);
    for (let i = buckets.length - take; i < buckets.length; i++) {
      const li = document.createElement("li");
      li.innerHTML = `<span>${escapeHtml(buckets[i].label)}</span><strong>Clientes: ${fmtInt(sCli.data[i]||0)} · Consumidores: ${fmtInt(sCon.data[i]||0)}</strong>`;
      ulAltas.appendChild(li);
    }
  }

  // =======================================================
  // CONSUMIDORES
  // =======================================================
  // Total consumidores activos (GLOBAL). Si lo querés POR RANGO, agregá .gte("created_at", fromISO)
  const totalConsActivos = await countExact(CFG.tables.consumidores, q => q.eq("activo", true));
  setText("statTotalConsumidores", fmtInt(totalConsActivos));

  // Actividades consumidores EN RANGO
  const consActInRange = await countExact(CFG.tables.actividadesConsumidores, q => q.gte("fecha", fromISO));
  setText("statConsAct7", fmtInt(consActInRange));   // reusamos IDs del HTML
  setText("statConsAct30", fmtInt(consActInRange));  // reusamos IDs del HTML

  // Estados consumidores (actual, no por rango) — solo activos
  const consRows = await fetchAll(CFG.tables.consumidores, "estado,activo", q => q.eq("activo", true));
  const estCons = groupCount(consRows, "estado", "Sin estado");
  destroyChart("estadosConsumidores");
  CHARTS.estadosConsumidores = makeDoughnut("chartEstadosConsumidores", estCons.map(x=>x[0]), estCons.map(x=>x[1]));
  renderUlList("listaEstadosConsumidores", estCons.map(([label, count]) => ({ label, value: fmtInt(count) })));

  // Actividad por usuario (consumidores) EN RANGO
  const actConsRango = await fetchAll(CFG.tables.actividadesConsumidores, "usuario,fecha", q => q.gte("fecha", fromISO));
  const aggConsUser = groupCount(actConsRango, "usuario", "Sin usuario");
  renderUlList("listaActividadUsuariosConsumidores", aggConsUser.map(([label, count]) => ({ label, value: fmtInt(count) })));
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
