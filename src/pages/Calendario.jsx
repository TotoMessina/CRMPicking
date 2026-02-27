import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import toast from 'react-hot-toast';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import esLocale from '@fullcalendar/core/locales/es';

import { EventoCalendarioModal } from '../components/ui/EventoCalendarioModal';

const THEME_COLORS = {
    contactoLight: "#3b82f6",
    contactoDark: "#00E5FF",
    internoDefault: "#FF2BD6"
};

export default function Calendario() {
    const calendarRef = useRef(null);
    const [usuarios, setUsuarios] = useState([]);

    // Filters
    const [filtroUsuario, setFiltroUsuario] = useState("");
    const [filtroTipo, setFiltroTipo] = useState("todos"); // todos, contactos, internos

    // Calendar State
    const [calendarEvents, setCalendarEvents] = useState([]);
    const [dateRange, setDateRange] = useState({ start: null, end: null });
    const [refreshCounter, setRefreshCounter] = useState(0);

    const handleDatesSet = (arg) => {
        setDateRange({ start: arg.startStr, end: arg.endStr });
    };

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editingClienteId, setEditingClienteId] = useState(null);
    const [isContacto, setIsContacto] = useState(false);
    const [initialData, setInitialData] = useState(null);
    const [isDarkMode, setIsDarkMode] = useState(false);

    useEffect(() => {
        // Simple dark mode detection for event coloring
        const checkDark = () => setIsDarkMode(document.documentElement.getAttribute('data-theme') === 'dark');
        checkDark();
        const observer = new MutationObserver(checkDark);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

        loadUsuarios();
        return () => observer.disconnect();
    }, []);

    const loadUsuarios = async () => {
        try {
            const set = new Set();
            const { data: usrs } = await supabase.from('usuarios').select('nombre, email');
            if (usrs) usrs.forEach(u => u.nombre && set.add(u.nombre));

            const { data: cls } = await supabase.from('clientes').select('responsable').not('responsable', 'is', null);
            if (cls) cls.forEach(c => c.responsable && set.add(c.responsable));

            const { data: acts } = await supabase.from('actividades').select('usuario').not('usuario', 'is', null);
            if (acts) acts.forEach(a => a.usuario && set.add(a.usuario));

            const mysession = await supabase.auth.getSession();
            if (mysession.data?.session?.user) {
                const n = mysession.data.session.user.user_metadata?.nombre || mysession.data.session.user.email?.split('@')[0];
                if (n) set.add(n);
            }

            setUsuarios(Array.from(set).sort((a, b) => a.localeCompare(b)));
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        if (!dateRange.start || !dateRange.end) return;

        const loadEvents = async () => {
            try {
                const startISO = dateRange.start;
                const endISO = dateRange.end;
                const events = [];

                // 1. Contactos (Clientes)
                if (filtroTipo === "todos" || filtroTipo === "contactos") {
                    let q = supabase.from("clientes")
                        .select("id, nombre, responsable, fecha_proximo_contacto, hora_proximo_contacto")
                        .eq("activo", true)
                        .gte("fecha_proximo_contacto", startISO.split("T")[0])
                        .lt("fecha_proximo_contacto", endISO.split("T")[0]);

                    if (filtroUsuario) q = q.eq("responsable", filtroUsuario);

                    const { data: clientes, error } = await q;
                    if (error) throw error;

                    (clientes || []).forEach(c => {
                        if (!c.fecha_proximo_contacto) return;

                        const time = c.hora_proximo_contacto ? c.hora_proximo_contacto.slice(0, 5) : "09:00";
                        const startDate = new Date(`${c.fecha_proximo_contacto}T${time}:00`);
                        const endDate = new Date(startDate.getTime() + 30 * 60000); // +30 mins
                        const color = isDarkMode ? THEME_COLORS.contactoDark : THEME_COLORS.contactoLight;

                        events.push({
                            id: `contacto-${c.id}`,
                            title: c.nombre || "(Sin nombre)",
                            start: startDate.toISOString(),
                            end: endDate.toISOString(),
                            backgroundColor: color,
                            borderColor: color,
                            textColor: "#ffffff",
                            editable: true,
                            durationEditable: false,
                            startEditable: true,
                            extendedProps: {
                                kind: "contacto",
                                clienteId: c.id
                            }
                        });
                    });
                }

                // 2. Eventos Internos
                if (filtroTipo === "todos" || filtroTipo === "internos") {
                    const { data: evs, error } = await supabase.from("eventos")
                        .select("id, titulo, descripcion, tipo, fecha_inicio, fecha_fin, all_day, color")
                        .gte("fecha_inicio", startISO)
                        .lt("fecha_inicio", endISO);

                    if (error) throw error;

                    const ids = (evs || []).map(e => e.id);
                    let pivotMap = new Map();

                    if (ids.length) {
                        const { data: piv } = await supabase.from("eventos_usuarios").select("evento_id, usuario").in("evento_id", ids);
                        if (piv) piv.forEach(r => {
                            if (!pivotMap.has(r.evento_id)) pivotMap.set(r.evento_id, []);
                            pivotMap.get(r.evento_id).push(r.usuario);
                        });
                    }

                    (evs || []).forEach(e => {
                        const users = (pivotMap.get(e.id) || []).map(s => String(s).trim()).filter(Boolean);

                        if (filtroUsuario) {
                            if (users.length === 0) return; // General events hidden if strictly filtering
                            if (!users.includes(filtroUsuario)) return;
                        }

                        const color = (e.color || THEME_COLORS.internoDefault).trim();
                        const usersSuffix = !filtroUsuario && users.length ? ` (${users.length})` : "";

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
                                users: users,
                                color: color
                            }
                        });
                    });
                }

                setCalendarEvents(events);
            } catch (err) {
                console.error(err);
                toast.error("Error al cargar eventos");
            }
        };

        loadEvents();
    }, [dateRange, filtroUsuario, filtroTipo, isDarkMode, refreshCounter]);

    const toLocalInputValue = (date) => {
        if (!date) return "";
        const pad = (n) => String(n).padStart(2, "0");
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    };

    const openCreateModal = (start, end) => {
        setIsContacto(false);
        setEditingId(null);
        setEditingClienteId(null);
        setInitialData({
            inicio: start ? toLocalInputValue(start) : toLocalInputValue(new Date()),
            fin: end ? toLocalInputValue(end) : "",
            usuarios: filtroUsuario ? [filtroUsuario] : []
        });
        setModalOpen(true);
    };

    const handleEventClick = (info) => {
        const ev = info.event;
        const props = ev.extendedProps;

        if (props.kind === "contacto") {
            setIsContacto(true);
            setEditingId(null);
            setEditingClienteId(props.clienteId);
            setInitialData({
                titulo: `Contacto: ${ev.title || ""}`.trim(),
                inicio: ev.start ? toLocalInputValue(ev.start) : "",
                fin: ev.end ? toLocalInputValue(ev.end) : ""
            });
            setModalOpen(true);
        } else {
            setIsContacto(false);
            setEditingId(props.dbId);
            setEditingClienteId(null);
            setInitialData({
                titulo: (ev.title || "").replace(/\s\(\d+\)$/, ""), // remove count suffix
                descripcion: props.descripcion,
                tipo: props.tipo,
                color: props.color,
                allDay: ev.allDay,
                inicio: ev.start ? toLocalInputValue(ev.start) : "",
                fin: ev.end ? toLocalInputValue(ev.end) : "",
                usuarios: props.users || []
            });
            setModalOpen(true);
        }
    };

    const handleEventDropOrResize = async (info) => {
        const ev = info.event;
        const kind = ev.extendedProps.kind;
        const isResize = info.type === 'eventResize';

        try {
            if (kind === "contacto") {
                if (isResize) {
                    info.revert();
                    return; // Contacts cannot be resized duration-wise
                }
                const clienteId = ev.extendedProps.clienteId;
                const start = ev.start;
                if (!clienteId || !start) return;

                const pad = (n) => String(n).padStart(2, "0");
                const dateOnly = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;
                const timeOnly = `${pad(start.getHours())}:${pad(start.getMinutes())}:00`;

                const { error } = await supabase.from("clientes").update({
                    fecha_proximo_contacto: dateOnly,
                    hora_proximo_contacto: timeOnly
                }).eq("id", clienteId);

                if (error) throw error;
                toast.success("Fecha de contacto actualizada");
            } else if (kind === "evento") {
                const dbId = ev.extendedProps.dbId;
                const payload = {
                    fecha_inicio: ev.start ? ev.start.toISOString() : null,
                    fecha_fin: ev.end ? ev.end.toISOString() : null,
                    all_day: !!ev.allDay
                };
                const { error } = await supabase.from("eventos").update(payload).eq("id", dbId);
                if (error) throw error;
                toast.success("Evento actualizado");
            }
        } catch (err) {
            console.error(err);
            info.revert();
            toast.error("No se pudo guardar el cambio.");
        }
    };

    const refetchEvents = () => {
        setRefreshCounter(prev => prev + 1);
    };

    return (
        <div className="container calendar-page" style={{ padding: '16px', display: 'flex', flexDirection: 'column', height: '100%' }}>
            <header className="calendar-topbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div className="calendar-title">
                    <h1 style={{ margin: 0 }}>Calendario</h1>
                    <p className="muted" style={{ margin: 0 }}>Eventos multi-usuario + contactos editables. Arrastrá para mover.</p>
                </div>
                <div className="calendar-actions">
                    <Button variant="secondary" onClick={() => openCreateModal()}>+ Evento</Button>
                </div>
            </header>

            <section className="calendar-toolbar" style={{ display: 'flex', gap: '16px', marginBottom: '16px', background: 'var(--bg-elevated)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border)', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <label className="field" style={{ margin: 0, minWidth: '150px' }}>
                    <span className="field-label">Usuario</span>
                    <select className="input" value={filtroUsuario} onChange={e => setFiltroUsuario(e.target.value)}>
                        <option value="">Todos</option>
                        {usuarios.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                </label>

                <label className="field" style={{ margin: 0, minWidth: '200px' }}>
                    <span className="field-label">Mostrar</span>
                    <select className="input" value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
                        <option value="todos">Contactos + Eventos</option>
                        <option value="contactos">Solo contactos</option>
                        <option value="internos">Solo eventos</option>
                    </select>
                </label>

                <Button variant="secondary" onClick={() => loadUsuarios()}>Actualizar Usuarios</Button>
            </section>

            <section className="panel calendar-shell" style={{ flex: 1, minHeight: '600px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ flex: 1, backgroundColor: 'var(--bg)', borderRadius: '12px', padding: '16px', border: '1px solid var(--border)' }}>
                    <FullCalendar
                        ref={calendarRef}
                        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
                        initialView="timeGridWeek"
                        locale={esLocale}
                        nowIndicator={true}
                        height="auto"
                        headerToolbar={{
                            left: "prev,next today",
                            center: "title",
                            right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek"
                        }}
                        slotMinTime="07:00:00"
                        slotMaxTime="22:00:00"
                        selectable={true}
                        selectMirror={true}
                        editable={true}
                        eventStartEditable={true}
                        eventDurationEditable={true}
                        eventResizableFromStart={true}
                        events={calendarEvents}
                        datesSet={handleDatesSet}
                        select={(sel) => openCreateModal(sel.start, sel.end)}
                        eventClick={handleEventClick}
                        eventDrop={handleEventDropOrResize}
                        eventResize={handleEventDropOrResize}
                        eventTimeFormat={{ hour: "2-digit", minute: "2-digit", hour12: false, meridiem: false }}
                    />
                </div>
            </section>

            <EventoCalendarioModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                eventoId={editingId}
                clienteId={editingClienteId}
                initialData={initialData}
                isContacto={isContacto}
                onSaved={refetchEvents}
            />
        </div>
    );
}
