// ==========================================
// PROVEEDORES + CALENDARIO (Admin Only)
// ==========================================

const supabaseClient = window.supabaseClient;
let calendar = null;
let allSuppliers = [];
let allEvents = [];

const THEME_KEY = "crm_theme";

// Colors by Type
const TYPE_COLORS = {
    pedido: "#3b82f6", // Blue
    idea: "#eab308",   // Yellow
    plazo: "#ef4444",  // Red
    otro: "#64748b"    // Slate
};

// ==========================================
// INIT
// ==========================================
document.addEventListener("DOMContentLoaded", async () => {
    // 1. Auth & Admin Guard
    await requireAuthOrRedirect();

    // Check role from window.CRM_USER (populated by auth/guard)
    // If not admin, block access.
    // Note: 'role' is in profiles/users table. 
    // Usually auth logic sets CRM_USER.role

    if ((window.CRM_USER?.role || "").toLowerCase() !== 'administrador') {
        const denyEl = document.getElementById("accessDenied");
        if (denyEl) denyEl.style.display = "flex";
        document.querySelector(".app-shell").style.display = "none";
        return;
    }

    // Apply theme
    const t = localStorage.getItem(THEME_KEY) || "light";
    document.documentElement.setAttribute("data-theme", t);
    document.getElementById("btnToggleTheme")?.addEventListener("click", () => {
        const current = document.documentElement.getAttribute("data-theme");
        const next = current === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", next);
        localStorage.setItem(THEME_KEY, next);
    });

    // 2. Load Data
    await loadProveedores();
    await loadEvents();

    // 3. Init Calendar
    initCalendar();

    // 4. Bind Events
    bindUIEvents();
});


// ==========================================
// AUTH UTILS
// ==========================================
async function requireAuthOrRedirect() {
    // Reuse existing logic from other files if possible, or just basic check
    if (window.CRM_GUARD_READY) try { await window.CRM_GUARD_READY; } catch (_) { }

    if (!window.CRM_USER) {
        // Try get session
        const { data } = await supabaseClient.auth.getSession();
        if (!data.session) {
            window.location.href = "login.html";
            return;
        }
        // Fetch profile logic is in guard.js, assuming it ran.
        // If not, we might be in trouble, but let's assume guard.js did its job.
    }
}


// ==========================================
// DATA LOADING
// ==========================================
async function loadProveedores() {
    const listEl = document.getElementById("listaProveedores");
    listEl.innerHTML = '<div class="muted text-center">Cargando...</div>';

    const { data, error } = await supabaseClient
        .from('proveedores')
        .select('*')
        .eq('activo', true)
        .order('nombre');

    if (error) {
        console.error(error);
        listEl.innerHTML = '<div class="muted text-center">Error al cargar</div>';
        return;
    }

    allSuppliers = data || [];
    renderProveedoresList(allSuppliers);
    updateProvSelect(allSuppliers);
}

async function loadEvents() {
    const { data, error } = await supabaseClient
        .from('eventos_proveedores')
        .select(`
            *,
            proveedores (nombre)
        `);

    if (error) {
        console.error(error);
        return;
    }

    allEvents = data || [];
    if (calendar) {
        calendar.removeAllEvents();
        calendar.addEventSource(mapEventsToCalendar(allEvents));
    }
}

// ==========================================
// RENDERING
// ==========================================
function renderProveedoresList(list) {
    const container = document.getElementById("listaProveedores");
    container.innerHTML = "";

    if (list.length === 0) {
        container.innerHTML = '<div class="muted text-center" style="padding:10px;">No hay proveedores.</div>';
        return;
    }

    list.forEach(p => {
        const el = document.createElement("div");
        el.className = "prov-item";
        el.innerHTML = `
            <div class="prov-name">${escapeHtml(p.nombre)}</div>
            ${p.contacto ? `<div class="prov-meta">👤 ${escapeHtml(p.contacto)}</div>` : ''}
            ${p.telefono ? `<div class="prov-meta">📞 ${escapeHtml(p.telefono)}</div>` : ''}
        `;
        el.addEventListener("click", () => openModalProveedor(p));
        container.appendChild(el);
    });
}

function updateProvSelect(list) {
    const sel = document.getElementById("eventProvId");
    sel.innerHTML = '<option value="">Seleccione...</option>';
    list.forEach(p => {
        const opt = document.createElement("option");
        opt.value = p.id;
        opt.textContent = p.nombre;
        sel.appendChild(opt);
    });
}

function mapEventsToCalendar(events) {
    return events.map(e => {
        // Determine Color
        let color = TYPE_COLORS[e.tipo] || "#64748b";

        // Check for Delay:
        // If fecha_real_cierre exists AND is > fecha_fin => MARK AS DELAYED (Purple? or Dark Red?)
        // Or if status is 'pendiente' AND now > fecha_fin => MARK AS OVERDUE

        const now = new Date();
        const end = e.fecha_fin ? new Date(e.fecha_fin) : null;
        let titlePrefix = "";

        if (e.estado === 'pendiente' && end && now > end) {
            color = "#b91c1c"; // Dark Red for Overdue
            titlePrefix = "⚠️ ";
        } else if (e.fecha_real_cierre && end && new Date(e.fecha_real_cierre) > end) {
            color = "#7c3aed"; // Purple for "Was Delayed"
            titlePrefix = "⏳ ";
        } else if (e.estado === 'completado') {
            color = "#22c55e"; // Green for Done
            titlePrefix = "✅ ";
        }

        const provName = e.proveedores?.nombre || "Sin Prov.";

        return {
            id: e.id,
            title: `${titlePrefix}${provName}: ${e.titulo}`,
            start: e.fecha_inicio,
            end: e.fecha_fin, // If null, FullCalendar treats as point event
            backgroundColor: color,
            borderColor: color,
            extendedProps: {
                original: e
            }
        };
    });
}

function initCalendar() {
    const el = document.getElementById("calendar");
    calendar = new FullCalendar.Calendar(el, {
        initialView: 'dayGridMonth',
        locale: 'es',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,listMonth'
        },
        height: '100%',
        events: mapEventsToCalendar(allEvents),
        eventClick: (info) => {
            const ev = info.event.extendedProps.original;
            openModalEvento(ev);
        },
        editable: true, // Allow drag/drop to change dates?
        eventDrop: async (info) => {
            // Update dates on drop
            const evId = info.event.id;
            const newStart = info.event.start;
            const newEnd = info.event.end || newStart; // If dropped on day, might be null

            await updateEventDates(evId, newStart, newEnd);
        }
    });
    calendar.render();
}

async function updateEventDates(id, start, end) {
    const { error } = await supabaseClient
        .from('eventos_proveedores')
        .update({
            fecha_inicio: start.toISOString(),
            fecha_fin: end ? end.toISOString() : null
        })
        .eq('id', id);

    if (error) {
        alert("Error actualizando fechas");
        loadEvents(); // Revert
    }
}

// ==========================================
// MODALS LOGIC
// ==========================================

// PROVEEDOR
const modalProv = document.getElementById("modalProveedor");
const formProv = document.getElementById("formProveedor");

function openModalProveedor(p = null) {
    if (p) {
        document.getElementById("modalTitleProv").textContent = "Editar Proveedor";
        document.getElementById("provId").value = p.id;
        document.getElementById("provNombre").value = p.nombre;
        document.getElementById("provContacto").value = p.contacto || "";
        document.getElementById("provTelefono").value = p.telefono || "";
        document.getElementById("provRubro").value = p.rubro || "";
        document.getElementById("provNotas").value = p.notas || "";
        document.getElementById("btnEliminarProv").style.display = "inline-flex";
    } else {
        document.getElementById("modalTitleProv").textContent = "Nuevo Proveedor";
        formProv.reset();
        document.getElementById("provId").value = "";
        document.getElementById("btnEliminarProv").style.display = "none";
    }

    modalProv.style.display = "flex";
    modalProv.setAttribute("aria-hidden", "false");
}

formProv.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("provId").value;
    const payload = {
        nombre: document.getElementById("provNombre").value,
        contacto: document.getElementById("provContacto").value || null,
        telefono: document.getElementById("provTelefono").value || null,
        rubro: document.getElementById("provRubro").value || null,
        notas: document.getElementById("provNotas").value || null
    };

    let error;
    if (id) {
        const { error: e } = await supabaseClient.from('proveedores').update(payload).eq('id', id);
        error = e;
    } else {
        const { error: e } = await supabaseClient.from('proveedores').insert([payload]);
        error = e;
    }

    if (error) {
        alert("Error guardando proveedor");
        console.error(error);
    } else {
        modalProv.style.display = "none";
        loadProveedores();
    }
});

document.getElementById("btnEliminarProv").addEventListener("click", async () => {
    const id = document.getElementById("provId").value;
    if (!id) return;
    if (!confirm("¿Eliminar proveedor? Se borrarán sus eventos.")) return;

    // Soft delete usually better, but schema says 'activo' boolean
    // Let's use soft delete if column exists, checked migration: 'activo boolean default true' YES.
    const { error } = await supabaseClient.from('proveedores').update({ activo: false }).eq('id', id);
    if (error) {
        alert("Error eliminando");
    } else {
        modalProv.style.display = "none";
        loadProveedores();
    }
});


// EVENTO
const modalEvent = document.getElementById("modalEvento");
const formEvent = document.getElementById("formEventoProv");

function openModalEvento(ev = null) {
    if (ev) {
        document.getElementById("modalTitleEvento").textContent = "Editar Evento";
        document.getElementById("eventId").value = ev.id;
        document.getElementById("eventProvId").value = ev.proveedor_id;
        document.getElementById("eventTipo").value = ev.tipo || "pedido";
        document.getElementById("eventTitulo").value = ev.titulo;
        document.getElementById("eventInicio").value = toLocalInput(ev.fecha_inicio);
        document.getElementById("eventFin").value = toLocalInput(ev.fecha_fin);
        document.getElementById("eventReal").value = toLocalInput(ev.fecha_real_cierre);
        document.getElementById("eventEstado").value = ev.estado || "pendiente";
        document.getElementById("eventDesc").value = ev.descripcion || "";
        document.getElementById("btnEliminarEvent").style.display = "inline-flex";
    } else {
        document.getElementById("modalTitleEvento").textContent = "Nuevo Evento";
        formEvent.reset();
        document.getElementById("eventId").value = "";

        // Default start now
        const now = new Date();
        document.getElementById("eventInicio").value = toLocalInput(now.toISOString());
        document.getElementById("btnEliminarEvent").style.display = "none";
    }

    modalEvent.style.display = "flex";
    modalEvent.setAttribute("aria-hidden", "false");
}

formEvent.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("eventId").value;

    const provId = document.getElementById("eventProvId").value;
    if (!provId || provId === "") {
        alert("Selecciona un proveedor");
        return;
    }

    const payload = {
        proveedor_id: provId,
        tipo: document.getElementById("eventTipo").value,
        titulo: document.getElementById("eventTitulo").value,
        fecha_inicio: toISO(document.getElementById("eventInicio").value),
        fecha_fin: toISO(document.getElementById("eventFin").value),
        fecha_real_cierre: toISO(document.getElementById("eventReal").value),
        estado: document.getElementById("eventEstado").value,
        descripcion: document.getElementById("eventDesc").value || null
    };

    let error;
    if (id) {
        const { error: e } = await supabaseClient.from('eventos_proveedores').update(payload).eq('id', id);
        error = e;
    } else {
        const { error: e } = await supabaseClient.from('eventos_proveedores').insert([payload]);
        error = e;
    }

    if (error) {
        alert("Error guardando evento");
    } else {
        modalEvent.style.display = "none";
        loadEvents();
    }
});

document.getElementById("btnEliminarEvent").addEventListener("click", async () => {
    const id = document.getElementById("eventId").value;
    if (!id) return;
    if (!confirm("¿Eliminar este evento?")) return;

    const { error } = await supabaseClient.from('eventos_proveedores').delete().eq('id', id);
    if (error) alert("Error eliminando");
    else {
        modalEvent.style.display = "none";
        loadEvents();
    }
});


// ==========================================
// HELPERS & BINDING
// ==========================================
function bindUIEvents() {
    document.getElementById("btnNuevoProveedor").addEventListener("click", () => openModalProveedor());
    document.getElementById("btnNuevoEvento").addEventListener("click", () => openModalEvento());

    // Busqueda
    document.getElementById("busquedaProv").addEventListener("input", (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = allSuppliers.filter(p => p.nombre.toLowerCase().includes(term));
        renderProveedoresList(filtered);
    });

    // Close Modals
    document.querySelectorAll('[data-close="true"]').forEach(el => {
        el.addEventListener("click", (e) => {
            // If it's the backdrop (has class 'modal'), only close if clicked directly
            if (el.classList.contains("modal") && e.target !== el) return;

            el.closest(".modal").style.display = "none";
        });
    });
}

function escapeHtml(s) {
    return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function toLocalInput(isoStr) {
    if (!isoStr) return "";
    // convert ISO (UTC) to Local Input (datetime-local) format: YYYY-MM-DDTHH:mm
    // Quick hack: new Date(isoStr) -> shift to local -> toISO -> slice
    const d = new Date(isoStr);
    const offset = d.getTimezoneOffset() * 60000;
    const local = new Date(d.getTime() - offset);
    return local.toISOString().slice(0, 16);
}

function toISO(localStr) {
    if (!localStr) return null;
    return new Date(localStr).toISOString();
}
