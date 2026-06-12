import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import toast from 'react-hot-toast';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import enLocale from '@fullcalendar/core/locales/en-gb';
import { Clock, Sun, Filter, Plus, Zap, BookOpen } from 'lucide-react';

import { TurnoModal } from '../components/ui/TurnoModal';
import { MasivoModal } from '../components/ui/MasivoModal';

const TYPE_COLORS: Record<string, string> = {
    jornada: "#0c0c0c", // Premium Black
    extra: "#f59e0b",   // Amber/Gold
    vacaciones: "#10b981", // Emerald
    estudio: "#3b82f6"    // Premium Blue
};

export default function Horarios() {
    const { t, i18n } = useTranslation();
    const { empresaActiva } = useAuth();
    const calendarRef = useRef<any>(null);
    const [usersCache, setUsersCache] = useState<any[]>([]);
    const [filtroEmpleado, setFiltroEmpleado] = useState("");
    const [filtroTipo, setFiltroTipo] = useState("");

    // Stats state
    const [stats, setStats] = useState({ total: 0, extra: 0, vacDays: 0, studyDays: 0 });

    // Modals state
    const [modalTurnoOpen, setModalTurnoOpen] = useState(false);
    const [modalMasivoOpen, setModalMasivoOpen] = useState(false);

    const [editingTurnoId, setEditingTurnoId] = useState<string | null>(null);
    const [initialTurnoData, setInitialTurnoData] = useState<any>(null);

    // Track fetched data for stats calculation
    const [turnosCache, setTurnosCache] = useState<any[]>([]);

    // Calendar controlled state
    const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
    const [dateRange, setDateRange] = useState<{ start: string | null; end: string | null }>({ start: null, end: null });

    // Handle calendar navigation
    const handleDatesSet = (arg: any) => {
        setDateRange({ start: arg.startStr, end: arg.endStr });
    };

    const [refreshCounter, setRefreshCounter] = useState(0);

    useEffect(() => {
        loadUsers();
    }, [empresaActiva]);

    const loadUsers = async () => {
        if (!empresaActiva?.id) return;
        try {
            const { data: rels } = await supabase.from("empresa_usuario").select("usuario_email, role").eq("empresa_id", empresaActiva.id);
            const validEmails = new Set((rels || []).map(r => r.usuario_email));

            const { data: users, error } = await supabase.from("usuarios").select("email, nombre, role").order("nombre");
            if (error) throw error;
            
            const filtered = (users || []).filter(u => u.email && validEmails.has(u.email));
            const formatted = filtered.map(u => {
                const rel = (rels || []).find(r => r.usuario_email === u.email);
                return { ...u, role: rel?.role || u.role };
            });

            setUsersCache(formatted);
        } catch (err) {
            console.warn("No users found or error:", err);
            setUsersCache([]);
        }
    };

    const calculateStats = (turnos: any[], filterVal: string) => {
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
                const hrs = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
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
        if (!dateRange.start || !dateRange.end || !empresaActiva?.id) return;

        const loadTurnos = async () => {
            try {
                let query = supabase.from("turnos").select("*")
                    .eq("empresa_id", empresaActiva.id)
                    .gte("start_time", dateRange.start)
                    .lte("start_time", dateRange.end as string);

                if (filtroEmpleado) {
                    query = query.eq("usuario_email", filtroEmpleado);
                }

                const { data, error } = await query;
                if (error) throw error;

                setTurnosCache(data || []);
                
                let filteredData = data || [];
                if (filtroTipo) {
                    filteredData = filteredData.filter(t => t.tipo === filtroTipo);
                }

                const events = filteredData.map(t => ({
                    id: t.id,
                    title: `${t.usuario_email.split('@')[0]} - ${t.tipo}`,
                    start: t.start_time,
                    end: t.end_time,
                    backgroundColor: TYPE_COLORS[t.tipo] || "#3b82f6",
                    borderColor: TYPE_COLORS[t.tipo] || "#3b82f6",
                    extendedProps: { ...t }
                }));
                setCalendarEvents(events);
                calculateStats(data || [], filtroEmpleado);
            } catch (err) {
                console.error("Error loading shifts:", err);
                toast.error(t('common.errors.load_error'));
            }
        };
        loadTurnos();
    }, [dateRange, filtroEmpleado, filtroTipo, empresaActiva, refreshCounter]);

    const refetchEvents = () => setRefreshCounter(p => p + 1);

    const handleDateSelect = (selectInfo: any) => {
        setEditingTurnoId(null);
        setInitialTurnoData({
            start_time: selectInfo.startStr,
            end_time: selectInfo.endStr,
            usuario_email: filtroEmpleado || ""
        });
        setModalTurnoOpen(true);
    };

    const handleEventClick = (clickInfo: any) => {
        setEditingTurnoId(clickInfo.event.id);
        setInitialTurnoData(clickInfo.event.extendedProps);
        setModalTurnoOpen(true);
    };

    const handleEventDropOrResize = async (changeInfo: any) => {
        const { event } = changeInfo;
        const id = event.id;
        const start = event.startStr;
        const end = event.endStr;

        const { error } = await supabase.from("turnos")
            .update({ start_time: start, end_time: end })
            .eq("id", id);

        if (error) {
            toast.error(t('common.errors.update_error'));
            changeInfo.revert();
        } else {
            toast.success(t('common.success.updated'));
            refetchEvents();
        }
    };

    return (
        <div className="horarios-page" style={{ padding: '24px' }}>
            <header style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800 }}>{t('horarios.title')}</h1>
                    <p style={{ margin: 0, color: 'var(--text-muted)' }}>{t('horarios.subtitle')}</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <Button onClick={() => { setEditingTurnoId(null); setInitialTurnoData(null); setModalTurnoOpen(true); }}>
                        <Plus size={16} style={{ marginRight: '8px' }} /> {t('horarios.new_shift')}
                    </Button>
                    <Button variant="secondary" onClick={() => setModalMasivoOpen(true)}>
                        <Zap size={16} style={{ marginRight: '8px' }} /> {t('horarios.bulk_create')}
                    </Button>
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <div className="stat-card premium black">
                    <div className="stat-squircle"><Clock size={20} /></div>
                    <div className="stat-info">
                        <div className="stat-value">{stats.total.toFixed(1)}h</div>
                        <div className="stat-label">{t('horarios.stats.total')}</div>
                    </div>
                </div>
                <div className="stat-card premium amber">
                    <div className="stat-squircle"><Zap size={20} /></div>
                    <div className="stat-info">
                        <div className="stat-value">{stats.extra.toFixed(1)}h</div>
                        <div className="stat-label">{t('horarios.stats.extra')}</div>
                    </div>
                </div>
                <div className="stat-card premium emerald">
                    <div className="stat-squircle"><Sun size={20} /></div>
                    <div className="stat-info">
                        <div className="stat-value">{stats.vacDays}</div>
                        <div className="stat-label">{t('horarios.stats.vacations')}</div>
                    </div>
                </div>
                <div className="stat-card premium blue">
                    <div className="stat-squircle"><BookOpen size={20} /></div>
                    <div className="stat-info">
                        <div className="stat-value">{stats.studyDays}</div>
                        <div className="stat-label">{t('horarios.stats.study')}</div>
                    </div>
                </div>
            </div>

            <section className="glass-card" style={{ padding: '20px' }}>
                <div style={{ marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <Filter size={18} className="text-muted" />
                    <select className="input" value={filtroEmpleado} onChange={e => setFiltroEmpleado(e.target.value)} style={{ maxWidth: '250px' }}>
                        <option value="">{t('horarios.filter_all')}</option>
                        {usersCache.map(u => <option key={u.email} value={u.email}>{u.nombre || u.email}</option>)}
                    </select>

                    <select className="input" value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} style={{ maxWidth: '200px' }}>
                        <option value="">{t('horarios.types.all')}</option>
                        <option value="jornada">{t('horarios.types.jornada')}</option>
                        <option value="extra">{t('horarios.types.extra')}</option>
                        <option value="vacaciones">{t('horarios.types.vacaciones')}</option>
                        <option value="estudio">{t('horarios.types.estudio')}</option>
                    </select>
                </div>

                <div className="calendar-container premium-calendar">
                    <FullCalendar
                        ref={calendarRef}
                        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                        initialView="timeGridWeek"
                        headerToolbar={{
                            left: 'prev,next today',
                            center: 'title',
                            right: 'dayGridMonth,timeGridWeek,timeGridDay'
                        }}
                        locale={i18n.language === 'es' ? esLocale : enLocale}
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
                    empresaActiva={empresaActiva}
                />
            )}

            {modalMasivoOpen && (
                <MasivoModal
                    isOpen={modalMasivoOpen}
                    onClose={() => setModalMasivoOpen(false)}
                    usersCache={usersCache}
                    initialUsuario={filtroEmpleado}
                    onSaved={refetchEvents}
                    empresaActiva={empresaActiva}
                />
            )}
        </div>
    );
}
