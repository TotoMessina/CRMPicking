/* =========================================================
   MAPA CRM (Leaflet + Supabase)
   - Crear: click en mapa o "Registrar donde estoy"
   - Editar/Eliminar: click en marcador
   - Color por ESTADO (mismos nombres que el CRM)
   - Tema: usa localStorage crm_theme (igual que tu app)

   NUEVO:
   - Optimizar ruta entre múltiples clientes (sin API paga):
     * Seleccionás clientes
     * Elegís origen (Mi ubicación / un cliente)
     * Orden recomendado (heurística nearest-neighbor)
     * Dibuja polyline + resumen + abrir en Google Maps
   ========================================================= */

// ========= SUPABASE (copiá los tuyos si difieren) =========
// ========= SUPABASE (common.js) =========
const supabaseClient = window.supabaseClient;

// ========= THEME (igual que Stats/Calendario) =========
const THEME_KEY = "crm_theme";

/* ============================
   AUTH (Supabase) - Login Gate
   Requiere que se carguen auth.js y guard.js en el HTML.
   ============================ */
async function requireAuthOrRedirect() {
  if (window.CRM_GUARD_READY) {
    try { await window.CRM_GUARD_READY; } catch (_) { }
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
      // Intentar usuarios; si no existe, permitir con sesión
      const { data: perfil, error: e2 } = await supabaseClient
        .from("usuarios")
        .select("id, email, nombre, role, activo")
        .eq("id", session.user.id)
        .single();

      if (!e2 && perfil) {
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

      if (window.CRM_USER && window.CRM_USER.activo === true) {
        localStorage.setItem("usuarioActual", (window.CRM_USER.nombre || "").trim());
        // FALLBACK: si guard.js no corrió o no actualizó el DOM, hacerlo aquí
        const userLabel = document.getElementById("currentUserName");
        if (userLabel && userLabel.textContent === "Cargando...") {
          userLabel.textContent = window.CRM_USER.nombre || "Usuario";
        }
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
  return (window.CRM_USER?.nombre || localStorage.getItem("usuarioActual") || "").trim();
}

// ========= ESTADOS (exactos de tu CRM) =========
const ESTADOS = [
  "1 - Cliente relevado",
  "2 - Local Visitado No Activo",
  "3 - Primer Ingreso",
  "4 - Local Creado",
  "5 - Local Visitado Activo",
  "6 - Local No Interesado",
];

// Mapeo de colores
const ESTADO_COLOR = {
  "1 - Cliente relevado": "#ff3d3d",
  "2 - Local Visitado No Activo": "#ff9f1c",
  "3 - Primer Ingreso": "#ffef16ff",
  "4 - Local Creado": "#7700ffff",
  "5 - Local Visitado Activo": "#22ff34ff",
  "6 - Local No Interesado": "#5f5f5fff",
};

// Colors for Interest
const INTERES_COLORS = {
  "Bajo": "#22c55e",   // green-500
  "Medio": "#eab308",  // yellow-500
  "Alto": "#ef4444",   // red-500
  "Sin interés": "#94a3b8" // slate-400
};

// Colors for Contact Style
const ESTILO_COLORS = {
  "Dueño": "#3b82f6",     // blue-500
  "Empleado": "#eab308",  // yellow-500
  "Cerrado": "#9ca3af",   // gray-400
  "Sin definir": "#64748b" // slate-500
};

// ========= Leaflet/map state =========
let map;
let markersLayer;
let myMarker = null;
let myAccuracyCircle = null;

let lastKnownPos = null; // {lat, lng, accuracy, ts}
let recordsCache = [];   // clientes (con coords)
let selectedRouteIds = new Set(); // Persistent selection

// ========= Route state (NUEVO) =========
let routingControl = null;
let routeStopsLayer = null;
let routeBounds = null;
let lastRoute = null; // { origin:{lat,lng,label}, stops:[{id,label,lat,lng}], ordered:[...], totalKm, returnToOrigin }

// ========= DOM (Cliente modal) =========
const elModal = document.getElementById("modalCliente");
const elForm = document.getElementById("formClienteMapa");
const elModalTitle = document.getElementById("modalTitle");
const elBtnCerrarModal = document.getElementById("btnCerrarModal");
const elBtnEliminar = document.getElementById("btnEliminar");
const elBtnGuardar = document.getElementById("btnGuardar");
const elCoordHint = document.getElementById("coordHint");

const btnToggleTheme = document.getElementById("btnToggleTheme");
const btnUbicarme = document.getElementById("btnUbicarme");
const btnRegistrarAqui = document.getElementById("btnRegistrarAqui");
const btnRefrescar = document.getElementById("btnRefrescar");

// ========= DOM (Ruta - NUEVO) =========
const btnOptimizarRuta = document.getElementById("btnOptimizarRuta");
const btnLimpiarRuta = document.getElementById("btnLimpiarRuta");

const elModalRuta = document.getElementById("modalRuta");
const btnCerrarModalRuta = document.getElementById("btnCerrarModalRuta");
const elRouteSearch = document.getElementById("routeSearch");
const elRouteStart = document.getElementById("routeStart");
const elRouteList = document.getElementById("routeList");
const elRouteReturn = document.getElementById("routeReturn");
const elRouteAutoCenter = document.getElementById("routeAutoCenter");
const elRouteCount = document.getElementById("routeCount");
const btnSeleccionarTodos = document.getElementById("btnSeleccionarTodos");
const btnDeseleccionarTodos = document.getElementById("btnDeseleccionarTodos");
const btnGenerarRuta = document.getElementById("btnGenerarRuta");

const elRouteSummary = document.getElementById("routeSummary");
const elRouteMeta = document.getElementById("routeMeta");
const elRouteStops = document.getElementById("routeStops");
const btnAbrirGoogleMaps = document.getElementById("btnAbrirGoogleMaps");
const btnCentrarRuta = document.getElementById("btnCentrarRuta");

// ========= Helpers =========
function escapeHtml(v) {
  return String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(THEME_KEY, theme);
  if (btnToggleTheme) btnToggleTheme.textContent = theme === "dark" ? "Modo día ☀️" : "Modo noche 🌙";
}

function getTheme() {
  return document.documentElement.getAttribute("data-theme") || "light";
}

function toggleTheme() {
  const next = getTheme() === "light" ? "dark" : "light";
  applyTheme(next);
}

function normalizeEstado(raw) {
  if (!raw) return "Sin estado";
  const s = String(raw).trim();
  if (s.toLowerCase() === "3 - primer ingreso") return "3 - Primer Ingreso";
  if (s === "3 - Primer ingreso") return "3 - Primer Ingreso";
  if (/^[1-6]$/.test(s)) return ESTADOS[Number(s) - 1];
  return s;
}

function colorFromEstado(estadoRaw) {
  const est = normalizeEstado(estadoRaw);
  return ESTADO_COLOR[est] || "#94a3b8";
}

function iconForEstado(estadoRaw) {
  const color = colorFromEstado(estadoRaw);
  return L.divIcon({
    className: "",
    html: `<div class="marker-dot" style="background:${color};"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -10],
  });
}

function setModalOpen(open) {
  elModal.style.display = open ? "flex" : "none";
  elModal.setAttribute("aria-hidden", open ? "false" : "true");
}
function setModalRutaOpen(open) {
  elModalRuta.style.display = open ? "flex" : "none";
  elModalRuta.setAttribute("aria-hidden", open ? "false" : "true");
}

function setCoordsHint(lat, lng) {
  if (!elCoordHint) return;
  if (typeof lat === "number" && typeof lng === "number") {
    elCoordHint.textContent = `Lat/Lng: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  } else {
    elCoordHint.textContent = "Lat/Lng: -";
  }
}

function getFormValue(id) {
  const el = document.getElementById(id);
  return el ? el.value : "";
}
function setFormValue(id, v) {
  const el = document.getElementById(id);
  if (el) el.value = v ?? "";
}

function currentISODate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function clientLabel(rec) {
  const n = `${rec?.nombre ?? ""} ${rec?.apellido ?? ""}`.trim();
  return n || "(Sin nombre)";
}

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// ========= Distancias (NUEVO) =========
function haversineKm(a, b) {
  const R = 6371; // km
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;

  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLng / 2);
  const h = s1 * s1 + Math.cos(lat1) * Math.cos(lat2) * s2 * s2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function nearestNeighborOrder(origin, stops) {
  const remaining = stops.slice();
  const ordered = [];
  let current = origin;

  while (remaining.length) {
    let bestIdx = 0;
    let bestDist = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const d = haversineKm(current, remaining[i]);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }

    const next = remaining.splice(bestIdx, 1)[0];
    ordered.push(next);
    current = next;
  }

  return ordered;
}

// ========= Legend =========
function renderLegend() {
  const legend = document.getElementById("legend");
  if (!legend) return;
  legend.innerHTML = "";

  for (const est of ESTADOS) {
    const dot = document.createElement("span");
    dot.className = "legend-dot";
    dot.style.background = colorFromEstado(est);

    const item = document.createElement("span");
    item.className = "legend-item";
    item.appendChild(dot);
    item.appendChild(document.createTextNode(est));

    legend.appendChild(item);
  }
}

// ========= Map init =========
function initMap() {
  map = L.map("map", { zoomControl: true }).setView([-34.62, -58.44], 12);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap",
  }).addTo(map);

  markersLayer = L.layerGroup().addTo(map);

  // NUEVO: capa para paradas de ruta (por arriba de markers)
  routeStopsLayer = L.layerGroup().addTo(map);

  const btnToggleColor = document.getElementById("btnToggleColor");
  if (btnToggleColor) {
    btnToggleColor.addEventListener("click", toggleColorMode);
  }

  map.on("click", (e) => {
    openCreateModalAt(e.latlng.lat, e.latlng.lng);
  });

  // Business Hours Helper
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

  // NUEVO: Sync Slider (Interés)
  const slider = document.getElementById("sliderInteres");
  const label = document.getElementById("labelInteres");
  if (slider && label) {
    const mapVal = { "1": "Bajo", "2": "Medio", "3": "Alto" };
    slider.addEventListener("input", () => {
      const txt = mapVal[slider.value] || "-";
      label.textContent = txt;
      setFormValue("interes", txt);
    });
  }
}

// ========= Geolocation =========
function updateMyLocationMarker(pos) {
  const { lat, lng, accuracy } = pos;
  const latlng = [lat, lng];

  if (!myMarker) {
    myMarker = L.marker(latlng, { title: "Mi ubicación" }).addTo(map);
  } else {
    myMarker.setLatLng(latlng);
  }

  if (!myAccuracyCircle) {
    myAccuracyCircle = L.circle(latlng, {
      radius: Math.max(accuracy || 0, 10),
      weight: 1,
      opacity: 0.5,
      fillOpacity: 0.08,
    }).addTo(map);
  } else {
    myAccuracyCircle.setLatLng(latlng);
    myAccuracyCircle.setRadius(Math.max(accuracy || 0, 10));
  }
}

function locateMe({ center = true } = {}) {
  if (!navigator.geolocation) {
    alert("Tu navegador no soporta geolocalización.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (p) => {
      const lat = p.coords.latitude;
      const lng = p.coords.longitude;
      const accuracy = p.coords.accuracy;
      lastKnownPos = { lat, lng, accuracy, ts: Date.now() };

      updateMyLocationMarker(lastKnownPos);

      if (center) map.setView([lat, lng], 16);

      // NUEVO: si el modal de ruta está abierto, refrescamos el origen (para habilitar “Mi ubicación”)
      if (elModalRuta && elModalRuta.style.display === "flex") {
        rebuildRouteStartOptions();
      }
    },
    (err) => {
      console.error(err);
      alert("No se pudo obtener tu ubicación. Revisá permisos del navegador.");
    },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 5000 }
  );
}

// ========= Modal (Cliente) =========
function resetModalToCreate(lat, lng) {
  setFormValue("clienteId", "");
  setFormValue("lat", lat);
  setFormValue("lng", lng);

  setFormValue("nombre", "");
  setFormValue("nombre_local", "");
  setFormValue("apellido", ""); // hidden, clean just in case
  setFormValue("telefono", "");
  setFormValue("mail", "");
  setFormValue("direccion", "");
  setFormValue("rubro", "");
  setFormValue("horarios_atencion", "");
  setFormValue("responsable", "");
  setFormValue("responsable", "");
  setFormValue("estilo_contacto", "Sin definir");
  setFormValue("interes", "Bajo");

  // Reset Slider
  const slider = document.getElementById("sliderInteres");
  if (slider) {
    slider.value = 1;
    const label = document.getElementById("labelInteres");
    if (label) label.textContent = "Bajo";
  }

  setFormValue("estado", "1 - Cliente relevado");
  setFormValue("cuit", "");
  setFormValue("notas", "");
  setFormValue("fecha_proximo_contacto", "");
  setFormValue("hora_proximo_contacto", "");
  setFormValue("venta_digital", "false");
  setFormValue("venta_digital_cual", "");

  if (document.getElementById("sin_proximo_contacto")) document.getElementById("sin_proximo_contacto").checked = false;
  if (document.getElementById("divVentaDigitalCual")) document.getElementById("divVentaDigitalCual").style.display = "none";

  // Clear helpers
  ["chk_lun", "chk_mar", "chk_mie", "chk_jue", "chk_vie", "chk_sab", "chk_dom"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.checked = false;
  });
  setFormValue("time_apertura", "");
  setFormValue("time_cierre", "");

  elModalTitle.textContent = "Nuevo cliente";
  elBtnGuardar.textContent = "Guardar";
  elBtnEliminar.style.display = "none";
  setCoordsHint(lat, lng);
}

function fillModalForEdit(rec) {
  setFormValue("clienteId", rec.id);
  setFormValue("lat", rec.lat);
  setFormValue("lng", rec.lng);

  setFormValue("nombre", rec.nombre ?? "");
  setFormValue("nombre_local", rec.nombre_local ?? "");
  setFormValue("apellido", rec.apellido ?? "");
  setFormValue("telefono", rec.telefono ?? "");
  setFormValue("mail", rec.mail ?? "");
  setFormValue("direccion", rec.direccion ?? "");
  setFormValue("rubro", rec.rubro ?? "");
  setFormValue("horarios_atencion", rec.horarios_atencion ?? "");
  setFormValue("responsable", rec.responsable ?? "");
  setFormValue("estilo_contacto", rec.estilo_contacto ?? "Sin definir");
  const valInteres = rec.interes || "Bajo";
  setFormValue("interes", valInteres);

  // Set Slider
  const slider = document.getElementById("sliderInteres");
  if (slider) {
    const mapRev = { "Bajo": 1, "Medio": 2, "Alto": 3 };
    slider.value = mapRev[valInteres] || 1;
    const label = document.getElementById("labelInteres");
    if (label) label.textContent = valInteres;
  }

  setFormValue("estado", normalizeEstado(rec.estado) || "4 - Local Creado");

  setFormValue("cuit", rec.cuit ?? "");
  setFormValue("notas", rec.notas ?? "");
  setFormValue("fecha_proximo_contacto", rec.fecha_proximo_contacto ?? "");
  setFormValue("hora_proximo_contacto", rec.hora_proximo_contacto ?? "");

  // Logic for sin_proximo_contacto
  const chkSinProx = document.getElementById("sin_proximo_contacto");
  if (chkSinProx) {
    const sinFecha = !rec.fecha_proximo_contacto && !rec.hora_proximo_contacto;
    chkSinProx.checked = sinFecha;
  }

  // Logic for venta_digital
  const isDigital = !!rec.venta_digital;
  setFormValue("venta_digital", isDigital ? "true" : "false");
  setFormValue("venta_digital_cual", rec.venta_digital_cual ?? "");

  const divCual = document.getElementById("divVentaDigitalCual");
  if (divCual) divCual.style.display = isDigital ? "block" : "none";

  // Reset helpers (we don't parse back from text yet)
  ["chk_lun", "chk_mar", "chk_mie", "chk_jue", "chk_vie", "chk_sab", "chk_dom"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.checked = false;
  });
  setFormValue("time_apertura", "");
  setFormValue("time_cierre", "");

  elModalTitle.textContent = "Editar cliente";
  elBtnGuardar.textContent = "Guardar cambios";
  elBtnEliminar.style.display = "inline-flex";
  setCoordsHint(Number(rec.lat), Number(rec.lng));
}

function openCreateModalAt(lat, lng) {
  resetModalToCreate(lat, lng);
  setModalOpen(true);
  initWizard();
}

function openEditModal(rec) {
  fillModalForEdit(rec);
  setModalOpen(true);
  initWizard();
}

// ========= Supabase CRUD =========
// 9) COLOR MODE & FILTER
let colorMode = "estado"; // "estado" | "creador" | "interes" | "estilo"
let activeFilter = null;  // Value to filter by (or null)
const CREATOR_COLORS = {}; // user -> hex

function getColorForCreator(user) {
  const key = (user || "Desconocido").trim();
  if (!key) return "#94a3b8";
  if (CREATOR_COLORS[key]) return CREATOR_COLORS[key];

  // Hash simple para color consistente
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = key.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00ffffff).toString(16).toUpperCase();
  const hex = "#" + "00000".substring(0, 6 - c.length) + c;

  CREATOR_COLORS[key] = hex;
  return hex;
}

// ========= CRUD =========
async function loadRecords() {
  const { data, error } = await supabaseClient
    .from("clientes")
    .select("id,nombre,nombre_local,apellido,direccion,rubro,estado,responsable,lat,lng,creado_por,created_at,cuit,notas,venta_digital,venta_digital_cual,fecha_proximo_contacto,hora_proximo_contacto,interes,estilo_contacto,status_date,status_history,visitas")
    .eq("activo", true)
    .not("lat", "is", null)
    .not("lng", "is", null)
    .order("created_at", { ascending: false });

  if (error) throw error;

  // 🔥 NORMALIZACIÓN CLAVE
  recordsCache = (data || [])
    .map(r => ({
      ...r,
      lat: Number(r.lat),
      lng: Number(r.lng),
    }))
    .filter(r =>
      Number.isFinite(r.lat) &&
      Number.isFinite(r.lng)
    );

  renderMarkers();

  if (elModalRuta && elModalRuta.style.display === "flex") {
    rebuildRouteUI();
  }
}

async function insertRecord(payload) {
  const { data, error } = await supabaseClient.from("clientes").insert(payload).select().single();
  if (error) throw error;
  return data;
}

async function updateRecord(id, payload) {
  const { data, error } = await supabaseClient
    .from("clientes")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function deleteRecord(id) {
  const { error } = await supabaseClient.from("clientes").update({ activo: false }).eq("id", id);
  if (error) throw error;
}

// ========= Rendering (Marcadores) =========
function renderMarkers() {
  markersLayer.clearLayers();

  for (const rec of recordsCache) {
    // 1. FILTER CHECK
    if (activeFilter) {
      if (colorMode === "creador") {
        const c = (rec.creado_por || "Desconocido").trim(); // Normalize?
        if (c !== activeFilter) continue;
      } else {
        // Mode estado
        const st = normalizeEstado(rec.estado);
        if (st !== activeFilter) continue;
      }
    }

    // Determine Color
    let color = "#94a3b8";
    if (colorMode === "creador") {
      color = getColorForCreator(rec.creado_por);
    } else if (colorMode === "interes") {
      const i = rec.interes || "Bajo";
      color = INTERES_COLORS[i] || INTERES_COLORS["Sin interés"];
      if (activeFilter && i !== activeFilter) continue;
    } else if (colorMode === "estilo") {
      const e = rec.estilo_contacto || "Sin definir";
      color = ESTILO_COLORS[e] || ESTILO_COLORS["Sin definir"];
      if (activeFilter && e !== activeFilter) continue;
    } else {
      color = colorFromEstado(rec.estado);
    }

    // Custom Icon
    const icon = L.divIcon({
      className: "",
      html: `<div class="marker-dot" style="background:${color};"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
      popupAnchor: [0, -10],
    });

    const marker = L.marker([rec.lat, rec.lng], {
      icon: icon,
      title: `${rec.nombre ?? ""}`.trim() || "Cliente",
    });

    const est = normalizeEstado(rec.estado);
    const creador = rec.creado_por || "Desconocido";

    const popupHtml = `
      <div style="min-width:240px">
        <div style="font-weight:700; margin-bottom:6px;">
          ${escapeHtml(rec.nombre ?? "")} ${escapeHtml(rec.apellido ?? "")}
        </div>
        <div><b>Estado:</b> ${escapeHtml(est)}</div>
        <div><b>Creado por:</b> ${escapeHtml(creador)}</div>
        <hr style="margin:6px 0; border:0; border-top:1px solid #eee;">
        <div><b>Tel:</b> ${escapeHtml(rec.telefono ?? "")}</div>
        <div><b>Mail:</b> ${escapeHtml(rec.mail ?? "")}</div>
        <div><b>Dirección:</b> ${escapeHtml(rec.direccion ?? "")}</div>
        <div><b>Rubro:</b> ${escapeHtml(rec.rubro ?? "")}</div>
        <div><b>Responsable:</b> ${escapeHtml(rec.responsable ?? "")}</div>
        
        <div style="margin-top:10px; display:flex; gap:8px; flex-wrap:wrap;">
          <button type="button" class="btn-secundario" data-action="edit" data-id="${rec.id}">Editar</button>
        </div>
      </div>
    `;

    marker.bindPopup(popupHtml);

    marker.on("popupopen", (ev) => {
      const node = ev.popup.getElement();
      if (!node) return;
      const btn = node.querySelector('button[data-action="edit"]');
      if (btn) {
        btn.addEventListener("click", () => {
          openEditModal(rec);
          marker.closePopup();
        });
      }
    });

    marker.addTo(markersLayer);
  }

  renderLegend();
}

// Legend
function renderLegend() {
  const legend = document.getElementById("legend");
  if (!legend) return;
  legend.innerHTML = "";

  const createItem = (label, color) => {
    const dot = document.createElement("span");
    dot.className = "legend-dot";
    dot.style.background = color;

    const item = document.createElement("span");
    item.className = "legend-item";

    // Inactive style if filter is ON and this is NOT the selected one
    if (activeFilter && activeFilter !== label) {
      item.classList.add("inactive");
    }

    item.appendChild(dot);
    item.appendChild(document.createTextNode(label));

    // Interaction
    item.addEventListener("click", () => {
      if (activeFilter === label) {
        activeFilter = null; // Toggle OFF
      } else {
        activeFilter = label; // Toggle ON
      }
      renderMarkers();
    });

    return item;
  };

  if (colorMode === "creador") {
    // Unique creators
    const creators = Array.from(new Set(recordsCache.map(r => (r.creado_por || "Desconocido").trim())));
    creators.sort();

    for (const c of creators) {
      const color = getColorForCreator(c);
      legend.appendChild(createItem(c, color));
    }
  } else if (colorMode === "interes") {
    // Interest levels
    ["Bajo", "Medio", "Alto"].forEach(level => {
      legend.appendChild(createItem(level, INTERES_COLORS[level]));
    });
  } else if (colorMode === "estilo") {
    // Contact Style
    ["Sin definir", "Dueño", "Empleado", "Cerrado"].forEach(level => {
      legend.appendChild(createItem(level, ESTILO_COLORS[level]));
    });
  } else {
    // Normal storage
    for (const est of ESTADOS) {
      const color = colorFromEstado(est);
      legend.appendChild(createItem(est, color));
    }
  }
}

// Toggle logic
function toggleColorMode() {
  if (colorMode === "estado") colorMode = "creador";
  else if (colorMode === "creador") colorMode = "interes";
  else if (colorMode === "interes") colorMode = "estilo";
  else colorMode = "estado";

  activeFilter = null; // Reset filter on mode switch
  renderMarkers(); // re-renders markers & legend

  const btn = document.getElementById("btnToggleColor");
  if (btn) {
    if (colorMode === "estado") btn.textContent = "Ver por Estado";
    else if (colorMode === "creador") btn.textContent = "Ver por Creador";
    else if (colorMode === "interes") btn.textContent = "Ver por Interés";
    else btn.textContent = "Ver por Estilo";
  }
}
// ========= Form submit/delete =========
async function onSubmitForm(e) {
  e.preventDefault();

  const id = getFormValue("clienteId").trim();
  const lat = Number(getFormValue("lat"));
  const lng = Number(getFormValue("lng"));

  const nombre = getFormValue("nombre").trim();
  const nombre_local = getFormValue("nombre_local").trim();
  const telefono = getFormValue("telefono").trim();
  const direccion = getFormValue("direccion").trim();
  const rubro = getFormValue("rubro").trim();

  const responsable = getFormValue("responsable");
  const estilo_contacto = getFormValue("estilo_contacto") || "Sin definir";
  const interes = getFormValue("interes");

  if (!nombre) return alert("El Nombre (Contacto) es obligatorio.");
  if (!nombre_local) return alert("El Nombre del Local es obligatorio.");
  if (!telefono) return alert("El Teléfono es obligatorio.");
  if (!direccion) return alert("La Dirección es obligatoria.");
  if (!rubro) return alert("El Rubro es obligatorio.");

  const estado = normalizeEstado(getFormValue("estado"));
  const cuit = getFormValue("cuit").trim();
  const notas = getFormValue("notas").trim();
  const fechaProx = getFormValue("fecha_proximo_contacto");
  const horaProx = getFormValue("hora_proximo_contacto");
  const sinProximo = document.getElementById("sin_proximo_contacto")?.checked;

  const venta_digital = getFormValue("venta_digital") === "true";
  const venta_digital_cual = getFormValue("venta_digital_cual").trim();

  const payload = {
    nombre,
    nombre_local,
    cuit: cuit || null,
    apellido: getFormValue("apellido").trim() || null,
    telefono,
    mail: getFormValue("mail").trim() || null,
    direccion,
    rubro,
    horarios_atencion: getFormValue("horarios_atencion").trim() || null,
    responsable: getFormValue("responsable").trim() || null,
    interes: getFormValue("interes").trim() || null,
    estilo_contacto: getFormValue("estilo_contacto") || "Sin definir",
    estado,
    fecha_proximo_contacto: fechaProx || null,
    hora_proximo_contacto: horaProx || null,
    notas: notas || null,
    venta_digital,
    venta_digital_cual: venta_digital ? (venta_digital_cual || null) : null,
    lat,
    lng,
    activo: true,
  };

  if (sinProximo) {
    payload.fecha_proximo_contacto = null;
    payload.hora_proximo_contacto = null;
  }

  try {
    elBtnGuardar.disabled = true;

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      alert("No hay coordenadas válidas (lat/lng).");
      return;
    }

    // VERIFICACIÓN DE SESIÓN (Debug RLS)
    const { data: { session }, error: sessErr } = await supabaseClient.auth.getSession();
    if (sessErr || !session) {
      console.error("Session Check Failed:", sessErr || "No session");
      alert("Tu sesión parece haber expirado. Por favor recarga la página (F5) e intenta de nuevo.");
      return;
    }
    // Debug info handling for error block
    const debugUser = session.user.email;

    // --- HISTORY TRACKING (Added) ---
    const nowISO = new Date().toISOString();
    if (id) {
      // UPDATE
      const currentRec = recordsCache.find(r => r.id == id);
      // We can rely on recordsCache because we are editing a marker that was loaded.
      // However, to be safe, if not found (rare), we skip history update or allow default behavior.
      if (currentRec) {
        if (normalizeEstado(currentRec.estado) !== estado) {
          // Changed
          const history = currentRec.status_history || [];
          const oldStatusStart = currentRec.status_date || currentRec.created_at || nowISO;
          history.push({
            status: currentRec.estado,
            start_date: oldStatusStart,
            end_date: nowISO
          });
          payload.status_history = history;
          payload.status_date = nowISO;
        }
      }
    } else {
      payload.status_history = [];
      payload.status_date = nowISO;
      // MAPA: Arranque con 1 visita
      payload.visitas = 1;
    }
    // --------------------------------

    if (!id) {
      // NUEVO: guardar creador
      payload.creado_por = getAuthUserName();
      await insertRecord(payload);
    } else {
      await updateRecord(id, payload);
    }

    setModalOpen(false);
    await loadRecords();
  } catch (err) {
    console.error(err);
    alert(`Error al guardar: ${err.message || JSON.stringify(err)}\n(Usuario: ${window.CRM_USER?.nombre || '?'})`);
  } finally {
    elBtnGuardar.disabled = false;
  }
}

async function onDeleteClick() {
  const id = getFormValue("clienteId").trim();
  if (!id) return;

  const ok = confirm("¿Seguro que querés eliminar este cliente del mapa? (Se marcará como inactivo)");
  if (!ok) return;

  try {
    elBtnEliminar.disabled = true;
    await deleteRecord(id);
    setModalOpen(false);
    await loadRecords();
  } catch (err) {
    console.error(err);
    alert("No se pudo eliminar. Revisá consola.");
  } finally {
    elBtnEliminar.disabled = false;
  }
}

// =========================================================
// RUTAS (NUEVO)
// =========================================================
function getSelectedRouteIds() {
  return Array.from(selectedRouteIds);
}

function updateRouteCount() {
  const n = getSelectedRouteIds().length;
  if (elRouteCount) elRouteCount.textContent = `${n} seleccionados`;
}

function rebuildRouteStartOptions() {
  if (!elRouteStart) return;

  const selectedRecs = recordsCache.filter((r) => selectedRouteIds.has(String(r.id)));

  const prev = elRouteStart.value || "";
  elRouteStart.innerHTML = "";

  // Mi ubicación
  const optMe = document.createElement("option");
  optMe.value = "__me__";
  optMe.textContent = lastKnownPos ? "Mi ubicación (GPS)" : "Mi ubicación (GPS) — primero tocá “Ubicarme”";
  optMe.disabled = !lastKnownPos;
  elRouteStart.appendChild(optMe);

  // Origen en un cliente seleccionado (o en cualquiera, si no hay selección todavía)
  const pool = selectedRecs.length ? selectedRecs : recordsCache;
  const sorted = pool.slice().sort((a, b) => clientLabel(a).localeCompare(clientLabel(b), "es", { sensitivity: "base" }));

  for (const r of sorted) {
    const o = document.createElement("option");
    o.value = r.id;
    o.textContent = `Cliente: ${clientLabel(r)}`;
    elRouteStart.appendChild(o);
  }

  // intentar conservar
  if (prev && Array.from(elRouteStart.options).some((o) => o.value === prev)) elRouteStart.value = prev;
  else elRouteStart.value = lastKnownPos ? "__me__" : (sorted[0]?.id || "__me__");
}

function rebuildRouteList(filterText = "") {
  if (!elRouteList) return;

  const prevSelected = new Set(getSelectedRouteIds());
  elRouteList.innerHTML = "";

  const q = String(filterText || "").trim().toLowerCase();

  const sorted = recordsCache
    .filter(r => Number.isFinite(r.lat) && Number.isFinite(r.lng))
    .sort((a, b) =>
      clientLabel(a).localeCompare(clientLabel(b), "es", { sensitivity: "base" })
    );

  for (const rec of sorted) {
    const label = clientLabel(rec);
    const hay = `${label} ${rec?.direccion ?? ""} ${rec?.rubro ?? ""}`.toLowerCase();

    // Si hay filtro, mostramos solo coincidencias.
    // PERO si ya estaba seleccionado, tal vez queramos mostrarlo igual? 
    // Por ahora: comportamiento standard de filtro (oculta lo que no matchea), 
    // pero la selección se mantiene en el Set.
    if (q && !hay.includes(q)) continue;

    const row = document.createElement("div");
    row.className = "route-item";

    // Checkbox click area wrapper
    row.addEventListener("click", (e) => {
      // Avoid double trigger if clicking directly on checkbox
      if (e.target !== cb) {
        cb.checked = !cb.checked;
        // Trigger change manually
        cb.dispatchEvent(new Event('change'));
      }
    });

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.setAttribute("data-id", rec.id);
    cb.checked = selectedRouteIds.has(String(rec.id));

    cb.addEventListener("change", () => {
      if (cb.checked) {
        selectedRouteIds.add(String(rec.id));
      } else {
        selectedRouteIds.delete(String(rec.id));
      }
      updateRouteCount();
      rebuildRouteStartOptions();

      // Visual feedback for row
      if (cb.checked) row.classList.add("selected");
      else row.classList.remove("selected");
    });

    if (cb.checked) row.classList.add("selected");

    const info = document.createElement("div");
    info.style.pointerEvents = "none"; // clicks pass to row
    info.innerHTML = `
      <strong>${escapeHtml(label)}</strong>
      <div class="muted">${escapeHtml(rec?.direccion ?? "")}</div>
    `;

    row.appendChild(cb);
    row.appendChild(info);
    elRouteList.appendChild(row);
  }

  updateRouteCount();
}

function rebuildRouteUI() {
  rebuildRouteList(elRouteSearch?.value || "");
  rebuildRouteStartOptions();
}

function openRouteModal() {
  if (!recordsCache.length) {
    alert("No hay clientes con coordenadas para armar una ruta.");
    return;
  }
  rebuildRouteUI();
  setModalRutaOpen(true);
}

function clearRoute() {
  if (routingControl) {
    try { map.removeControl(routingControl); } catch (_) { }
    routingControl = null;
  }
  if (routeStopsLayer) routeStopsLayer.clearLayers();
  routeBounds = null;
  lastRoute = null;

  if (elRouteSummary) elRouteSummary.style.display = "none";
}

function addRouteStopMarker(lat, lng, label, idx) {
  const icon = L.divIcon({
    className: "",
    html: `
      <div style="
        width:26px;height:26px;border-radius:999px;
        display:flex;align-items:center;justify-content:center;
        font-weight:700;font-size:12px;
        border:2px solid rgba(255,255,255,0.95);
        background:rgba(2,6,23,0.78);
        color:#fff;
        box-shadow:0 10px 28px rgba(0,0,0,0.22);
      ">${idx}</div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -12],
  });

  const m = L.marker([lat, lng], { icon, title: label });
  m.bindPopup(`<b>${escapeHtml(label)}</b>`);
  routeStopsLayer.addLayer(m);
  return m;
}

function computeRouteTotalKm(origin, orderedStops, returnToOrigin) {
  let total = 0;
  let curr = origin;
  for (const s of orderedStops) {
    total += haversineKm(curr, s);
    curr = s;
  }
  if (returnToOrigin && orderedStops.length) {
    total += haversineKm(curr, origin);
  }
  return total;
}

function renderRouteSummary(route) {
  if (!elRouteSummary || !elRouteMeta || !elRouteStops) return;

  elRouteMeta.innerHTML = "";

  const pill1 = document.createElement("span");
  pill1.className = "pill";
  pill1.textContent = `Origen: ${route.origin.label}`;
  elRouteMeta.appendChild(pill1);

  const pill2 = document.createElement("span");
  pill2.className = "pill";
  pill2.textContent = `Paradas: ${route.ordered.length}`;
  elRouteMeta.appendChild(pill2);

  const pill3 = document.createElement("span");
  pill3.className = "pill";
  pill3.textContent = `Distancia aprox.: ${route.totalKm.toFixed(1)} km`;
  elRouteMeta.appendChild(pill3);

  const pill4 = document.createElement("span");
  pill4.className = "pill";
  pill4.textContent = route.returnToOrigin ? "Cierra circuito: Sí" : "Cierra circuito: No";
  elRouteMeta.appendChild(pill4);

  elRouteStops.innerHTML = "";
  for (const s of route.ordered) {
    const li = document.createElement("li");
    li.textContent = s.label;
    elRouteStops.appendChild(li);
  }

  elRouteSummary.style.display = "block";
}

function buildGoogleMapsDirectionsUrl(route) {
  // Google Maps Directions: origin, destination, waypoints
  // Limit práctico: muchos waypoints puede fallar; manejamos recorte con aviso.
  const origin = `${route.origin.lat},${route.origin.lng}`;

  const ordered = route.ordered.slice();
  if (!ordered.length) return null;

  const destinationStop = route.returnToOrigin ? route.origin : ordered[ordered.length - 1];
  const destination = `${destinationStop.lat},${destinationStop.lng}`;

  // waypoints: todos menos el último (si no volvemos), o todos (si volvemos al origen)
  let waypointsStops = [];
  if (route.returnToOrigin) {
    waypointsStops = ordered;
  } else {
    waypointsStops = ordered.slice(0, -1);
  }

  // Recorte defensivo: 23 waypoints suele ser límite; dejamos 20 para margen.
  const MAX_WAYPOINTS = 20;
  if (waypointsStops.length > MAX_WAYPOINTS) {
    waypointsStops = waypointsStops.slice(0, MAX_WAYPOINTS);
    alert("La ruta tiene demasiadas paradas para Google Maps. Se abrirá con las primeras 20 paradas.");
  }

  const waypoints = waypointsStops.map((s) => `${s.lat},${s.lng}`).join("|");
  const params = new URLSearchParams({
    api: "1",
    origin,
    destination,
    travelmode: "driving",
  });
  if (waypoints) params.set("waypoints", waypoints);

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

function drawRouteOnMap(route, { autoCenter = true } = {}) {
  clearRoute();

  // Create waypoints array
  const waypoints = [];
  waypoints.push(L.latLng(route.origin.lat, route.origin.lng));

  for (const s of route.ordered) {
    waypoints.push(L.latLng(s.lat, s.lng));
  }

  if (route.returnToOrigin && route.ordered.length) {
    waypoints.push(L.latLng(route.origin.lat, route.origin.lng));
  }

  // Use Leaflet Routing Machine
  routingControl = L.Routing.control({
    waypoints: waypoints,
    router: L.Routing.osrmv1({
      serviceUrl: 'https://router.project-osrm.org/route/v1'
    }),
    lineOptions: {
      styles: [{ color: 'blue', opacity: 0.6, weight: 5 }]
    },
    createMarker: function () { return null; }, // No default markers, we use our own
    addWaypoints: false,
    draggableWaypoints: false,
    fitSelectedRoutes: autoCenter,
    show: false // Hide text instructions
  }).addTo(map);

  routingControl.on('routesfound', function (e) {
    const r = e.routes[0];
    if (!r) return;

    // Actualizar bounds para el botón "Centrar"
    routeBounds = L.latLngBounds(r.coordinates);

    // Actualizar resumen con datos REALES de OSRM (distancia en metros -> km)
    const distKm = r.summary.totalDistance / 1000;

    // Re-render summary with real data
    if (lastRoute) {
      lastRoute.totalKm = distKm;
      renderRouteSummary(lastRoute);
    }
  });

  // Ocultar el contenedor de instrucciones (si 'show: false' no basta en versiones viejas)
  // Aunque show:false debería, algunos CSS default lo muestran igual vacío.
  // Podríamos inyectar CSS o simplemente dejarlo.
  // Para asegurar limpieza, forzamos hide via DOM event 'routingstart' o similar si hiciera falta.
  // Pero con show:false suele, en versiones nuevas, no renderizar el panel.



  // marcadores numerados de paradas
  routeStopsLayer.clearLayers();

  // Origen (si es mi ubicación, mostramos un marker especial)
  const originLabel = route.origin.label;
  const originIcon = L.divIcon({
    className: "",
    html: `
      <div style="
        width:28px;height:28px;border-radius:999px;
        display:flex;align-items:center;justify-content:center;
        font-weight:800;font-size:12px;
        border:2px solid rgba(255,255,255,0.95);
        background:rgba(34,255,52,0.75);
        color:#0b1220;
        box-shadow:0 10px 28px rgba(0,0,0,0.22);
      ">O</div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -12],
  });
  const mo = L.marker([route.origin.lat, route.origin.lng], { icon: originIcon, title: originLabel });
  mo.bindPopup(`<b>Origen</b><br>${escapeHtml(originLabel)}`);
  routeStopsLayer.addLayer(mo);

  route.ordered.forEach((s, i) => addRouteStopMarker(s.lat, s.lng, s.label, i + 1));

  if (autoCenter && routeBounds && routeBounds.isValid()) {
    map.fitBounds(routeBounds.pad(0.18));
  }

  renderRouteSummary(route);
  lastRoute = route;
}

function generateRoute() {
  const selectedIds = getSelectedRouteIds();
  if (selectedIds.length < 2) {
    showToast("Seleccioná al menos 2 clientes para optimizar una ruta.", "warning");
    return;
  }

  // Armar stops
  const selected = recordsCache
    .filter(r => selectedIds.includes(String(r.id))) // MATCH STRING
    .map(r => ({
      id: r.id,
      label: clientLabel(r),
      lat: Number(r.lat),
      lng: Number(r.lng),
    }))
    .filter(s =>
      Number.isFinite(s.lat) &&
      Number.isFinite(s.lng)
    );

  if (selected.length < 2) {
    showToast("No hay suficientes clientes con coordenadas válidas.", "warning");
    return;
  }

  // Origen
  const startValue = elRouteStart?.value || "__me__";
  let origin = null;

  if (startValue === "__me__") {
    if (!lastKnownPos) {
      showToast("Primero tocá “Ubicarme” para usar tu ubicación como origen.", "warning");
      return;
    }
    origin = { lat: lastKnownPos.lat, lng: lastKnownPos.lng, label: "Mi ubicación" };
  } else {
    const rec = selected.find((s) => String(s.id) === startValue) || selected[0];
    origin = { lat: rec.lat, lng: rec.lng, label: rec.label };
  }

  // Si el origen es un cliente, lo sacamos de stops (para no duplicar)
  const stops = selected.filter((s) => !(origin.label === s.label && origin.lat === s.lat && origin.lng === s.lng));

  if (!stops.length) {
    showToast("Si el origen es un cliente, necesitás seleccionar al menos otro cliente adicional.", "warning");
    return;
  }

  const ordered = nearestNeighborOrder(origin, stops);
  const returnToOrigin = !!elRouteReturn?.checked;
  const totalKm = computeRouteTotalKm(origin, ordered, returnToOrigin);

  const route = {
    origin,
    stops,
    ordered,
    totalKm,
    returnToOrigin,
  };

  drawRouteOnMap(route, { autoCenter: !!elRouteAutoCenter?.checked });
  setModalRutaOpen(false);
}

// ========= Eventos (Ruta) =========
function wireRouteUi() {
  btnOptimizarRuta?.addEventListener("click", openRouteModal);
  btnLimpiarRuta?.addEventListener("click", clearRoute);

  btnCerrarModalRuta?.addEventListener("click", () => setModalRutaOpen(false));
  elModalRuta?.addEventListener("click", (ev) => {
    if (ev.target === elModalRuta) setModalRutaOpen(false);
  });

  elRouteSearch?.addEventListener("input", () => {
    rebuildRouteList(elRouteSearch.value);
  });

  btnSeleccionarTodos?.addEventListener("click", () => {
    // Agregamos al Set TODOS los clients actualmente visibles (filtrados)
    const q = String(elRouteSearch?.value || "").trim().toLowerCase();

    recordsCache.forEach(rec => {
      // Misma lógica de filtro que rebuildRouteList
      if (Number.isFinite(rec.lat) && Number.isFinite(rec.lng)) {
        const label = clientLabel(rec);
        const hay = `${label} ${rec?.direccion ?? ""} ${rec?.rubro ?? ""}`.toLowerCase();
        if (!q || hay.includes(q)) {
          selectedRouteIds.add(String(rec.id));
        }
      }
    });
    rebuildRouteUI();
  });

  btnDeseleccionarTodos?.addEventListener("click", () => {
    // Limpiamos todo el Set (más intuitivo que solo limpiar visibles)
    selectedRouteIds.clear();
    rebuildRouteUI();
  });

  btnGenerarRuta?.addEventListener("click", generateRoute);

  btnCentrarRuta?.addEventListener("click", () => {
    if (routeBounds && routeBounds.isValid()) map.fitBounds(routeBounds.pad(0.18));
  });

  btnAbrirGoogleMaps?.addEventListener("click", () => {
    if (!lastRoute) return;
    const url = buildGoogleMapsDirectionsUrl(lastRoute);
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  });
}

// ===================================
// WIZARD LOGIC (MAPA)
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

// ========= ZONAS (Manzanas Tachadas) =========
let drawnItems;

// Helper to bind popup
function bindZonePopup(layer, zoneId) {
  const popupContent = document.createElement("div");
  popupContent.style.textAlign = "center";
  popupContent.innerHTML = `
    <div style="margin-bottom:8px; font-weight:bold;">Zona</div>
    <div style="display:flex; flex-direction:column; gap:6px;">
      <button class="btn-secundario btn-small" onclick="updateZoneColor('${zoneId}', '#3b82f6')">🔵 Marcar "Hoy"</button>
      <button class="btn-secundario btn-small" onclick="updateZoneColor('${zoneId}', '#ef4444')">🔴 Marcar "Realizada"</button>
      <button class="btn-secundario btn-small" onclick="updateZoneColor('${zoneId}', '#f97316')">🟠 Marcar "Extra"</button>
      <hr style="width:100%; border:0; border-top:1px solid #ccc; margin:4px 0;">
      <button class="btn-delete btn-small" onclick="deleteZoneById('${zoneId}')">🗑️ Eliminar</button>
    </div>
  `;
  layer.bindPopup(popupContent);
}

// Global functions for popup actions
window.updateZoneColor = async (id, color) => {
  const { error } = await supabaseClient
    .from('zones')
    .update({ color: color })
    .eq('id', id);

  if (error) {
    console.error("Error updating zone:", error);
    showToast("Error al actualizar zona.", "error");
    return;
  }

  // Find layer and update style
  drawnItems.eachLayer(layer => {
    if (layer.zoneId == id) {
      layer.setStyle({ color: color });
      layer.closePopup();
    }
  });
  showToast("Zona actualizada.", "success");
};

window.deleteZoneById = async (id) => {
  if (!confirm("¿Eliminar esta zona?")) return;

  const { error } = await supabaseClient
    .from('zones')
    .delete()
    .eq('id', id);

  if (error) {
    console.error("Error deleting zone:", error);
    showToast("Error al eliminar zona.", "error");
    return;
  }

  drawnItems.eachLayer(layer => {
    if (layer.zoneId == id) {
      drawnItems.removeLayer(layer);
    }
  });
  showToast("Zona eliminada.", "success");
};

function initDrawControl() {
  drawnItems = new L.FeatureGroup();
  map.addLayer(drawnItems);

  const drawControl = new L.Control.Draw({
    draw: {
      polygon: {
        allowIntersection: false,
        showArea: true,
        shapeOptions: {
          color: '#ef4444', // Red
          fillOpacity: 0.4
        }
      },
      marker: false,
      polyline: false,
      circle: false,
      circlemarker: false,
      rectangle: {
        shapeOptions: {
          color: '#ef4444',
          fillOpacity: 0.4
        }
      }
    },
    edit: {
      featureGroup: drawnItems,
      remove: true,
      edit: false // Simplification: only add/remove for now
    }
  });
  map.addControl(drawControl);

  map.on(L.Draw.Event.CREATED, async function (e) {
    const layer = e.layer;

    // Determine color based on selection
    const zoneType = document.getElementById("zoneTypeSelect")?.value || "today";
    let color = "#3b82f6"; // Default Blue
    if (zoneType === "done") color = "#ef4444";
    if (zoneType === "extra") color = "#f97316";


    layer.setStyle({ color: color, fillOpacity: 0.4 });
    drawnItems.addLayer(layer);

    // Save to DB
    const shape = layer.toGeoJSON();
    const coords = shape.geometry.coordinates[0].map(p => ({ lat: p[1], lng: p[0] }));

    if (!coords || coords.length < 3) return;

    const { data, error } = await supabaseClient
      .from('zones')
      .insert([{
        coordinates: coords,
        color: color,
        scope: 'client_map', // Scoped to Client Map
        created_at: new Date()
      }])
      .select();

    if (error) {
      console.error("Error saving zone:", error);
      alert("Error al guardar la zona.");
      drawnItems.removeLayer(layer);
    } else {
      const newId = data[0].id;
      layer.zoneId = newId;
      bindZonePopup(layer, newId);
    }
  });

  map.on(L.Draw.Event.DELETED, async function (e) {
    const layers = e.layers;
    layers.eachLayer(async function (layer) {
      if (layer.zoneId) {
        const { error } = await supabaseClient
          .from('zones')
          .delete()
          .eq('id', layer.zoneId);

        if (error) console.error("Error deleting zone:", error);
      }
    });
  });
}

async function loadZones() {
  const { data, error } = await supabaseClient
    .from('zones')
    .select('*')
    .eq('scope', 'client_map'); // Only load client map zones

  if (error) {
    console.error("Error loading zones:", error);
    return;
  }

  data.forEach(zone => {
    if (!zone.coordinates) return;
    const polygon = L.polygon(zone.coordinates, {
      color: zone.color || '#ef4444',
      fillOpacity: 0.4
    });
    polygon.zoneId = zone.id;
    bindZonePopup(polygon, zone.id);

    drawnItems.addLayer(polygon);
  });
}

// ========= Init =========
document.addEventListener("DOMContentLoaded", async () => {
  const profile = await requireAuthOrRedirect();
  if (!profile) return;

  // Theme
  const savedTheme = localStorage.getItem(THEME_KEY) || "light";
  applyTheme(savedTheme);



  // Modal cliente close
  elBtnCerrarModal?.addEventListener("click", () => setModalOpen(false));
  elModal?.addEventListener("click", (ev) => {
    if (ev.target === elModal) setModalOpen(false);
  });

  // Form cliente
  elForm?.addEventListener("submit", onSubmitForm);
  elBtnEliminar?.addEventListener("click", onDeleteClick);

  // Map
  initMap();
  renderLegend();

  // Acciones
  btnUbicarme?.addEventListener("click", () => locateMe({ center: true }));
  btnRegistrarAqui?.addEventListener("click", () => {
    if (!lastKnownPos) {
      locateMe({ center: true });
      showToast("Primero obtengamos tu ubicación. Tocá 'Registrar donde estoy' nuevamente.", "info");
      return;
    }
    openCreateModalAt(lastKnownPos.lat, lastKnownPos.lng);
  });

  btnRefrescar?.addEventListener("click", async () => {
    try {
      await loadRecords();
      showToast("Mapa actualizado.", "success");
    } catch (e) {
      console.error(e);
      showToast("No se pudo refrescar.", "error");
    }
  });

  // NUEVO: rutas
  wireRouteUi();

  // Wizard Buttons
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

  // NUEVO: Venta digital toggle logic
  const selVenta = document.getElementById("venta_digital");
  const divCual = document.getElementById("divVentaDigitalCual");
  if (selVenta && divCual) {
    selVenta.addEventListener("change", () => {
      divCual.style.display = (selVenta.value === "true") ? "block" : "none";
    });
  }

  // Quick Date Buttons
  const btnHoy = document.getElementById("mapBtnQuickHoy");
  if (btnHoy) btnHoy.addEventListener("click", () => setQuickDate(0));

  const btnManiana = document.getElementById("mapBtnQuickManiana");
  if (btnManiana) btnManiana.addEventListener("click", () => setQuickDate(1));

  const btnProxSemana = document.getElementById("mapBtnQuickProxSemana");
  if (btnProxSemana) btnProxSemana.addEventListener("click", () => setQuickDate(7));

  // Cargar data + ubicar (opcional)
  try {
    await loadRecords();

    // Zonas
    initDrawControl();
    await loadZones();
  } catch (err) {
    console.error(err);
    showToast("No se pudieron cargar los datos.", "error");
  }

  // Ubicación inicial (no obliga)
  locateMe({ center: false });
});
