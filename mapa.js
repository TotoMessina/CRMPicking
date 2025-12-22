/* =========================================================
   mapa.js — Leaflet + Supabase + CRUD + Tracking ubicación
   Requiere (en mapa.html):
   - Leaflet CDN
   - Supabase CDN (@supabase/supabase-js@2) => window.supabase global
========================================================= */

/* =========================
   SUPABASE CONFIG (CDN)
   - Pegá acá tu URL y tu anon key del MISMO proyecto.
========================= */
const SUPABASE_URL = "https://mflftikcvsnniwwanrkj.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mbGZ0aWtjdnNubml3d2FucmtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NjcyMjAsImV4cCI6MjA3OTE0MzIyMH0.Z_EsaegFay24E0rOoX2PpwvWasWm5tfLcJiRrgs1nBY";

if (!window.supabase) {
  throw new Error("Supabase no está cargado. Asegurate de incluir el CDN antes de mapa.js.");
}
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* =========================
   DOM
========================= */
const listEl = document.getElementById("list");
const qEl = document.getElementById("q");
const btnReload = document.getElementById("btnReload");

const btnTrack = document.getElementById("btnTrack"); // "Ver mi ubicación"
const btnHere = document.getElementById("btnHere");   // "Registrar aquí"

const modalBackdrop = document.getElementById("modalBackdrop");
const btnClose = document.getElementById("btnClose");
const form = document.getElementById("form");
const statusEl = document.getElementById("status");
const btnSave = document.getElementById("btnSave");
const btnDelete = document.getElementById("btnDelete");
const modalTitle = document.getElementById("modalTitle");

/* =========================
   STATE
========================= */
let records = [];
let pendingLatLng = null;  // {lat,lng} para create/update
let editingId = null;      // id del cliente (asumo bigint/int; si es uuid también sirve)

let map;
let markersLayer;

// Tracking ubicación
let myMarker = null;
let myAccuracyCircle = null;
let lastMyLatLng = null;   // {lat,lng}
let geoWatchId = null;

/* =========================
   HELPERS
========================= */
function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(iso) {
  if (!iso) return "";
  const [y, m, d] = String(iso).split("-");
  if (!y || !m || !d) return String(iso);
  return `${d}/${m}/${y}`;
}

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function colorFromRubro(rubro) {
  const s = (rubro || "").trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  const hue = hash % 360;
  return `hsl(${hue} 75% 55%)`;
}

/* =========================
   MODAL
========================= */
function openModal(mode) {
  modalBackdrop.classList.remove("hidden");
  statusEl.textContent = "";

  if (mode === "create") {
    modalTitle.textContent = "Nuevo local";
    btnDelete.classList.add("hidden");
  } else {
    modalTitle.textContent = "Editar local";
    btnDelete.classList.remove("hidden");
  }

  // Default fecha contacto
  if (!form.elements["fecha_contacto"].value) {
    form.elements["fecha_contacto"].value = todayISO();
  }

  form.elements["nombre"].focus();
}

function closeModal() {
  modalBackdrop.classList.add("hidden");
  form.reset();
  statusEl.textContent = "";
  pendingLatLng = null;
  editingId = null;
}

function fillForm(rec) {
  form.elements["nombre"].value = rec.nombre || "";
  form.elements["apellido"].value = rec.apellido || "";
  form.elements["telefono"].value = rec.telefono || "";
  form.elements["mail"].value = rec.mail || "";
  form.elements["direccion"].value = rec.direccion || "";
  form.elements["rubro"].value = rec.rubro || "";
  form.elements["responsable"].value = rec.responsable || "";
  form.elements["fecha_contacto"].value = rec.fecha_contacto || "";
}

/* =========================
   LEAFLET INIT
========================= */
function initMap() {
  // Centro default: Buenos Aires
  map = L.map("mapaLeaflet").setView([-34.6037, -58.3816], 12);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);

  markersLayer = L.layerGroup().addTo(map);

  // Click en mapa => crear en ese punto
  map.on("click", (e) => {
    pendingLatLng = { lat: e.latlng.lat, lng: e.latlng.lng };
    editingId = null;
    form.reset();
    openModal("create");
  });
}

function renderMarkers() {
  markersLayer.clearLayers();

  records.forEach((rec) => {
    const lat = Number(rec.lat);
    const lng = Number(rec.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    const color = colorFromRubro(rec.rubro);
    const marker = L.circleMarker([lat, lng], {
      radius: 8,
      color,
      fillColor: color,
      fillOpacity: 0.9,
      weight: 2
    });

    marker.bindTooltip(
      `${escapeHtml(rec.nombre)} ${escapeHtml(rec.apellido || "")} • ${escapeHtml(rec.rubro)}`,
      { direction: "top", opacity: 0.95 }
    );

    // Click marker => editar
    marker.on("click", () => {
      editingId = rec.id;
      pendingLatLng = { lat, lng };
      fillForm(rec);
      openModal("edit");
    });

    marker.addTo(markersLayer);
  });
}

/* =========================
   LIST UI
========================= */
function renderList(filterText = "") {
  const ft = filterText.trim().toLowerCase();
  const filtered = !ft
    ? records
    : records.filter(r => {
        const blob = `${r.nombre} ${r.apellido} ${r.rubro} ${r.responsable} ${r.direccion} ${r.mail} ${r.telefono}`.toLowerCase();
        return blob.includes(ft);
      });

  if (!filtered.length) {
    listEl.innerHTML = `<div class="meta" style="padding:10px;">Sin registros con ubicación.</div>`;
    return;
  }

  listEl.innerHTML = filtered.map(r => {
    const c = colorFromRubro(r.rubro);
    return `
      <div class="cardRow" id="row-${escapeHtml(r.id)}">
        <h4>
          <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${c};margin-right:8px;vertical-align:middle;"></span>
          ${escapeHtml(r.nombre)} ${escapeHtml(r.apellido || "")}
        </h4>
        <div class="meta">
          <div><b>Rubro:</b> ${escapeHtml(r.rubro)}</div>
          <div><b>Responsable:</b> ${escapeHtml(r.responsable)}</div>
          <div><b>Tel:</b> ${escapeHtml(r.telefono || "")} • <b>Mail:</b> ${escapeHtml(r.mail || "")}</div>
          <div><b>Dirección:</b> ${escapeHtml(r.direccion || "")}</div>
          <div><b>Fecha contacto:</b> ${escapeHtml(formatDate(r.fecha_contacto || ""))}</div>
        </div>
        <div class="actions">
          <button class="btn" data-action="zoom" data-id="${escapeHtml(r.id)}">Ver</button>
          <button class="btn" data-action="edit" data-id="${escapeHtml(r.id)}">Editar</button>
          <button class="btn danger" data-action="delete" data-id="${escapeHtml(r.id)}">Eliminar</button>
        </div>
      </div>
    `;
  }).join("");

  listEl.querySelectorAll("button[data-action]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id; // puede ser number o uuid, lo tratamos como string
      const action = btn.dataset.action;
      const rec = records.find(x => String(x.id) === String(id));
      if (!rec) return;

      if (action === "zoom") {
        const lat = Number(rec.lat);
        const lng = Number(rec.lng);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          map.setView([lat, lng], Math.max(map.getZoom(), 16), { animate: true });
        }
      }

      if (action === "edit") {
        editingId = rec.id;
        pendingLatLng = { lat: Number(rec.lat), lng: Number(rec.lng) };
        fillForm(rec);
        openModal("edit");
      }

      if (action === "delete") {
        await deleteRecordFlow(rec.id);
      }
    });
  });
}

/* =========================
   SUPABASE OPS (tabla clientes)
========================= */
async function loadRecords() {
  const { data, error } = await sb
    .from("clientes")
    .select("id,nombre,apellido,telefono,mail,direccion,rubro,responsable,fecha_contacto,lat,lng,created_at")
    .not("lat", "is", null)
    .not("lng", "is", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    listEl.innerHTML = `<div class="meta" style="padding:10px;">Error cargando: ${escapeHtml(error.message)}</div>`;
    return;
  }

  records = data || [];
  renderMarkers();
  renderList(qEl.value);
}

async function insertRecord(payload) {
  const { data, error } = await sb
    .from("clientes")
    .insert(payload)
    .select("id,nombre,apellido,telefono,mail,direccion,rubro,responsable,fecha_contacto,lat,lng,created_at")
    .single();

  if (error) throw error;
  return data;
}

async function updateRecord(id, payload) {
  const { data, error } = await sb
    .from("clientes")
    .update(payload)
    .eq("id", id)
    .select("id,nombre,apellido,telefono,mail,direccion,rubro,responsable,fecha_contacto,lat,lng,created_at")
    .single();

  if (error) throw error;
  return data;
}

async function deleteRecord(id) {
  const { error } = await sb
    .from("clientes")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

async function deleteRecordFlow(id) {
  const ok = confirm("¿Eliminar este local? Esta acción no se puede deshacer.");
  if (!ok) return;

  try {
    await deleteRecord(id);
    records = records.filter(r => String(r.id) !== String(id));
    renderMarkers();
    renderList(qEl.value);
    if (String(editingId) === String(id)) closeModal();
  } catch (err) {
    console.error(err);
    alert(`Error eliminando: ${err.message || "No se pudo eliminar"}`);
  }
}

/* =========================
   TRACKING: tu ubicación en tiempo real
========================= */
function setMyLocationOnMap(lat, lng, accuracyMeters) {
  lastMyLatLng = { lat, lng };

  // Marker de usuario (azul)
  const color = "hsl(210 90% 55%)";

  if (!myMarker) {
    myMarker = L.circleMarker([lat, lng], {
      radius: 8,
      color,
      fillColor: color,
      fillOpacity: 1,
      weight: 2
    }).addTo(map);

    myMarker.bindTooltip("Tu ubicación", { direction: "top", opacity: 0.95 });
  } else {
    myMarker.setLatLng([lat, lng]);
  }

  if (Number.isFinite(accuracyMeters)) {
    if (!myAccuracyCircle) {
      myAccuracyCircle = L.circle([lat, lng], {
        radius: accuracyMeters,
        weight: 1,
        opacity: 0.35,
        fillOpacity: 0.08
      }).addTo(map);
    } else {
      myAccuracyCircle.setLatLng([lat, lng]);
      myAccuracyCircle.setRadius(accuracyMeters);
    }
  }
}

function startTrackingMyLocation() {
  if (!navigator.geolocation) {
    alert("Tu navegador no soporta geolocalización.");
    return;
  }

  // Toggle: si ya está activo, lo apagamos
  if (geoWatchId !== null) {
    navigator.geolocation.clearWatch(geoWatchId);
    geoWatchId = null;
    btnTrack && (btnTrack.textContent = "Ver mi ubicación");
    return;
  }

  btnTrack && (btnTrack.textContent = "Detener ubicación");

  geoWatchId = navigator.geolocation.watchPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const acc = pos.coords.accuracy;

      setMyLocationOnMap(lat, lng, acc);

      // Centrar cuando arranca o si estás muy lejos (simple)
      if (map && map.getZoom() < 15) {
        map.setView([lat, lng], 16, { animate: true });
      }
    },
    (err) => {
      geoWatchId = null;
      btnTrack && (btnTrack.textContent = "Ver mi ubicación");
      alert("No se pudo obtener tu ubicación: " + (err.message || "error"));
    },
    { enableHighAccuracy: true, maximumAge: 3000, timeout: 12000 }
  );
}

function openCreateAtMyLocation() {
  if (!lastMyLatLng) {
    alert("Todavía no tengo tu ubicación. Tocá primero “Ver mi ubicación”.");
    return;
  }
  pendingLatLng = { ...lastMyLatLng };
  editingId = null;
  form.reset();
  openModal("create");
}

/* =========================
   EVENTS
========================= */
btnClose?.addEventListener("click", closeModal);

modalBackdrop?.addEventListener("click", (e) => {
  if (e.target === modalBackdrop) closeModal();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modalBackdrop && !modalBackdrop.classList.contains("hidden")) closeModal();
});

qEl?.addEventListener("input", () => renderList(qEl.value));

btnReload?.addEventListener("click", loadRecords);

btnTrack?.addEventListener("click", startTrackingMyLocation);

btnHere?.addEventListener("click", openCreateAtMyLocation);

btnDelete?.addEventListener("click", async () => {
  if (!editingId) return;
  await deleteRecordFlow(editingId);
});

form?.addEventListener("submit", async (e) => {
  e.preventDefault();

  btnSave.disabled = true;
  statusEl.textContent = "Guardando...";

  try {
    // Para crear: necesitamos lat/lng; para editar, también (se mantiene)
    if (!editingId && !pendingLatLng) {
      throw new Error("No se detectó ubicación. Hacé click en el mapa o usá “Registrar aquí”.");
    }

    const payload = {
      lat: pendingLatLng?.lat ?? null,
      lng: pendingLatLng?.lng ?? null,

      nombre: form.elements["nombre"].value.trim(),
      apellido: form.elements["apellido"].value.trim() || null,
      telefono: form.elements["telefono"].value.trim(),
      mail: form.elements["mail"].value.trim() || null,
      direccion: form.elements["direccion"].value.trim(),
      rubro: form.elements["rubro"].value.trim(),
      responsable: form.elements["responsable"].value.trim(),
      fecha_contacto: form.elements["fecha_contacto"].value || todayISO()
    };

    // Validación mínima
    if (!payload.nombre) throw new Error("Nombre requerido");
    if (!payload.telefono) throw new Error("Teléfono requerido");
    if (!payload.direccion) throw new Error("Dirección requerida");
    if (!payload.rubro) throw new Error("Rubro requerido");
    if (!payload.responsable) throw new Error("Responsable requerido");
    if (!Number.isFinite(Number(payload.lat)) || !Number.isFinite(Number(payload.lng))) {
      throw new Error("Ubicación inválida");
    }

    let saved;
    if (editingId) {
      saved = await updateRecord(editingId, payload);
      records = records.map(r => (String(r.id) === String(saved.id) ? saved : r));
    } else {
      saved = await insertRecord(payload);
      records.unshift(saved);
    }

    renderMarkers();
    renderList(qEl.value);

    statusEl.textContent = "Guardado.";
    setTimeout(() => closeModal(), 250);
  } catch (err) {
    console.error(err);
    statusEl.textContent = `Error: ${err.message || "No se pudo guardar"}`;
  } finally {
    btnSave.disabled = false;
  }
});

/* =========================
   INIT
========================= */
initMap();
loadRecords();

// Si querés que arranque mostrando tu ubicación automáticamente, descomentá:
// startTrackingMyLocation();
