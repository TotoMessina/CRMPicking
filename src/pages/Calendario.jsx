import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
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
    contactoLight: "#8b5cf6",
    contactoDark: "#00E5FF",
    internoDefault: "#FF2BD6"
};

export default function Calendario() {
    const { empresaActiva } = useAuth();
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
    }, [empresaActiva]);

    const loadUsuarios = async () => {
        if (!empresaActiva?.id) return;
        try {
            const set = new Set();
            const { data: usrs } = await supabase.from('usuarios').select('nombre, email');
            if (usrs) usrs.forEach(u => u.nombre && set.add(u.nombre));

            const { data: cls } = await supabase.from('empresa_cliente')
                .select('clientes(responsable)')
                .eq('empresa_id', empresaActiva.id)
                .not('clientes.responsable', 'is', null);
            if (cls) cls.forEach(c => c.clientes?.responsable && set.add(c.clientes.responsable));

            const { data: acts } = await supabase.from('actividades')
                .select('usuario')
                .eq('empresa_id', empresaActiva.id)
                .not('usuario', 'is', null);
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
        if (!dateRange.start || !dateRange.end || !empresaActiva?.id) return;

        const loadEvents = async () => {
            try {
                const startISO = dateRange.start;
                const endISO = dateRange.end;
                const events = [];

                // 1. Contactos (Clientes)
                if (filtroTipo === "todos" || filtroTipo === "contactos") {
                    let q = supabase.from("empresa_cliente")
                        .select("*, clientes(*)")
                        .eq("empresa_id", empresaActiva.id)
                        .eq("activo", true)
                        .gte("fecha_proximo_contacto", startISO.split("T")[0])
                        .lt("fecha_proximo_contacto", endISO.split("T")[0]);

                    if (filtroUsuario) {
                        // filtering by responsable is tricky in the join if it's on clietes, 
                        // but empresa_cliente might have its own override or just use the joined table
                        // For now we trust the client responsible field or filter post-fetch if needed
                    }

                    const { data: clientes, error } = await q;
                    if (error) throw error;

                    (clientes || []).forEach(c => {
                        if (!c.fecha_proximo_contacto) return;
                        if (filtroUsuario && c.clientes?.responsable !== filtroUsuario) return;

                        const time = c.hora_proximo_contacto ? c.hora_proximo_contacto.slice(0, 5) : "09:00";
                        const startDate = new Date(`${c.fecha_proximo_contacto}T${time}:00`);
                        const endDate = new Date(startDate.getTime() + 30 * 60000); // +30 mins
                        const color = isDarkMode ? THEME_COLORS.contactoDark : THEME_COLORS.contactoLight;

                        events.push({
                            id: `contacto-${c.clientes?.id || c.id}`,
                            title: c.clientes?.nombre || "(Sin nombre)",
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
                                clienteId: c.clientes?.id
                            }
                        });
                    });
                }

                // 2. Eventos Internos
                if (filtroTipo === "todos" || filtroTipo === "internos") {
                    const { data: evs, error } = await supabase.from("eventos")
                        .select("id, titulo, descripcion, tipo, fecha_inicio, fecha_fin, all_day, color")
                        .eq("empresa_id", empresaActiva.id)
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
    }, [dateRange, filtroUsuario, filtroTipo, isDarkMode, refreshCounter, empresaActiva]);

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
                if (!clienteId || !start || !empresaActiva?.id) return;

                const pad = (n) => String(n).padStart(2, "0");
                const dateOnly = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;
                const timeOnly = `${pad(start.getHours())}:${pad(start.getMinutes())}:00`;

                const { error } = await supabase.from("empresa_cliente").update({
                    fecha_proximo_contacto: dateOnly,
                    hora_proximo_contacto: timeOnly
                }).eq("cliente_id", clienteId).eq("empresa_id", empresaActiva.id);

                if (error) throw error;
                toast.success("Fecha de contacto actualizada");
            } else if (kind === "evento") {
                const dbId = ev.extendedProps.dbId;
                const payload = {
                    fecha_inicio: ev.start ? ev.start.toISOString() : null,
                    fecha_fin: ev.end ? ev.end.toISOString() : null,
                    all_day: !!ev.allDay
                };
                const { error } = await supabase.from("eventos").update(payload).eq("id", dbId).eq("empresa_id", empresaActiva?.id);
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
        <div className="container" style={{ padding: 'max(16px, 2vw)', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <header style={{ marginBottom: '24px', display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ margin: 0 }}>Agenda y Calendario</h1>
                    <p className="muted" style={{ margin: 0 }}>Planificación de visitas y eventos internos.</p>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    <div className="field" style={{ margin: 0, minWidth: '150px' }}>
                        <select className="input" value={filtroUsuario} onChange={(e) => setFiltroUsuario(e.target.value)}>
                            <option value="">Cualquier Usuario</option>
                            {usuarios.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                    </div>
                    <div className="field" style={{ margin: 0, minWidth: '150px' }}>
                        <select className="input" value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
                            <option value="todos">Todos los Eventos</option>
                            <option value="contactos">Solo Contactos</option>
                            <option value="internos">Solo Internos/Reuniones</option>
                        </select>
                    </div>
                    <Button onClick={() => openCreateModal()}>Nuevo Evento</Button>
                </div>
            </header>

            <div style={{ flex: 1, background: 'var(--bg-glass)', borderRadius: '16px', border: '1px solid var(--border)', padding: '16px', overflow: 'hidden' }}>
                <FullCalendar
                    ref={calendarRef}
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
                    initialView="dayGridMonth"
                    headerToolbar={{
                        left: 'prev,next today',
                        center: 'title',
                        right: 'dayGridMonth,timeGridWeek,timeGridDay,listMonth'
                    }}
                    locale={esLocale}
                    events={calendarEvents}
                    datesSet={handleDatesSet}
                    eventClick={handleEventClick}
                    dateClick={(arg) => openCreateModal(arg.date, null)}
                    selectable={true}
                    select={(arg) => openCreateModal(arg.start, arg.end)}
                    editable={true}
                    eventDrop={handleEventDropOrResize}
                    eventResize={handleEventDropOrResize}
                    height="100%"
                    dayMaxEvents={true}
                    themeSystem="standard"
                    nowIndicator={true}
                />
            </div>

            <EventoCalendarioModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                eventoId={editingId}
                clienteId={editingClienteId}
                isContacto={isContacto}
                initialData={initialData}
                onSaved={refetchEvents}
            />

            <style>{`
                .fc { --fc-border-color: var(--border); --fc-button-bg-color: var(--bg-elevated); --fc-button-border-color: var(--border); --fc-button-text-color: var(--text); --fc-button-hover-bg-color: var(--bg-active); --fc-button-active-bg-color: var(--accent); --fc-button-active-border-color: var(--accent); --fc-today-bg-color: var(--bg-active); }
                .fc-event { cursor: pointer; border-radius: 4px; padding: 1px 4px; border: none; font-size: 0.85em; }
                .fc-v-event { box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                .fc-col-header-cell { background: var(--bg-card); padding: 8px 0; }
                .fc-list-event-title b { color: var(--accent); }
            `}</style>
        </div>
    );
}
