const SUPABASE_URL = "https://mflftikcvsnniwwanrkj.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mbGZ0aWtjdnNubml3d2FucmtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NjcyMjAsImV4cCI6MjA3OTE0MzIyMH0.Z_EsaegFay24E0rOoX2PpwvWasWm5tfLcJiRrgs1nBY";

const supabaseClient = (window.CRM_AUTH && window.CRM_AUTH.supabaseClient)
  ? window.CRM_AUTH.supabaseClient
  : supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const THEME_KEY = "crm_theme";
/* ============================
   AUTH (Supabase) - Login Gate
   Requiere que se carguen auth.js y guard.js en el HTML.
   Si no están, usa fallback con supabaseClient.auth.getSession().
   ============================ */
async function requireAuthOrRedirect() {
  // Esperar a que guard.js termine (evita condiciones de carrera)
  if (window.CRM_GUARD_READY) {
    try { await window.CRM_GUARD_READY; } catch (_) {}
  }

  // Si guard.js ya seteo el usuario, listo
  if (window.CRM_USER && window.CRM_USER.activo === true) return window.CRM_USER;

  // Fallback: chequear sesión y (si existe) cargar perfil desde public.usuarios
  try {
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) throw error;

    const session = data?.session;
    if (!session?.user) {
      window.location.href = "login.html";
      return null;
    }

    // Intentar traer perfil si tu esquema lo usa
    if (!window.CRM_USER) {
      const { data: perfil, error: e2 } = await supabaseClient
        .from("usuarios")
        .select("id, email, nombre, role, activo")
        .eq("id", session.user.id)
        .single();

      if (!e2 && perfil && perfil.activo === true) {
        window.CRM_USER = perfil;
        localStorage.setItem("usuarioActual", (perfil.nombre || "").trim());
      } else {
        // Si no existe tabla usuarios, al menos permitimos entrar con sesión
        window.CRM_USER = {
          id: session.user.id,
          email: session.user.email || "",
          nombre: (session.user.email || "Usuario").split("@")[0],
          role: "user",
          activo: true,
        };
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
  const n = (window.CRM_USER?.nombre || "").trim();
  if (n) return n;
  return (localStorage.getItem("usuarioActual") || "").trim();
}


let calendar;

// Defaults
const DEFAULTS = {
  contactoDark: "#00E5FF",
  contactoLight: "#3b82f6",
  interno: "#FF2BD6",
};

// Usuarios (lista)
let usuariosList = []; // ["Juan", "Maria", ...]

// ---------------- Theme ----------------
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(THEME_KEY, theme);
  const btn = document.getElementById("btnToggleTheme");
  if (btn) btn.textContent = theme === "dark" ? "Modo día" : "Modo noche";
}
function isDark() {
  return (document.documentElement.getAttribute("data-theme") || "light") === "dark";
}

// ---------------- Date helpers ----------------
function toLocalInputValue(date) {
  const pad = (n) => String(n).padStart(2, "0");
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  return `${y}-${m}-${d}T${hh}:${mm}`;
}
function parseLocal(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}
function dateOnlyISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function timeHHMM(d) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:00`;
}

// ---------------- Modal helpers ----------------
function showModal() {
  document.getElementById("modalEvento").style.display = "block";
}
function closeModal() {
  document.getElementById("modalEvento").style.display = "none";
}

function setModalMode(kind) {
  document.getElementById("modalKind").value = kind;

  const rowTipoColor = document.getElementById("rowTipoColor");
  const rowUsers = document.getElementById("rowUsuariosChecklist");
  const rowAllDay = document.getElementById("rowAllDay");
  const btnEliminar = document.getElementById("btnEliminarEvento");
  const desc = document.getElementById("evDesc");
  const labelDesc = document.getElementById("labelDesc");

  if (kind === "contacto") {
    rowTipoColor.style.display = "none";
    rowUsers.style.display = "none";
    rowAllDay.style.display = "none";
    btnEliminar.style.display = "none";

    // historial visible (solo lectura)
    desc.readOnly = true;
    labelDesc.textContent = "Historial del cliente (últimas actividades)";
  } else {
    rowTipoColor.style.display = "";
    rowUsers.style.display = "";
    rowAllDay.style.display = "";
    btnEliminar.style.display = "inline-flex";

    desc.readOnly = false;
    labelDesc.textContent = "Descripción";
  }
}

// ---------------- Usuarios: cargar y render checklist ----------------
// Si existe tabla usuarios -> usarla; si no, fallback a clientes.responsable + actividades.usuario
async function cargarUsuarios() {
  const set = new Set();

  // 1) Intentar tabla usuarios
  try {
    const { data, error } = await supabaseClient.from("usuarios").select("nombre, email");
    if (!error && data && data.length) {
      data.forEach((u) => {
        const label = (u.nombre || u.email || "").toString().trim();
        if (label) set.add(label);
      });
    }
  } catch (_) {}

  // 2) Fallback
  if (set.size === 0) {
    const [c1, a1] = await Promise.all([
      supabaseClient.from("clientes").select("responsable").eq("activo", true),
      supabaseClient.from("actividades").select("usuario"),
    ]);

    (c1.data || []).forEach((r) => {
      const v = (r.responsable || "").toString().trim();
      if (v) set.add(v);
    });
    (a1.data || []).forEach((r) => {
      const v = (r.usuario || "").toString().trim();
      if (v) set.add(v);
    });
  }

  usuariosList = Array.from(set).sort((a, b) => a.localeCompare(b, "es"));
}

function renderUsuariosUI() {
  // Filtro
  const filtro = document.getElementById("filtroUsuarioCalendar");
  if (filtro) {
    const current = filtro.value || "";
    filtro.innerHTML = `<option value="">Todos</option>`;
    usuariosList.forEach((u) => {
      const opt = document.createElement("option");
      opt.value = u;
      opt.textContent = u;
      filtro.appendChild(opt);
    });
    filtro.value = current;
  }

  // Checklist (modal)
  const box = document.getElementById("usuariosChecklist");
  if (!box) return;

  box.innerHTML = "";
  usuariosList.forEach((u) => {
    const id = `chk_${u.replace(/[^a-z0-9]/gi, "_")}`;
    const item = document.createElement("label");
    item.className = "check-item";
    item.innerHTML = `
      <input type="checkbox" value="${u}" id="${id}">
      <span>${u}</span>
    `;
    box.appendChild(item);
  });
}

function getSelectedUsersFromChecklist() {
  const box = document.getElementById("usuariosChecklist");
  if (!box) return [];
  return Array.from(box.querySelectorAll('input[type="checkbox"]:checked')).map((i) => i.value);
}
function setSelectedUsersToChecklist(users) {
  const box = document.getElementById("usuariosChecklist");
  if (!box) return;
  const set = new Set((users || []).map((s) => String(s).trim()).filter(Boolean));
  box.querySelectorAll('input[type="checkbox"]').forEach((i) => {
    i.checked = set.has(i.value);
  });
}
function selectAllUsers() {
  const box = document.getElementById("usuariosChecklist");
  if (!box) return;
  box.querySelectorAll('input[type="checkbox"]').forEach((i) => (i.checked = true));
}
function clearAllUsers() {
  const box = document.getElementById("usuariosChecklist");
  if (!box) return;
  box.querySelectorAll('input[type="checkbox"]').forEach((i) => (i.checked = false));
}

// ---------------- Pivote: persist users ----------------
async function setEventUsers(eventoId, users) {
  const cleaned = (users || []).map((u) => String(u).trim()).filter(Boolean);

  // limpiar actuales
  const { error: delErr } = await supabaseClient
    .from("eventos_usuarios")
    .delete()
    .eq("evento_id", eventoId);
  if (delErr) throw delErr;

  if (!cleaned.length) return;

  const payload = cleaned.map((u) => ({ evento_id: eventoId, usuario: u }));
  const { error: insErr } = await supabaseClient.from("eventos_usuarios").insert(payload);
  if (insErr) throw insErr;
}

// ---------------- Fetch events ----------------
async function fetchCalendarEvents(info, successCallback, failureCallback) {
  try {
    const usuarioFilter = document.getElementById("filtroUsuarioCalendar")?.value || "";
    const tipoFilter = document.getElementById("filtroTipo")?.value || "todos";
    const startISO = info.startStr;
    const endISO = info.endStr;

    const events = [];

    // 1) Contactos (clientes): filtra por cliente.responsable = usuario
    if (tipoFilter === "todos" || tipoFilter === "contactos") {
      let q = supabaseClient
        .from("clientes")
        .select("id, nombre, responsable, fecha_proximo_contacto, hora_proximo_contacto")
        .eq("activo", true)
        .gte("fecha_proximo_contacto", startISO.split("T")[0])
        .lt("fecha_proximo_contacto", endISO.split("T")[0]);

      if (usuarioFilter) q = q.eq("responsable", usuarioFilter);

      const { data: clientes, error } = await q;
      if (error) throw error;

      (clientes || []).forEach((c) => {
        if (!c.fecha_proximo_contacto) return;

        const baseDate = c.fecha_proximo_contacto;
        const time = c.hora_proximo_contacto ? c.hora_proximo_contacto.slice(0, 5) : "09:00";
        const start = new Date(`${baseDate}T${time}:00`);
        const end = new Date(start.getTime() + 30 * 60000);

        const color = isDark() ? DEFAULTS.contactoDark : DEFAULTS.contactoLight;

        events.push({
          id: `contacto-${c.id}`,
          title: c.nombre || "(Sin nombre)",
          start: start.toISOString(),
          end: end.toISOString(),
          backgroundColor: color,
          borderColor: color,
          textColor: "#ffffff",
          editable: true,
          durationEditable: false,
          startEditable: true,
          extendedProps: {
            kind: "contacto",
            clienteId: c.id,
          },
        });
      });
    }

    // 2) Eventos internos (eventos + pivote)
    if (tipoFilter === "todos" || tipoFilter === "internos") {
      // Traemos eventos del rango
      const { data: evs, error: err2 } = await supabaseClient
        .from("eventos")
        .select("id, titulo, descripcion, tipo, fecha_inicio, fecha_fin, all_day, color")
        .gte("fecha_inicio", startISO)
        .lt("fecha_inicio", endISO)
        .order("fecha_inicio", { ascending: true });

      if (err2) throw err2;

      const ids = (evs || []).map((e) => e.id);
      let pivotMap = new Map(); // id -> [usuarios]

      if (ids.length) {
        const { data: piv, error: pivErr } = await supabaseClient
          .from("eventos_usuarios")
          .select("evento_id, usuario")
          .in("evento_id", ids);

        if (pivErr) throw pivErr;

        (piv || []).forEach((r) => {
          if (!pivotMap.has(r.evento_id)) pivotMap.set(r.evento_id, []);
          pivotMap.get(r.evento_id).push(r.usuario);
        });
      }

      (evs || []).forEach((e) => {
        const users = (pivotMap.get(e.id) || []).map((s) => String(s).trim()).filter(Boolean);

        // filtro: si el usuario está seleccionado, el evento se muestra solo si está en la lista.
        if (usuarioFilter) {
          if (users.length === 0) return; // evento “general” no aparece si filtrás por usuario
          if (!users.includes(usuarioFilter)) return;
        }

        const color = (e.color || DEFAULTS.interno).trim();
        const usersSuffix = !usuarioFilter && users.length ? ` (${users.length})` : "";

        events.push({
          id: `evento-${e.id}`,
          title: `${e.titulo}${usersSuffix}`,
          start: e.fecha_inicio,
          end: e.fecha_fin || null,
          allDay: !!e.all_day,
          backgroundColor: color,
          borderColor: color,
          textColor: "#ffffff",
          editable: true,
          extendedProps: {
            kind: "evento",
            dbId: e.id,
            descripcion: e.descripcion || "",
            tipo: e.tipo || "interno",
            users,
            color,
          },
        });
      });
    }

    successCallback(events);
  } catch (err) {
    console.error(err);
    failureCallback(err);
  }
}

// ---------------- Contacto: cargar historial ----------------
async function buildHistorialTexto(clienteId) {
  const { data, error } = await supabaseClient
    .from("actividades")
    .select("fecha, descripcion, usuario")
    .eq("cliente_id", clienteId)
    .order("fecha", { ascending: false })
    .limit(30);

  if (error) {
    console.error(error);
    return "No se pudo cargar el historial.";
  }

  const acts = data || [];
  if (!acts.length) return "No hay actividades registradas.";

  const lines = acts.map((a) => {
    const f = a.fecha ? new Date(a.fecha) : null;
    const fechaTxt = f && !Number.isNaN(f.getTime())
      ? f.toLocaleString("es-AR", { year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit" })
      : "(sin fecha)";
    const userTxt = a.usuario ? ` · ${a.usuario}` : "";
    return `• ${fechaTxt}${userTxt}\n  ${a.descripcion || ""}`.trimEnd();
  });

  return lines.join("\n\n");
}

// ---------------- Open modals ----------------
function openModalNuevoEvento(prefillStart, prefillEnd) {
  document.getElementById("modalTitulo").textContent = "Nuevo evento";
  setModalMode("evento");

  document.getElementById("eventoId").value = "";
  document.getElementById("clienteId").value = "";

  document.getElementById("evTitulo").value = "";
  document.getElementById("evDesc").value = "";
  document.getElementById("evTipo").value = "interno";
  document.getElementById("evAllDay").checked = false;

  // default: users seleccionados = filtro actual (si hay)
  const filtroUsuario = document.getElementById("filtroUsuarioCalendar")?.value || "";
  setSelectedUsersToChecklist(filtroUsuario ? [filtroUsuario] : []);

  document.getElementById("evColor").value = DEFAULTS.interno;

  const start = prefillStart ? new Date(prefillStart) : new Date();
  const end = prefillEnd ? new Date(prefillEnd) : null;

  document.getElementById("evInicio").value = toLocalInputValue(start);
  document.getElementById("evFin").value = end ? toLocalInputValue(end) : "";

  showModal();
}

function openModalEditarEvento(fcEvent) {
  document.getElementById("modalTitulo").textContent = "Editar evento";
  setModalMode("evento");

  document.getElementById("eventoId").value = fcEvent.extendedProps.dbId;
  document.getElementById("clienteId").value = "";

  document.getElementById("evTitulo").value = (fcEvent.title || "").replace(/\s\(\d+\)$/, "");
  document.getElementById("evDesc").value = fcEvent.extendedProps.descripcion || "";
  document.getElementById("evTipo").value = fcEvent.extendedProps.tipo || "interno";
  document.getElementById("evAllDay").checked = !!fcEvent.allDay;
  document.getElementById("evColor").value = (fcEvent.extendedProps.color || DEFAULTS.interno);

  setSelectedUsersToChecklist(fcEvent.extendedProps.users || []);

  document.getElementById("evInicio").value = fcEvent.start ? toLocalInputValue(fcEvent.start) : "";
  document.getElementById("evFin").value = fcEvent.end ? toLocalInputValue(fcEvent.end) : "";

  showModal();
}

async function openModalEditarContacto(fcEvent) {
  document.getElementById("modalTitulo").textContent = "Editar contacto";
  setModalMode("contacto");

  const clienteId = fcEvent.extendedProps.clienteId;
  document.getElementById("eventoId").value = "";
  document.getElementById("clienteId").value = clienteId;

  document.getElementById("evTitulo").value = `Contacto: ${fcEvent.title || ""}`.trim();
  document.getElementById("evInicio").value = fcEvent.start ? toLocalInputValue(fcEvent.start) : "";
  document.getElementById("evFin").value = fcEvent.end ? toLocalInputValue(fcEvent.end) : "";

  // historial
  document.getElementById("evDesc").value = "Cargando historial...";
  const hist = await buildHistorialTexto(clienteId);
  document.getElementById("evDesc").value = hist;

  showModal();
}

// ---------------- Submit ----------------
async function onSubmitModal(e) {
  e.preventDefault();

  const kind = document.getElementById("modalKind").value;
  const inicio = parseLocal(document.getElementById("evInicio").value);
  const fin = parseLocal(document.getElementById("evFin").value);

  if (!inicio) {
    alert("Completá inicio.");
    return;
  }

  // CONTACTO: solo mueve fecha/hora en clientes
  if (kind === "contacto") {
    const clienteId = document.getElementById("clienteId").value;
    if (!clienteId) return;

    const payload = {
      fecha_proximo_contacto: dateOnlyISO(inicio),
      hora_proximo_contacto: timeHHMM(inicio),
    };

    const { error } = await supabaseClient.from("clientes").update(payload).eq("id", clienteId);
    if (error) {
      console.error(error);
      alert("No se pudo actualizar el contacto.");
      return;
    }

    closeModal();
    calendar.refetchEvents();
    return;
  }

  // EVENTO: guarda en eventos + pivote eventos_usuarios
  const id = document.getElementById("eventoId").value;
  const titulo = document.getElementById("evTitulo").value.trim();
  if (!titulo) {
    alert("Completá el título.");
    return;
  }

  const payload = {
    titulo,
    descripcion: (document.getElementById("evDesc").value || "").trim() || null,
    tipo: document.getElementById("evTipo").value,
    all_day: document.getElementById("evAllDay").checked,
    fecha_inicio: inicio.toISOString(),
    fecha_fin: fin ? fin.toISOString() : null,
    color: (document.getElementById("evColor").value || "").trim() || null,
  };

  try {
    let eventoId = id;

    if (id) {
      const { error } = await supabaseClient.from("eventos").update(payload).eq("id", id);
      if (error) throw error;
    } else {
      const { data, error } = await supabaseClient.from("eventos").insert(payload).select("id").single();
      if (error) throw error;
      eventoId = data.id;
    }

    // users checklist
    const selectedUsers = getSelectedUsersFromChecklist();
    await setEventUsers(eventoId, selectedUsers);

    closeModal();
    calendar.refetchEvents();
  } catch (err) {
    console.error(err);
    alert("No se pudo guardar el evento.");
  }
}

// ---------------- Delete ----------------
async function onEliminarEvento() {
  const kind = document.getElementById("modalKind").value;
  if (kind !== "evento") return;

  const id = document.getElementById("eventoId").value;
  if (!id) return;

  if (!confirm("¿Eliminar este evento?")) return;

  const { error } = await supabaseClient.from("eventos").delete().eq("id", id);
  if (error) {
    console.error(error);
    alert("No se pudo eliminar el evento.");
    return;
  }

  closeModal();
  calendar.refetchEvents();
}

// ---------------- Drag/Resize persist ----------------
async function onEventDrop(info) {
  const ev = info.event;
  const kind = ev.extendedProps.kind;

  try {
    if (kind === "contacto") {
      const clienteId = ev.extendedProps.clienteId;
      const start = ev.start;
      if (!clienteId || !start) return;

      const payload = {
        fecha_proximo_contacto: dateOnlyISO(start),
        hora_proximo_contacto: timeHHMM(start),
      };

      const { error } = await supabaseClient.from("clientes").update(payload).eq("id", clienteId);
      if (error) throw error;
      return;
    }

    if (kind === "evento") {
      const dbId = ev.extendedProps.dbId;
      const payload = {
        fecha_inicio: ev.start ? ev.start.toISOString() : null,
        fecha_fin: ev.end ? ev.end.toISOString() : null,
        all_day: !!ev.allDay,
      };
      const { error } = await supabaseClient.from("eventos").update(payload).eq("id", dbId);
      if (error) throw error;
      return;
    }
  } catch (err) {
    console.error(err);
    info.revert();
    alert("No se pudo guardar el cambio.");
  }
}

async function onEventResize(info) {
  const ev = info.event;
  const kind = ev.extendedProps.kind;

  if (kind === "contacto") {
    info.revert();
    return;
  }

  try {
    const dbId = ev.extendedProps.dbId;
    const payload = {
      fecha_inicio: ev.start ? ev.start.toISOString() : null,
      fecha_fin: ev.end ? ev.end.toISOString() : null,
      all_day: !!ev.allDay,
    };
    const { error } = await supabaseClient.from("eventos").update(payload).eq("id", dbId);
    if (error) throw error;
  } catch (err) {
    console.error(err);
    info.revert();
    alert("No se pudo guardar el cambio.");
  }
}

// ---------------- Init ----------------
document.addEventListener("DOMContentLoaded", async () => {
  const profile = await requireAuthOrRedirect();
  if (!profile) return;

  // Mostrar usuario si existe placeholder
  const userEl = document.getElementById("currentUserName");
  if (userEl) userEl.textContent = getAuthUserName() || "-";

const savedTheme = localStorage.getItem(THEME_KEY) || "light";
  applyTheme(savedTheme);

  document.getElementById("btnToggleTheme")?.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme") || "light";
    applyTheme(current === "light" ? "dark" : "light");
    calendar.refetchEvents();
  });

  await cargarUsuarios();
  renderUsuariosUI();

  document.getElementById("btnRefrescarCalendar")?.addEventListener("click", async () => {
    await cargarUsuarios();
    renderUsuariosUI();
    calendar.refetchEvents();
  });

  document.getElementById("filtroUsuarioCalendar")?.addEventListener("change", () => calendar.refetchEvents());
  document.getElementById("filtroTipo")?.addEventListener("change", () => calendar.refetchEvents());

  document.getElementById("btnNuevoEvento")?.addEventListener("click", () => openModalNuevoEvento());
  document.getElementById("btnCerrarModal")?.addEventListener("click", closeModal);
  document.getElementById("modalEvento")?.addEventListener("click", (ev) => {
    if (ev.target?.id === "modalEvento") closeModal();
  });

  document.getElementById("formEvento")?.addEventListener("submit", onSubmitModal);
  document.getElementById("btnEliminarEvento")?.addEventListener("click", onEliminarEvento);

  document.getElementById("btnSelectAllUsers")?.addEventListener("click", selectAllUsers);
  document.getElementById("btnClearAllUsers")?.addEventListener("click", clearAllUsers);

  const el = document.getElementById("calendar");
  calendar = new FullCalendar.Calendar(el, {
    initialView: "timeGridWeek",
    locale: "es",
    nowIndicator: true,
    height: "auto",

    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek",
    },

    slotMinTime: "07:00:00",
    slotMaxTime: "22:00:00",

    selectable: true,
    selectMirror: true,

    editable: true,
    eventStartEditable: true,
    eventDurationEditable: true,
    eventResizableFromStart: true,

    events: fetchCalendarEvents,

    select: (sel) => openModalNuevoEvento(sel.start, sel.end),

    eventClick: async (info) => {
      const kind = info.event.extendedProps.kind;
      if (kind === "contacto") {
        await openModalEditarContacto(info.event);
        return;
      }
      openModalEditarEvento(info.event);
    },

    eventDrop: onEventDrop,
    eventResize: onEventResize,

    eventTimeFormat: { hour: "2-digit", minute: "2-digit", hour12: false },
  });

  calendar.render();
});
