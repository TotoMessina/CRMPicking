/* =========================================================
   MAPA REPARTIDORES
   - Crear/Editar repartidores con coordenadas
   ========================================================= */

const supabaseClient = window.supabaseClient;
const THEME_KEY = "crm_theme";

// ========= AUTH =========
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
            const { data: perfil } = await supabaseClient
                .from("usuarios")
                .select("id, email, nombre, role, activo")
                .eq("id", session.user.id)
                .single();

            if (perfil) {
                window.CRM_USER = perfil;
            } else {
                window.CRM_USER = {
                    id: session.user.id,
                    email: session.user.email,
                    nombre: (session.user.email || "User").split("@")[0],
                    role: "user",
                    activo: true
                };
            }
        }
        return window.CRM_USER;
    } catch (e) {
        window.location.href = "login.html";
        return null;
    }
}

function getAuthUserName() {
    return (window.CRM_USER?.nombre || localStorage.getItem("usuarioActual") || "").trim();
}

// ========= ESTADOS =========
const ESTADOS = [
    "Documentación sin gestionar",
    "Cuenta aun no confirmada",
    "Cuenta confirmada y repartiendo"
];

const ESTADO_COLOR = {
    "Documentación sin gestionar": "#ef4444", // Rojo
    "Cuenta aun no confirmada": "#f97316", // Naranja
    "Cuenta confirmada y repartiendo": "#22c55e" // Verde
};

// ========= STATE =========
let map;
let markersLayer;
let myMarker = null;
let recordsCache = [];
let showCoverage = false; // State for coverage circles
let showHeatmap = false;  // State for heatmap
let heatLayer = null;

// DOM Elements
const elModal = document.getElementById("modalRepartidor");
const elForm = document.getElementById("formRepartidorMapa");
const elModalTitle = document.getElementById("modalTitle");
const elBtnEliminar = document.getElementById("btnEliminar");
const elBtnGuardar = document.getElementById("btnGuardar");
const elCoordHint = document.getElementById("coordHint");

// ========= HELPERS =========
function escapeHtml(v) {
    return String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);
    const btn = document.getElementById("btnToggleTheme");
    if (btn) btn.textContent = theme === "dark" ? "Modo día ☀️" : "Modo noche 🌙";
}

function normalizeEstado(s) {
    if (!s) return "Documentación sin gestionar";
    return s.trim();
}

function colorFromEstado(est) {
    return ESTADO_COLOR[est] || "#94a3b8";
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
    // Manejo especial para inputs que puedan no existir si modificaste el HTML
    const el = document.getElementById(id);
    return el ? el.value : "";
}

function setFormValue(id, v) {
    const el = document.getElementById(id);
    if (el) el.value = v ?? "";
}

// ========= MAP INIT =========
function initMap() {
    map = L.map("map", { zoomControl: true }).setView([-34.62, -58.44], 12);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap",
    }).addTo(map);

    markersLayer = L.layerGroup().addTo(map);

    map.on("click", (e) => {
        openCreateModalAt(e.latlng.lat, e.latlng.lng);
    });
}

// ========= GEOLOCATION =========
function locateMe() {
    if (!navigator.geolocation) return alert("No soportado");
    navigator.geolocation.getCurrentPosition(
        (p) => {
            const lat = p.coords.latitude;
            const lng = p.coords.longitude;

            if (!myMarker) {
                myMarker = L.marker([lat, lng], { title: "Yo" }).addTo(map);
            } else {
                myMarker.setLatLng([lat, lng]);
            }
            map.setView([lat, lng], 16);
        },
        (err) => alert("Error obteniendo ubicación")
    );
}

// ========= MODAL LOGIC =========
function openCreateModalAt(lat, lng) {
    setFormValue("repartidorId", "");
    setFormValue("lat", lat);
    setFormValue("lng", lng);

    setFormValue("nombre", "");
    setFormValue("telefono", "");
    setFormValue("email", "");
    setFormValue("direccion", "");
    setFormValue("localidad", "");
    setFormValue("estado", "Documentación sin gestionar");
    setFormValue("responsable", "");
    setFormValue("notas", "");

    elModalTitle.textContent = "Nuevo Repartidor";
    elBtnGuardar.textContent = "Guardar";
    elBtnEliminar.style.display = "none";
    setCoordsHint(lat, lng);
    setModalOpen(true);
}

function openEditModal(rec) {
    setFormValue("repartidorId", rec.id);
    setFormValue("lat", rec.lat);
    setFormValue("lng", rec.lng);

    setFormValue("nombre", rec.nombre);
    setFormValue("telefono", rec.telefono);
    setFormValue("email", rec.email);
    setFormValue("direccion", rec.direccion);
    setFormValue("localidad", rec.localidad);
    setFormValue("estado", rec.estado);
    setFormValue("responsable", rec.responsable);
    setFormValue("notas", rec.notas);

    elModalTitle.textContent = "Editar Repartidor";
    elBtnGuardar.textContent = "Guardar cambios";
    elBtnEliminar.style.display = "inline-flex"; // show delete
    setCoordsHint(Number(rec.lat), Number(rec.lng));
    setModalOpen(true);
}

// ========= CRUD =========
async function loadRecords() {
    const { data, error } = await supabaseClient
        .from("repartidores")
        .select("*")
        .not("lat", "is", null)
        .not("lng", "is", null);

    if (error) {
        console.error(error);
        return;
    }

    recordsCache = (data || []).map(r => ({
        ...r,
        lat: Number(r.lat),
        lng: Number(r.lng)
    })).filter(r => Number.isFinite(r.lat) && Number.isFinite(r.lng));

    renderMarkers();
}

function renderMarkers() {
    markersLayer.clearLayers();
    if (heatLayer) {
        map.removeLayer(heatLayer);
        heatLayer = null;
    }

    if (showHeatmap) {
        // Modo Heatmap: solo mapa de calor, sin marcadores
        const points = recordsCache
            .filter(r => r.estado !== "Cuenta aun no confirmada")
            .map(r => [r.lat, r.lng, 1]); // lat, lng, intensity

        if (points.length) {
            heatLayer = L.heatLayer(points, {
                radius: 25,
                blur: 15,
                maxZoom: 14,
                gradient: { 0.4: 'blue', 0.65: 'lime', 1: 'red' }
            }).addTo(map);
        }
        return; // Salir, no dibujar marcadores
    }

    for (const rec of recordsCache) {
        const color = colorFromEstado(rec.estado);

        const icon = L.divIcon({
            className: "",
            html: `<div class="marker-dot" style="background:${color};"></div>`,
            iconSize: [14, 14],
            iconAnchor: [7, 7],
            popupAnchor: [0, -10],
        });

        const marker = L.marker([rec.lat, rec.lng], {
            icon: icon,
            title: rec.nombre || "Repartidor"
        });

        const popupHtml = `
            <div style="min-width:200px">
                <div style="font-weight:700; margin-bottom:6px;">${escapeHtml(rec.nombre)}</div>
                <div class="muted" style="font-size:0.85rem">${escapeHtml(rec.estado)}</div>
                <div style="margin:6px 0; font-size:0.9rem;">
                   <div>📞 ${escapeHtml(rec.telefono || "-")}</div>
                   <div>🏠 ${escapeHtml(rec.direccion || "-")}</div>
                </div>
                ${rec.responsable ? `<div>Resp: <b>${escapeHtml(rec.responsable)}</b></div>` : ""}
                <button type="button" class="btn-secundario" data-action="edit" style="margin-top:8px; width:100%;">Editar</button>
            </div>
        `;

        marker.bindPopup(popupHtml);
        marker.on("popupopen", (ev) => {
            const node = ev.popup.getElement();
            const btn = node?.querySelector('button[data-action="edit"]');
            if (btn) {
                btn.addEventListener("click", () => {
                    openEditModal(rec);
                    marker.closePopup();
                });
            }
        });

        marker.addTo(markersLayer);

        // Coverage Circle
        // Excluir "Cuenta aun no confirmada"
        if (showCoverage && rec.estado !== "Cuenta aun no confirmada") {
            L.circle([rec.lat, rec.lng], {
                radius: 2000, // 2km
                color: color,
                fillColor: color,
                fillOpacity: 0.08, // Más transparente (era 0.15)
                weight: 1,
                opacity: 0.15, // Más transparente (era 0.3)
                interactive: false
            }).addTo(markersLayer);
        }
    }

    renderLegend();
}

function toggleCoverage() {
    if (showHeatmap) {
        toggleHeatmap(); // Turn off heatmap if specific coverage requested
    }
    showCoverage = !showCoverage;
    renderMarkers();
    const btn = document.getElementById("btnToggleCoverage");
    if (btn) {
        btn.textContent = showCoverage ? "Ocultar Cobertura" : "Ver Cobertura";
        btn.classList.toggle("btn-primario", showCoverage); // Visual feedback
        btn.classList.toggle("btn-secundario", !showCoverage);
    }
}

function toggleHeatmap() {
    showHeatmap = !showHeatmap;

    // Disable coverage if heatmap is on (confusing to have both)
    if (showHeatmap && showCoverage) {
        toggleCoverage();
        // toggleCoverage calls renderMarkers, but we want heatmap render, so we just set state and let next render handle it? 
        // Actually toggleCoverage turns off showCoverage. 
        // But we want to ensure clear state.
        showCoverage = false;
        const btnCov = document.getElementById("btnToggleCoverage");
        if (btnCov) {
            btnCov.textContent = "Ver Cobertura";
            btnCov.classList.remove("btn-primario");
            btnCov.classList.add("btn-secundario");
        }
    }

    renderMarkers();

    const btn = document.getElementById("btnToggleHeatmap");
    if (btn) {
        btn.textContent = showHeatmap ? "Ver Puntos" : "Mapa de Calor";
        btn.classList.toggle("btn-primario", showHeatmap);
        btn.classList.toggle("btn-secundario", !showHeatmap);
    }
}

function renderLegend() {
    const legend = document.getElementById("legend");
    if (!legend) return;
    legend.innerHTML = "";

    ESTADOS.forEach(est => {
        const color = colorFromEstado(est);
        const item = document.createElement("span");
        item.className = "legend-item";
        item.innerHTML = `<span class="legend-dot" style="background:${color}"></span>${est}`;
        legend.appendChild(item);
    });
}

async function onSubmitForm(e) {
    e.preventDefault();
    const id = getFormValue("repartidorId");
    const lat = Number(getFormValue("lat"));
    const lng = Number(getFormValue("lng"));
    const nombre = getFormValue("nombre").trim();

    if (!nombre) return alert("Nombre obligatorio");

    const payload = {
        nombre,
        telefono: getFormValue("telefono").trim() || null,
        email: getFormValue("email").trim() || null,
        direccion: getFormValue("direccion").trim() || null,
        localidad: getFormValue("localidad").trim() || null,
        estado: getFormValue("estado"),
        responsable: getFormValue("responsable") || null,
        notas: getFormValue("notas").trim() || null,
        lat,
        lng
    };

    try {
        elBtnGuardar.disabled = true;
        if (!id) {
            await supabaseClient.from("repartidores").insert([payload]);
        } else {
            await supabaseClient.from("repartidores").update(payload).eq("id", id);
        }
        setModalOpen(false);
        await loadRecords();
    } catch (err) {
        console.error(err);
        alert("Error guardando");
    } finally {
        elBtnGuardar.disabled = false;
    }
}

async function onDeleteClick() {
    const id = getFormValue("repartidorId");
    if (!id) return;
    if (!confirm("¿Eliminar este repartidor?")) return;

    try {
        await supabaseClient.from("repartidores").delete().eq("id", id);
        setModalOpen(false);
        await loadRecords();
    } catch (e) {
        alert("Error eliminando");
    }
}

// ========= INIT =========
document.addEventListener("DOMContentLoaded", async () => {
    const t = localStorage.getItem(THEME_KEY) || "light";
    applyTheme(t);
    document.getElementById("btnToggleTheme")?.addEventListener("click", () => {
        const current = document.documentElement.getAttribute("data-theme");
        applyTheme(current === "dark" ? "light" : "dark");
    });

    await requireAuthOrRedirect();
    initMap();
    await loadRecords();

    // Event Listeners
    document.getElementById("btnUbicarme")?.addEventListener("click", locateMe);
    document.getElementById("btnRegistrarAqui")?.addEventListener("click", () => {
        if (!marker) return alert("Primero usa 'Ubicarme'");
        // not implemented fully for brevity, assume click mostly
    });
    document.getElementById("btnRefrescar")?.addEventListener("click", loadRecords);
    document.getElementById("btnToggleCoverage")?.addEventListener("click", toggleCoverage);
    document.getElementById("btnToggleHeatmap")?.addEventListener("click", toggleHeatmap);

    elForm.addEventListener("submit", onSubmitForm);
    elBtnEliminar.addEventListener("click", onDeleteClick);

    // Modal Close
    document.getElementById("btnCerrarModal")?.addEventListener("click", () => setModalOpen(false));
    elModal.addEventListener("click", (e) => {
        if (e.target.dataset.close === "true") setModalOpen(false);
    });
});
