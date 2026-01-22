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

    // Check role from window.CRM_USER (populated by auth/guard)
    // Allow 'administrador' OR 'empleado'
    const role = (window.CRM_USER?.role || "").toLowerCase();

    if (role !== 'administrador' && role !== 'empleado') {
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

    // Separate events: 
    // Calendar = has start date
    // Ideas Board = no start date (or explicit type check if preferred, but user said "no dates")
    const calendarEvents = allEvents.filter(e => e.fecha_inicio);

    if (calendar) {
        calendar.removeAllEvents();
        calendar.addEventSource(mapEventsToCalendar(calendarEvents));
    }

    renderIdeasBoard(allEvents);
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

function renderIdeasBoard(events) {
    const container = document.getElementById("ideasContainer");
    container.innerHTML = "";

    // Filter logic: Ideas that don't have a start date
    // OR specifically type 'idea' without dates.
    // Let's assume ANY event without a start date is a "Backlog Item / Idea".
    const ideas = events.filter(e => !e.fecha_inicio);

    if (ideas.length === 0) {
        container.innerHTML = '<div class="muted text-center" style="padding:20px; font-style:italic;">No hay ideas pendientes.</div>';
        return;
    }

    // Group by 'seccion'
    const groups = {};
    ideas.forEach(e => {
        const sec = e.seccion || "General";
        if (!groups[sec]) groups[sec] = [];
        groups[sec].push(e);
    });

    // Sort sections alphabetically? Or maybe "General" first/last? 
    // Let's just do alphabetical for now.
    const sortedSections = Object.keys(groups).sort();

    sortedSections.forEach(sectionTitle => {
        const sectionEl = document.createElement("div");
        sectionEl.className = "idea-section";

        const titleEl = document.createElement("div");
        titleEl.className = "idea-section-title";
        titleEl.textContent = sectionTitle;
        sectionEl.appendChild(titleEl);

        groups[sectionTitle].forEach(idea => {
            const card = document.createElement("div");
            card.className = "idea-card";
            // Color stripe based on type?
            const color = TYPE_COLORS[idea.tipo] || "#eab308";
            card.style.borderLeftColor = color;

            const provName = idea.proveedores?.nombre || "Sin Prov.";

            // Status Icon/Text
            let statusIcon = "";
            let titleClass = "idea-card-title";
            if (idea.estado === "completado") {
                statusIcon = "✅ ";
                // titleClass += " text-decoration-line-through"; // Optional: strike through
            }
            else if (idea.estado === "cancelado") statusIcon = "❌ ";

            card.innerHTML = `
                <div class="${titleClass}">${statusIcon}${escapeHtml(idea.titulo)}</div>
                <div class="idea-card-prov">${escapeHtml(provName)}</div>
            `;
            card.addEventListener("click", () => openModalEvento(idea));
            sectionEl.appendChild(card);
        });

        container.appendChild(sectionEl);
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
// HISTORIAL LOGIC
// ==========================================
async function loadHistory(eventId) {
    const listEl = document.getElementById("historialList");
    listEl.innerHTML = '<div class="muted text-center" style="padding:10px;">Cargando historial...</div>';

    const { data, error } = await supabaseClient
        .from('eventos_historial')
        .select('*')
        .eq('evento_id', eventId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error loading history:", error);
        listEl.innerHTML = '<div class="muted text-center text-danger">Error al cargar historial.</div>';
        return;
    }

    renderHistory(data || []);
}

function renderHistory(items) {
    const listEl = document.getElementById("historialList");
    listEl.innerHTML = "";

    if (items.length === 0) {
        listEl.innerHTML = '<div class="muted text-center" style="padding:10px;">Sin historial.</div>';
        return;
    }

    items.forEach(item => {
        const div = document.createElement("div");
        div.className = "history-item";

        const dateStr = new Date(item.created_at).toLocaleString('es-AR', {
            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
        });

        const userLabel = item.usuario_email ? ` • <strong>${getInitials(item.usuario_email)}</strong>` : '';

        div.innerHTML = `
            <div class="history-meta">
                ${dateStr}${userLabel}
            </div>
            <div class="history-text">${escapeHtml(item.comentario)}</div>
        `;
        listEl.appendChild(div);
    });
}

function getInitials(email) {
    return email.split('@')[0];
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
    // Populate Datalist for Secciones
    const dl = document.getElementById("seccionesList");
    dl.innerHTML = "";
    // Extract unique sections from allEvents
    const distinctSections = [...new Set(allEvents.map(e => e.seccion).filter(s => !!s))].sort();
    distinctSections.forEach(s => {
        const opt = document.createElement("option");
        opt.value = s;
        dl.appendChild(opt);
    });

    if (ev) {
        document.getElementById("modalTitleEvento").textContent = "Editar Evento / Idea";
        document.getElementById("eventId").value = ev.id;
        document.getElementById("eventProvId").value = ev.proveedor_id;
        document.getElementById("eventTipo").value = ev.tipo || "pedido";
        document.getElementById("eventSeccion").value = ev.seccion || ""; // NEW
        document.getElementById("eventTitulo").value = ev.titulo;
        document.getElementById("eventInicio").value = toLocalInput(ev.fecha_inicio);
        document.getElementById("eventFin").value = toLocalInput(ev.fecha_fin);
        document.getElementById("eventReal").value = toLocalInput(ev.fecha_real_cierre);
        document.getElementById("eventEstado").value = ev.estado || "pendiente";
        document.getElementById("eventDesc").value = ev.descripcion || "";
        document.getElementById("btnEliminarEvent").style.display = "inline-flex";

        // If it's an idea (no date), maybe don't enforce required on date? 
        // We will remove 'required' attribute from logic if needed, but HTML has `required` on `eventInicio`.
        // Let's toggle it.
        toggleDateRequired();
    } else {
        document.getElementById("modalTitleEvento").textContent = "Nuevo Evento";
        formEvent.reset();
        document.getElementById("eventId").value = "";
        document.getElementById("eventSeccion").value = "";

        // Determine context? If clicked "Nueva Idea", maybe clear date.
        // We can pass a flag or handle separate button clicks.
        // For now, default to NOW, but user can clear it.
        const now = new Date();
        document.getElementById("eventInicio").value = toLocalInput(now.toISOString());
        document.getElementById("btnEliminarEvent").style.display = "none";
        toggleDateRequired();
    }

    modalEvent.style.display = "flex";
    modalEvent.setAttribute("aria-hidden", "false");
}

function toggleDateRequired() {
    // If user selects "Idea", maybe dates become optional?
    // Or just let them clear it. 
    // The HTML has `required` on `eventInicio`. We should remove it or manage it.
    const inputStart = document.getElementById("eventInicio");
    // Remove fixed required. We will validate in JS or let browser validate if present.
    inputStart.removeAttribute("required");
}

formEvent.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("eventId").value;

    const provId = document.getElementById("eventProvId").value;
    if (!provId || provId === "") {
        alert("Selecciona un proveedor");
        return;
    }

    // Dates can be empty (null) for Ideas
    const startVal = document.getElementById("eventInicio").value;
    const endVal = document.getElementById("eventFin").value;
    const realVal = document.getElementById("eventReal").value;

    const payload = {
        proveedor_id: provId,
        tipo: document.getElementById("eventTipo").value,
        seccion: document.getElementById("eventSeccion").value || null, // NEW
        titulo: document.getElementById("eventTitulo").value,
        fecha_inicio: startVal ? toISO(startVal) : null,
        fecha_fin: endVal ? toISO(endVal) : null,
        fecha_real_cierre: realVal ? toISO(realVal) : null,
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
        console.error(error);
        if (error.code === '42703') { // Undefined column
            alert("Error: La columna 'seccion' no existe en la base de datos. Por favor contacta al desarrollador.");
        } else {
            alert("Error guardando evento: " + error.message);
        }
    } else {
        modalEvent.style.display = "none";
        loadEvents();
    }
});

document.getElementById("btnEliminarEvent").addEventListener("click", async () => {
    const id = document.getElementById("eventId").value;
    if (!id) return;
    if (!confirm("¿Eliminar este evento/idea?")) return;

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
    document.getElementById("btnNuevaIdea").addEventListener("click", () => {
        openModalEvento();
        // Override for "Nueva Idea":
        document.getElementById("modalTitleEvento").textContent = "Nueva Idea";
        document.getElementById("eventTipo").value = "idea";
        document.getElementById("eventInicio").value = ""; // No date for ideas by default
    });

    // History Add Button
    document.getElementById("btnHistorialAdd").addEventListener("click", async () => {
        console.log("Btn Historial Clicked");
        const eventId = document.getElementById("eventId").value;
        const input = document.getElementById("historialInput");
        const text = input.value.trim();

        if (!eventId) {
            alert("Primero guarda el evento antes de agregar notas.");
            return;
        }
        if (!text) return;

        const userEmail = window.CRM_USER?.email || null;

        const { error } = await supabaseClient
            .from('eventos_historial')
            .insert([{
                evento_id: eventId,
                comentario: text,
                usuario_email: userEmail
            }]);

        if (error) {
            console.error("Error saving history:", error);
            alert("Error al guardar nota: " + error.message);
        } else {
            input.value = "";
            loadHistory(eventId); // Refresh
        }
    });

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
