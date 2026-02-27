import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import toast from 'react-hot-toast';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import { Calendar as CalendarIcon, Clock, Sun, Target, Filter, Plus, Zap, User, BookOpen } from 'lucide-react';

import { TurnoModal } from '../components/ui/TurnoModal';
import { MasivoModal } from '../components/ui/MasivoModal';

const TYPE_COLORS = {
    jornada: "#3b82f6", // Blue
    extra: "#f59e0b",   // Amber/Gold
    vacaciones: "#10b981", // Emerald
    estudio: "#8b5cf6"    // Purple
};

export default function Horarios() {
    const calendarRef = useRef(null);
    const [usersCache, setUsersCache] = useState([]);
    const [filtroEmpleado, setFiltroEmpleado] = useState("");

    // Stats state
    const [stats, setStats] = useState({ total: 0, extra: 0, vacDays: 0, studyDays: 0 });

    // Modals state
    const [modalTurnoOpen, setModalTurnoOpen] = useState(false);
    const [modalMasivoOpen, setModalMasivoOpen] = useState(false);

    const [editingTurnoId, setEditingTurnoId] = useState(null);
    const [initialTurnoData, setInitialTurnoData] = useState(null);

    // Track fetched data for stats calculation
    const [turnosCache, setTurnosCache] = useState([]);

    // Calendar controlled state
    const [calendarEvents, setCalendarEvents] = useState([]);
    const [dateRange, setDateRange] = useState({ start: null, end: null });

    // Handle calendar navigation
    const handleDatesSet = (arg) => {
        setDateRange({ start: arg.startStr, end: arg.endStr });
    };

    const [refreshCounter, setRefreshCounter] = useState(0);

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            const { data: users, error } = await supabase.from("usuarios").select("email, nombre, role").order("nombre");
            if (error) throw error;
            setUsersCache(users || []);
        } catch (err) {
            console.warn("No users found or error:", err);
            setUsersCache([]);
        }
    };

    const calculateStats = (turnos, filterVal) => {
        if (!turnos.length || !filterVal) {
            setStats({ total: 0, extra: 0, vacDays: 0, studyDays: 0 });
            return;
        }

        let totalHours = 0;
        let extraHours = 0;
        let vacDays = 0;
        let studyDays = 0;

        const calendarApi = calendarRef.current?.getApi();
        if (!calendarApi) return;

        const currentDate = calendarApi.getDate();
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();

        turnos.forEach(t => {
            const start = new Date(t.start_time);
            const end = new Date(t.end_time);

            if (start.getMonth() !== currentMonth || start.getFullYear() !== currentYear) return;

            if (t.tipo === 'vacaciones') {
                vacDays += 1;
            } else if (t.tipo === 'estudio') {
                studyDays += 1;
            } else {
                const hrs = (end - start) / (1000 * 60 * 60);
                if (hrs > 0) {
                    if (t.tipo === 'extra') {
                        extraHours += hrs;
                    } else {
                        totalHours += hrs;
                    }
                }
            }
        });

        setStats({ total: totalHours, extra: extraHours, vacDays, studyDays });
    };

    useEffect(() => {
        if (!dateRange.start || !dateRange.end) return;

        const loadTurnos = async () => {
            try {
                let query = supabase.from("turnos").select("*")
                    .gte("start_time", dateRange.start)
                    .lt("end_time", dateRange.end);

                if (filtroEmpleado) {
                    query = query.eq("usuario_email", filtroEmpleado);
                }

                const { data, error } = await query;
                if (error) throw error;

                const fetchedTurnos = data || [];
                setTurnosCache(fetchedTurnos);
                calculateStats(fetchedTurnos, filtroEmpleado);

                const getShortName = (email) => {
                    const u = usersCache.find(x => x.email === email);
                    if (u && u.nombre) return u.nombre.split(" ")[0];
                    return email ? email.split("@")[0] : "Usuario";
                };

                const mapped = fetchedTurnos.map(t => ({
                    id: String(t.id),
                    title: `${getShortName(t.usuario_email)} - ${t.tipo?.toUpperCase()}`,
                    start: t.start_time,
                    end: t.end_time,
                    backgroundColor: TYPE_COLORS[t.tipo] || "#64748b",
                    borderColor: TYPE_COLORS[t.tipo] || "#64748b",
                    allDay: t.tipo === 'vacaciones' || t.tipo === 'estudio',
                    extendedProps: {
                        usuario_email: t.usuario_email,
                        tipo: t.tipo,
                        notas: t.notas
                    }
                }));

                setCalendarEvents(mapped);
            } catch (err) {
                console.error(err);
                toast.error("Error al cargar turnos del calendario");
            }
        };

        loadTurnos();
    }, [dateRange, filtroEmpleado, usersCache, refreshCounter]);

    const toLocalInputValue = (date) => {
        if (!date) return "";
        const offsetMs = date.getTimezoneOffset() * 60 * 1000;
        const msLocal = date.getTime() - offsetMs;
        const dateLocal = new Date(msLocal);
        return dateLocal.toISOString().slice(0, 16);
    };

    const handleDateSelect = (selectInfo) => {
        setEditingTurnoId(null);
        setInitialTurnoData({
            usuario_email: filtroEmpleado || "",
            tipo: "jornada",
            inicio: toLocalInputValue(selectInfo.start),
            fin: toLocalInputValue(selectInfo.end),
            notas: ""
        });
        setModalTurnoOpen(true);
    };

    const handleEventClick = (clickInfo) => {
        const evt = clickInfo.event;
        const props = evt.extendedProps;

        setEditingTurnoId(evt.id);
        setInitialTurnoData({
            usuario_email: props.usuario_email,
            tipo: props.tipo,
            inicio: toLocalInputValue(evt.start),
            fin: toLocalInputValue(evt.end || evt.start),
            notas: props.notas || ""
        });
        setModalTurnoOpen(true);
    };

    const checkOverlap = async (email, startIso, endIso, excludeId = null) => {
        let query = supabase.from("turnos")
            .select("id")
            .eq("usuario_email", email)
            .lt("start_time", endIso)
            .gt("end_time", startIso);
        if (excludeId) query = query.neq("id", excludeId);
        const { data, error } = await query;
        return data && data.length > 0;
    };

    const handleEventDropOrResize = async (info) => {
        const evt = info.event;
        const startIso = evt.start.toISOString();

        let safeEnd = evt.end ? evt.end.toISOString() : evt.start.toISOString();
        if (!evt.end) {
            if (evt.allDay) {
                const d = new Date(evt.start);
                d.setDate(d.getDate() + 1);
                safeEnd = d.toISOString();
            } else {
                const d = new Date(evt.start);
                d.setHours(d.getHours() + 1);
                safeEnd = d.toISOString();
            }
        }

        const isOverlap = await checkOverlap(evt.extendedProps.usuario_email, startIso, safeEnd, evt.id);
        if (isOverlap) {
            toast.error(`⚠️ No se puede modificar: se superpone con otro turno.`);
            info.revert();
            return;
        }

        const { error } = await supabase.from("turnos").update({
            start_time: startIso,
            end_time: safeEnd
        }).eq("id", evt.id);

        if (error) {
            toast.error("Error al mover: " + error.message);
            info.revert();
        } else {
            toast.success("Turno actualizado");
            calculateStats(turnosCache, filtroEmpleado);
        }
    };

    const openCargaManual = () => {
        const now = new Date();
        now.setMinutes(0, 0, 0);
        const next = new Date(now);
        next.setHours(now.getHours() + 8);

        setEditingTurnoId(null);
        setInitialTurnoData({
            usuario_email: filtroEmpleado || "",
            tipo: "jornada",
            inicio: toLocalInputValue(now),
            fin: toLocalInputValue(next),
            notas: ""
        });
        setModalTurnoOpen(true);
    };

    const refetchEvents = () => {
        setRefreshCounter(prev => prev + 1);
    };

    useEffect(() => {
        refetchEvents();
    }, [filtroEmpleado]);

    return (
        <div className="page-container" style={{ padding: '0', maxWidth: '100%', margin: '0 auto', animation: 'page-enter 0.5s ease-out forwards' }}>

            {/* 1. HERO HEADER */}
            <header style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', gap: '16px' }}>
                <div>
                    <h1 style={{ fontSize: '2.2rem', fontWeight: 800, margin: '0 0 8px 0', letterSpacing: '-0.02em', background: 'linear-gradient(135deg, var(--text) 0%, var(--text-muted) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Horarios y Turnos
                    </h1>
                    <p className="muted" style={{ margin: 0, fontSize: '1.1rem' }}>
                        Gestión de jornadas, vacaciones y horas extra de empleados.
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <Button variant="secondary" onClick={() => setModalMasivoOpen(true)} className="btn-text-hide-mobile" style={{ borderRadius: '99px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Zap size={18} style={{ color: '#f59e0b' }} /> <span>Carga Masiva</span>
                    </Button>
                    <Button variant="primary" onClick={openCargaManual} className="btn-text-hide-mobile" style={{ padding: '10px 24px', fontSize: '1.05rem', fontWeight: 600, borderRadius: '99px', boxShadow: '0 8px 20px -6px rgba(37, 99, 235, 0.5)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Plus size={20} /> <span>Cargar Turno</span>
                    </Button>
                </div>
            </header>

            {/* 2. STATS BADGES (If Filtered) */}
            {filtroEmpleado && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                    <div style={{ background: 'var(--bg-elevated)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                            <Clock size={20} />
                        </div>
                        <div>
                            <div className="muted" style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Horas Totales</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stats.total.toFixed(1)} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>hs</span></div>
                        </div>
                    </div>

                    <div style={{ background: 'var(--bg-elevated)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
                            <Target size={20} />
                        </div>
                        <div>
                            <div className="muted" style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Horas Extra</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stats.extra.toFixed(1)} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>hs</span></div>
                        </div>
                    </div>

                    <div style={{ background: 'var(--bg-elevated)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                            <Sun size={20} />
                        </div>
                        <div>
                            <div className="muted" style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Días Vacaciones</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stats.vacDays} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>días</span></div>
                        </div>
                    </div>

                    <div style={{ background: 'var(--bg-elevated)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(139, 92, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b5cf6' }}>
                            <BookOpen size={20} />
                        </div>
                        <div>
                            <div className="muted" style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Días Estudio</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stats.studyDays} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>días</span></div>
                        </div>
                    </div>
                </div>
            )}

            {/* 3. GLASSMORPHIC FILTERS */}
            <section style={{
                background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '24px', padding: '24px', marginBottom: '32px', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 4px 24px -10px rgba(0, 0, 0, 0.08)', position: 'relative', overflow: 'hidden'
            }}>
                <div style={{ position: 'absolute', top: 0, left: '10%', right: '10%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)', opacity: 0.5 }}></div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text)', fontWeight: 700, fontSize: '1.1rem' }}>
                    <Filter size={18} style={{ color: 'var(--accent)' }} /> Filtrar Cronograma
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
                    <div style={{ position: 'relative', flex: '1 1 300px', maxWidth: '400px' }}>
                        <User size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                        <select className="input" value={filtroEmpleado} onChange={e => setFiltroEmpleado(e.target.value)} style={{ width: '100%', paddingLeft: '44px', borderRadius: '12px', height: '48px', fontSize: '1rem' }}>
                            <option value="">Todos los empleados</option>
                            {usersCache.map(u => (
                                <option key={u.email} value={u.email}>{u.nombre || u.email} ({u.role || 'User'})</option>
                            ))}
                        </select>
                    </div>
                    <Button variant="secondary" onClick={() => loadUsers()} style={{ borderRadius: '12px', height: '48px', padding: '0 24px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        Actualizar Vista
                    </Button>
                </div>
            </section>

            {/* 4. CALENDAR BENTO BOARD */}
            <section style={{ flex: 1, minHeight: '650px', display: 'flex', flexDirection: 'column', background: 'var(--bg-elevated)', borderRadius: '24px', padding: '24px', border: '1px solid var(--border)', boxShadow: '0 4px 24px -10px rgba(0, 0, 0, 0.08)' }}>
                <div style={{ flex: 1, backgroundColor: 'var(--bg)', borderRadius: '16px', padding: '16px', border: '1px solid var(--border)', overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
                    <FullCalendar
                        ref={calendarRef}
                        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                        initialView="dayGridMonth"
                        locale={esLocale}
                        height="auto"
                        navLinks={true}
                        headerToolbar={{
                            left: 'prev,next today',
                            center: 'title',
                            right: 'dayGridMonth,timeGridWeek'
                        }}
                        editable={true}
                        selectable={true}
                        events={calendarEvents}
                        datesSet={handleDatesSet}
                        select={handleDateSelect}
                        eventClick={handleEventClick}
                        eventDrop={handleEventDropOrResize}
                        eventResize={handleEventDropOrResize}
                    />
                </div>
            </section>

            {modalTurnoOpen && (
                <TurnoModal
                    isOpen={modalTurnoOpen}
                    onClose={() => setModalTurnoOpen(false)}
                    turnoId={editingTurnoId}
                    usersCache={usersCache}
                    initialData={initialTurnoData}
                    onSaved={refetchEvents}
                />
            )}

            {modalMasivoOpen && (
                <MasivoModal
                    isOpen={modalMasivoOpen}
                    onClose={() => setModalMasivoOpen(false)}
                    usersCache={usersCache}
                    initialUsuario={filtroEmpleado}
                    onSaved={refetchEvents}
                />
            )}
        </div>
    );
}
