/* =========================================================
   MAPA CRM (Leaflet + Supabase)
   - Crear: click en mapa o "Registrar donde estoy"
   - Editar/Eliminar: click en marcador
   - Color por ESTADO (mismos nombres que el CRM)
   - Tema: usa localStorage crm_theme (igual que tu app)
   ========================================================= */

// ========= SUPABASE (copiá los tuyos si difieren) =========
// En tus archivos se usa este patrón:
const SUPABASE_URL = "https://mflftikcvsnniwwanrkj.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mbGZ0aWtjdnNubml3d2FucmtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NjcyMjAsImV4cCI6MjA3OTE0MzIyMH0.Z_EsaegFay24E0rOoX2PpwvWasWm5tfLcJiRrgs1nBY";

const supabaseClient = (window.CRM_AUTH && window.CRM_AUTH.supabaseClient)
  ? window.CRM_AUTH.supabaseClient
  : supabase.createClient(SUPABASE_URL, SUPABASE_KEY);


// ========= THEME (igual que Stats/Calendario) =========
const THEME_KEY = "crm_theme";


/* ============================
   AUTH (Supabase) - Login Gate
   Requiere que se carguen auth.js y guard.js en el HTML.
   ============================ */
async function requireAuthOrRedirect() {
  if (window.CRM_GUARD_READY) {
    try { await window.CRM_GUARD_READY; } catch (_) {}
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

// Mapeo de colores (alineado con tu styles.css en dark: fluo-red/orange/lime/cyan/mint/violet)
const ESTADO_COLOR = {
  "1 - Cliente relevado": "#ff3d3d", // red
  "2 - Local Visitado No Activo": "#ff9f1c", // orange
  "3 - Primer Ingreso": "#ffef16ff", // lime
  "4 - Local Creado": "#7700ffff", // cyan
  "5 - Local Visitado Activo": "#22ff34ff", // mint
  "6 - Local No Interesado": "#5f5f5fff", // violet
};

// ========= Leaflet/map state =========
let map;
let markersLayer;
let myMarker = null;
let myAccuracyCircle = null;

let lastKnownPos = null; // {lat, lng, accuracy, ts}
let recordsCache = []; // clientes

// ========= DOM =========
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
  if (btnToggleTheme) btnToggleTheme.textContent = theme === "dark" ? "Modo día" : "Modo noche";
}

function getTheme() {
  return document.documentElement.getAttribute("data-theme") || "light";
}

function toggleTheme() {
  const next = getTheme() === "light" ? "dark" : "light";
  applyTheme(next);
  // opcional: re-render markers para asegurar contraste (acá no hace falta)
}

function normalizeEstado(raw) {
  if (!raw) return "Sin estado";

  const s = String(raw).trim();

  // Normalizaciones que ya aparecen en tu app (por compatibilidad)
  if (s.toLowerCase() === "3 - primer ingreso") return "3 - Primer Ingreso";
  if (s === "3 - Primer ingreso") return "3 - Primer Ingreso";

  // Si viene sólo "1".."6" lo convertimos a etiqueta CRM
  if (/^[1-6]$/.test(s)) return ESTADOS[Number(s) - 1];

  // Si viene "1 - Cliente relevado" etc lo dejamos
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
  map = L.map("map", {
    zoomControl: true,
  }).setView([-34.62, -58.44], 12); // fallback (CABA) - se ajusta con "Ubicarme"

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap",
  }).addTo(map);

  markersLayer = L.layerGroup().addTo(map);

  map.on("click", (e) => {
    openCreateModalAt(e.latlng.lat, e.latlng.lng);
  });
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
    },
    (err) => {
      console.error(err);
      alert("No se pudo obtener tu ubicación. Revisá permisos del navegador.");
    },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 5000 }
  );
}

// ========= Modal open/fill =========
function resetModalToCreate(lat, lng) {
  setFormValue("clienteId", "");
  setFormValue("lat", lat);
  setFormValue("lng", lng);

  setFormValue("nombre", "");
  setFormValue("apellido", "");
  setFormValue("telefono", "");
  setFormValue("mail", "");
  setFormValue("direccion", "");
  setFormValue("rubro", "");
  setFormValue("responsable", "");
  setFormValue("estado", "4 - Local Creado"); // default razonable
  setFormValue("fecha_contacto", currentISODate());

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
  setFormValue("apellido", rec.apellido ?? "");
  setFormValue("telefono", rec.telefono ?? "");
  setFormValue("mail", rec.mail ?? "");
  setFormValue("direccion", rec.direccion ?? "");
  setFormValue("rubro", rec.rubro ?? "");
  setFormValue("responsable", rec.responsable ?? "");
  setFormValue("estado", normalizeEstado(rec.estado) || "4 - Local Creado");
  setFormValue("fecha_contacto", rec.fecha_contacto ?? "");

  elModalTitle.textContent = "Editar cliente";
  elBtnGuardar.textContent = "Guardar cambios";
  elBtnEliminar.style.display = "inline-flex";
  setCoordsHint(Number(rec.lat), Number(rec.lng));
}

function openCreateModalAt(lat, lng) {
  resetModalToCreate(lat, lng);
  setModalOpen(true);
}

function openEditModal(rec) {
  fillModalForEdit(rec);
  setModalOpen(true);
}

// ========= Supabase CRUD =========
async function loadRecords() {
  const { data, error } = await supabaseClient
    .from("clientes")
    .select("id,nombre,apellido,telefono,mail,direccion,rubro,estado,responsable,fecha_contacto,lat,lng,created_at")
    .eq("activo", true);

  if (error) throw error;

  // Sólo los que tienen coords para mapear (si querés mapear sin coords, habría que geocodificar)
  recordsCache = (data || []).filter(
    (r) => typeof r.lat === "number" && typeof r.lng === "number"
  );

  renderMarkers();
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
  // Para no romper tu CRM, preferimos soft-delete (activo=false) si existe esa columna
  // Si tu tabla no tiene "activo", cambiá por .delete()
  const { error } = await supabaseClient.from("clientes").update({ activo: false }).eq("id", id);
  if (error) throw error;
}

// ========= Rendering =========
function renderMarkers() {
  markersLayer.clearLayers();

  for (const rec of recordsCache) {
    const marker = L.marker([rec.lat, rec.lng], {
      icon: iconForEstado(rec.estado),
      title: `${rec.nombre ?? ""}`.trim() || "Cliente",
    });

    const est = normalizeEstado(rec.estado);
    const popupHtml = `
      <div style="min-width:240px">
        <div style="font-weight:700; margin-bottom:6px;">
          ${escapeHtml(rec.nombre ?? "")} ${escapeHtml(rec.apellido ?? "")}
        </div>
        <div><b>Estado:</b> ${escapeHtml(est)}</div>
        <div><b>Tel:</b> ${escapeHtml(rec.telefono ?? "")}</div>
        <div><b>Mail:</b> ${escapeHtml(rec.mail ?? "")}</div>
        <div><b>Dirección:</b> ${escapeHtml(rec.direccion ?? "")}</div>
        <div><b>Rubro:</b> ${escapeHtml(rec.rubro ?? "")}</div>
        <div><b>Responsable:</b> ${escapeHtml(rec.responsable ?? "")}</div>
        <div><b>Contacto:</b> ${escapeHtml(rec.fecha_contacto ?? "")}</div>
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
}

// ========= Form submit/delete =========
async function onSubmitForm(e) {
  e.preventDefault();

  const id = getFormValue("clienteId").trim();
  const lat = Number(getFormValue("lat"));
  const lng = Number(getFormValue("lng"));

  const nombre = getFormValue("nombre").trim();
  if (!nombre) {
    alert("El nombre es obligatorio.");
    return;
  }

  const estado = normalizeEstado(getFormValue("estado"));
  if (!ESTADOS.includes(estado)) {
    alert("Estado inválido. Elegí uno de la lista.");
    return;
  }

  const payload = {
    nombre,
    apellido: getFormValue("apellido").trim() || null,
    telefono: getFormValue("telefono").trim() || null,
    mail: getFormValue("mail").trim() || null,
    direccion: getFormValue("direccion").trim() || null,
    rubro: getFormValue("rubro").trim() || "Sin definir",
    responsable: getFormValue("responsable").trim() || null,
    estado,
    fecha_contacto: getFormValue("fecha_contacto") || null,
    lat,
    lng,
    activo: true,
  };

  try {
    elBtnGuardar.disabled = true;

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      alert("No hay coordenadas válidas (lat/lng).");
      return;
    }

    if (!id) {
      await insertRecord(payload);
    } else {
      await updateRecord(id, payload);
    }

    setModalOpen(false);
    await loadRecords();
  } catch (err) {
    console.error(err);
    alert("No se pudo guardar. Revisá consola (F12) y tu conexión/URL de Supabase.");
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

// ========= Init =========
document.addEventListener("DOMContentLoaded", async () => {
  const profile = await requireAuthOrRedirect();
  if (!profile) return;

// Theme
  const savedTheme = localStorage.getItem(THEME_KEY) || "light";
  applyTheme(savedTheme);

  btnToggleTheme?.addEventListener("click", toggleTheme);

  // Modal close
  elBtnCerrarModal?.addEventListener("click", () => setModalOpen(false));
  elModal?.addEventListener("click", (ev) => {
    if (ev.target === elModal) setModalOpen(false);
  });

  // Form
  elForm?.addEventListener("submit", onSubmitForm);
  elBtnEliminar?.addEventListener("click", onDeleteClick);

  // Map
  initMap();
  renderLegend();

  // Actions
  btnUbicarme?.addEventListener("click", () => locateMe({ center: true }));
  btnRegistrarAqui?.addEventListener("click", () => {
    if (!lastKnownPos) {
      locateMe({ center: true });
      // cuando llega la ubicación, el usuario puede tocar el botón de nuevo
      alert("Primero obtengamos tu ubicación. Tocá 'Registrar donde estoy' nuevamente.");
      return;
    }
    openCreateModalAt(lastKnownPos.lat, lastKnownPos.lng);
  });

  btnRefrescar?.addEventListener("click", async () => {
    try {
      await loadRecords();
      alert("Mapa actualizado.");
    } catch (e) {
      console.error(e);
      alert("No se pudo refrescar.");
    }
  });

  // Cargar data + ubicar (opcional)
  try {
    await loadRecords();
  } catch (err) {
    console.error(err);
    alert("No se pudieron cargar los clientes. Revisá tu URL/KEY de Supabase y tu conexión.");
  }

  // Ubicación inicial (no obliga)
  locateMe({ center: false });
});
