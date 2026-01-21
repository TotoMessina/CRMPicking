/* kiosco.js - Minimal map logic for Kiosco role */

(function () {
    let map, drawnItems;
    const SUPABASE_URL = "https://mflftikcvsnniwwanrkj.supabase.co"; // Assuming global config, but explicit just in case
    // window.supabaseClient is available from common.js/auth.js

    document.addEventListener("DOMContentLoaded", async () => {
        // 1. Wait for Guard (optional if simpler, but safe)
        if (window.CRM_GUARD_READY) {
            try { await window.CRM_GUARD_READY; } catch (_) { }
        }

        // 2. Initialize Map
        initMap();

        // 3. Load Data
        await loadZones();
    });

    function initMap() {
        // Default center (San Justo approx)
        map = L.map('map').setView([-34.6806, -58.5634], 13);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 20
        }).addTo(map);

        // Initialize Drawing Features
        initDrawControl();

        // Refresh Button
        const btnRefrescar = document.getElementById("btnRefrescar");
        if (btnRefrescar) {
            btnRefrescar.addEventListener("click", () => {
                loadZones();
                window.showToast("Zonas recargadas", "info");
            });
        }

        // Styles for popup buttons if not present globally
        const style = document.createElement('style');
        style.innerHTML = `
      .btn-small { padding: 4px 8px; font-size: 0.8em; border-radius: 6px; cursor: pointer; border: 1px solid #ccc; background: white; }
      .btn-delete { background: #fee2e2; color: #991b1b; border-color: #fecaca; }
      .btn-delete:hover { background: #fecaca; }
    `;
        document.head.appendChild(style);
    }

    /* =========================================================
       ZONE MANAGEMENT (Manzanas)
       ========================================================= */
    function initDrawControl() {
        drawnItems = new L.FeatureGroup();
        map.addLayer(drawnItems);

        const drawControl = new L.Control.Draw({
            position: 'topright',
            draw: {
                polygon: {
                    allowIntersection: false,
                    showArea: true,
                    shapeOptions: { color: '#3b82f6', fillOpacity: 0.4 }
                },
                rectangle: {
                    shapeOptions: { color: '#3b82f6', fillOpacity: 0.4 }
                },
                // Disable others
                polyline: false,
                circle: false,
                marker: false,
                circlemarker: false
            },
            edit: {
                featureGroup: drawnItems,
                remove: true,
                edit: false // Validate if editing works simply, usually tricky with DB sync. Keeping simple: delete & redraw.
            }
        });

        map.addControl(drawControl);

        // --- ON CREATE ---
        map.on(L.Draw.Event.CREATED, async function (e) {
            const layer = e.layer;

            // Determine color from selector
            const zoneType = document.getElementById("zoneTypeSelect")?.value || "today";
            let color = "#3b82f6"; // Default Blue
            if (zoneType === "done") color = "#ef4444";
            if (zoneType === "extra") color = "#f97316";

            layer.setStyle({ color: color, fillOpacity: 0.4 });
            drawnItems.addLayer(layer);

            // Save to Supabase
            const shape = layer.toGeoJSON();
            // Flatten coords: [[[lng, lat], ...]] -> [{lat, lng}, ...]
            const coords = shape.geometry.coordinates[0].map(p => ({ lat: p[1], lng: p[0] }));

            if (!coords || coords.length < 3) return;

            const { data, error } = await window.supabaseClient
                .from('zones')
                .insert([{
                    coordinates: coords,
                    color: color,
                    scope: 'kiosco_map', // Scoped to Kiosco Map
                    created_at: new Date()
                }])
                .select();

            if (error) {
                console.error("Error saving zone:", error);
                window.showToast("Error al guardar la zona", "error");
                drawnItems.removeLayer(layer);
            } else {
                const newId = data[0].id;
                layer.zoneId = newId;
                bindZonePopup(layer, newId);
                window.showToast("Zona guardada", "success");
            }
        });

        // --- ON DELETE ---
        map.on(L.Draw.Event.DELETED, async function (e) {
            const layers = e.layers;
            layers.eachLayer(async function (layer) {
                if (layer.zoneId) {
                    const { error } = await window.supabaseClient
                        .from('zones')
                        .delete()
                        .eq('id', layer.zoneId);

                    if (error) console.error("Error deleting zone:", error);
                }
            });
        });
    }

    async function loadZones() {
        drawnItems.clearLayers();
        const { data, error } = await window.supabaseClient
            .from('zones')
            .select('*')
            .eq('scope', 'kiosco_map'); // Only load Kiosco map zones

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

    function bindZonePopup(layer, zoneId) {
        const popupContent = document.createElement("div");
        popupContent.innerHTML = `
      <div style="margin-bottom:8px; font-weight:bold;">Zona</div>
      <div style="display:flex; flex-direction:column; gap:6px;">
        <button class="btn-small" style="color:#0284c7; border:1px solid #0284c7;" onclick="window.updateZoneColor('${zoneId}', '#3b82f6')">🔵 Marcar "Hoy"</button>
        <button class="btn-small" style="color:#dc2626; border:1px solid #dc2626;" onclick="window.updateZoneColor('${zoneId}', '#ef4444')">🔴 Marcar "Realizada"</button>
        <button class="btn-small" style="color:#ea580c; border:1px solid #ea580c;" onclick="window.updateZoneColor('${zoneId}', '#f97316')">🟠 Marcar "Extra"</button>
        <hr style="width:100%; border:0; border-top:1px solid #eee; margin:4px 0;">
        <button class="btn-delete btn-small" onclick="window.deleteZoneById('${zoneId}')">🗑️ Eliminar</button>
      </div>
    `;
        layer.bindPopup(popupContent);
    }

    /* Global Helpers for Popup Actions */
    window.updateZoneColor = async function (id, newColor) {
        const { error } = await window.supabaseClient
            .from('zones')
            .update({ color: newColor })
            .eq('id', id);

        if (error) {
            window.showToast("Error al actualizar color", "error");
        } else {
            // Update visual
            drawnItems.eachLayer(layer => {
                if (layer.zoneId == id) {
                    layer.setStyle({ color: newColor });
                    layer.closePopup();
                }
            });
            window.showToast("Color actualizado", "success");
        }
    };

    window.deleteZoneById = async function (id) {
        if (!confirm("¿Eliminar esta zona?")) return;

        const { error } = await window.supabaseClient
            .from('zones')
            .delete()
            .eq('id', id);

        if (error) {
            window.showToast("Error al eliminar", "error");
        } else {
            drawnItems.eachLayer(layer => {
                if (layer.zoneId == id) {
                    drawnItems.removeLayer(layer);
                }
            });
            window.showToast("Zona eliminada", "success");
        }
    };

})();
