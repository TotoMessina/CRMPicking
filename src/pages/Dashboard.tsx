import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
    Activity, Shield, Zap, Target, ArrowRight, Truck, Users, CheckCircle,
    Search, Plus, MessageSquare, Calendar, MapPin, Bug
} from 'lucide-react';
import { logger } from '../lib/logger';
import { Bar, Doughnut } from 'react-chartjs-2';
import { LiveOperationStream } from '../components/ui/LiveOperationStream';
import { 
    Chart as ChartJS, 
    CategoryScale, 
    LinearScale, 
    BarElement, 
    ArcElement, 
    Title, 
    Tooltip, 
    Legend,
    ChartData
} from 'chart.js';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { format, subDays, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { getChurnRisk } from '../utils/riskScoring';
import { usePipelineStates } from '../hooks/usePipelineStates';

// Register ChartJS
ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

interface DashboardStats {
    clientesTotal: number;
    nuevosHoy: number;
    repartidores: number;
    consumidores: number;
    crecimientoDiario: ChartData<'bar'>;
    distribucionCartera: ChartData<'doughnut'>;
    ultimasVisitas: any[];
    proximosContactos: any[];
    localesMapa: any[];
    topChurn: any[];
}

export default function Dashboard() {
    const { empresaActiva, userName } = useAuth();
    const { t } = useTranslation();
    const { states: COLUMNS, loading: loadingStates } = usePipelineStates(empresaActiva?.id);
    
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<DashboardStats>({
        clientesTotal: 0,
        nuevosHoy: 0,
        repartidores: 0,
        consumidores: 0,
        crecimientoDiario: { labels: [], datasets: [] },
        distribucionCartera: { labels: [], datasets: [] },
        ultimasVisitas: [],
        proximosContactos: [],
        localesMapa: [],
        topChurn: []
    });

    // Búsqueda Rápida en Dashboard
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);

    const handleSearch = async (val: string) => {
        setSearchQuery(val);
        if (!val.trim() || !empresaActiva?.id) {
            setSearchResults([]);
            return;
        }
        setSearching(true);
        try {
            // Primero buscamos los IDs de clientes de esta empresa
            const { data: clientIds } = await supabase
                .from('empresa_cliente')
                .select('cliente_id')
                .eq('empresa_id', empresaActiva.id)
                .eq('activo', true)
                .limit(50);

            if (!clientIds || clientIds.length === 0) {
                setSearchResults([]);
                return;
            }

            const ids = clientIds.map(c => c.cliente_id).filter((id): id is number => id !== null);

            // Luego buscamos los detalles en la tabla maestra de clientes
            const { data } = await supabase
                .from('clientes')
                .select('id, nombre_local, direccion')
                .in('id', ids)
                .ilike('nombre_local', `%${val}%`)
                .limit(5);

            setSearchResults(data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setSearching(false);
        }
    };

    const loadDashboardData = async () => {
        if (!empresaActiva?.id || !COLUMNS || COLUMNS.length === 0) return;

        try {
            const today = startOfDay(new Date()).toISOString();
            const sevenDaysAgo = subDays(new Date(), 7).toISOString();

            const activeStatus = COLUMNS.find(c => c.label.includes('Activo'))?.label || COLUMNS[Math.min(COLUMNS.length - 1, 4)]?.label;
            const relevantForChurn = COLUMNS.slice(0, Math.min(COLUMNS.length, 5)).map(c => c.label);

            const [
                { count: totalClientes },
                { count: nuevosHoyCount },
                { count: totalRepartidores },
                { count: totalConsumidores },
                { data: growthData },
                { data: stateDist },
                { data: recentVisits },
                { data: pendingContacts },
                { data: mapLocals },
                { data: churnDataResult }
            ] = await Promise.all([
                supabase.from('empresa_cliente').select('*', { count: 'exact', head: true }).eq('empresa_id', empresaActiva.id).eq('activo', true),
                supabase.from('empresa_cliente').select('*', { count: 'exact', head: true }).eq('empresa_id', empresaActiva.id).gte('created_at', today).eq('activo', true),
                supabase.from('repartidores').select('*', { count: 'exact', head: true }).eq('empresa_id', empresaActiva.id),
                supabase.from('consumidores').select('*', { count: 'exact', head: true }).eq('empresa_id', empresaActiva.id).eq('activo', true),
                supabase.from('empresa_cliente').select('created_at').eq('empresa_id', empresaActiva.id).gte('created_at', sevenDaysAgo).eq('activo', true),
                supabase.from('empresa_cliente').select('estado').eq('empresa_id', empresaActiva.id).eq('activo', true),
                supabase.from('actividades').select('id, fecha, cliente_id, descripcion').eq('empresa_id', empresaActiva.id).eq('descripcion', 'Visita realizada').order('fecha', { ascending: false }).limit(5),
                supabase.from('empresa_cliente').select('id, cliente_id, fecha_proximo_contacto').eq('empresa_id', empresaActiva.id).not('fecha_proximo_contacto', 'is', null).gte('fecha_proximo_contacto', today.split('T')[0]).order('fecha_proximo_contacto', { ascending: true }).limit(5),
                supabase.from('empresa_cliente').select('id, estado, cliente_id').eq('empresa_id', empresaActiva.id).eq('estado', activeStatus).limit(100),
                supabase.from('empresa_cliente').select('id, cliente_id, fecha_proximo_contacto, ultima_actividad, updated_at, estado').eq('empresa_id', empresaActiva.id).eq('activo', true).in('estado', relevantForChurn).limit(100)
            ]);

            const allClientIds = new Set<number>([
                ...(recentVisits?.map(v => v.cliente_id) || []),
                ...(pendingContacts?.map(c => c.cliente_id) || []),
                ...(mapLocals?.map(m => m.cliente_id) || []),
                ...(churnDataResult?.map(ch => ch.cliente_id) || [])
            ].filter((id): id is number => id !== null));

            let clientMap: Record<string, any> = {};
            if (allClientIds.size > 0) {
                const { data: clientsRaw } = await (supabase as any).from('clientes').select('id, nombre_local, lat, lng').in('id', Array.from(allClientIds));
                clientsRaw?.forEach((c: any) => { clientMap[c.id] = c; });
            }

            const recentVisitsFinal = (recentVisits || []).map(v => ({ ...v, clientes: (v.cliente_id ? clientMap[v.cliente_id] : null) || { nombre_local: 'Desconocido' } }));
            const churnDataFinal = (churnDataResult || []).map(ch => ({ ...ch, clientes: (ch.cliente_id ? clientMap[ch.cliente_id] : null) || { nombre_local: 'Desconocido' } }));

            const labelsGrid = Array.from({ length: 7 }, (_, i) => format(subDays(new Date(), 6 - i), 'EEE', { locale: es }));
            const growthCounts = Array(7).fill(0);
            growthData?.forEach(d => {
                if (!d.created_at) return;
                const dayIndex = 6 - Math.floor((new Date().getTime() - new Date(d.created_at).getTime()) / (1000 * 60 * 60 * 24));
                if (dayIndex >= 0 && dayIndex < 7) growthCounts[dayIndex]++;
            });

            const stateCountsMap: Record<string, number> = {};
            stateDist?.forEach(d => { 
                const label = d.estado || COLUMNS[0].label;
                stateCountsMap[label] = (stateCountsMap[label] || 0) + 1; 
            });

            const stateLabels = COLUMNS.map(c => c.label);
            const stateValues = COLUMNS.map(c => stateCountsMap[c.label] || 0);
            const stateColors = COLUMNS.map(c => c.color);

            setStats({
                clientesTotal: totalClientes || 0,
                nuevosHoy: nuevosHoyCount || 0,
                repartidores: totalRepartidores || 0,
                consumidores: totalConsumidores || 0,
                crecimientoDiario: {
                    labels: labelsGrid,
                    datasets: [{
                        label: t('dashboard.charts.new_clients'),
                        data: growthCounts,
                        backgroundColor: '#0c0c0c',
                        borderRadius: 8,
                        barThickness: 12
                    }]
                },
                distribucionCartera: {
                    labels: stateLabels,
                    datasets: [{
                        data: stateValues,
                        backgroundColor: stateColors,
                        borderWidth: 0,
                        hoverOffset: 15
                    }]
                },
                ultimasVisitas: recentVisitsFinal,
                proximosContactos: pendingContacts || [],
                localesMapa: (mapLocals || []).map(m => ({ ...m, clientes: (m.cliente_id ? clientMap[m.cliente_id] : null) || null })).filter(m => m.clientes?.lat && m.clientes?.lng),
                topChurn: churnDataFinal
                    .map(c => ({ ...c, risk: getChurnRisk(c) }))
                    .filter(c => c.risk.level === 'alto' || c.risk.level === 'medio')
                    .sort((a, b) => b.risk.score - a.risk.score)
                    .slice(0, 5)
            });

        } catch (error) {
            console.error("Dashboard error:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (empresaActiva?.id && COLUMNS.length > 0) {
            loadDashboardData();
        }
    }, [empresaActiva, COLUMNS]);

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { 
            y: { display: false }, 
            x: { grid: { display: false }, border: { display: false }, ticks: { color: 'var(--text-muted)', font: { size: 10, weight: '600' } } } 
        }
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
    };

    if (loading || loadingStates) return (
        <div style={{ height: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg)' }}>
            <div className="flex flex-col items-center gap-4">
                <div className="pulse-dot" style={{ width: '20px', height: '20px' }}></div>
                <span className="font-bold tracking-widest text-xs uppercase muted">{t('dashboard.sync_mission')}</span>
            </div>
        </div>
    );

    const getMapCenter = (): [number, number] => {
        if (!stats.localesMapa || stats.localesMapa.length === 0) return [-34.6, -58.4];
        const valid = stats.localesMapa.filter(l => l.clientes?.lat && l.clientes?.lng);
        if (valid.length === 0) return [-34.6, -58.4];
        const sumLat = valid.reduce((acc, curr) => acc + Number(curr.clientes.lat), 0);
        const sumLng = valid.reduce((acc, curr) => acc + Number(curr.clientes.lng), 0);
        return [sumLat / valid.length, sumLng / valid.length];
    };

    const mapCenter = getMapCenter();

    const isWidgetEnabled = (key: string) => {
        const widgets = empresaActiva?.config?.dashboardWidgets;
        if (!widgets) return true;
        return widgets[key] !== false;
    };

    return (
        <motion.div
            className="db-shell"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
        >
            {/* ── ROW 1: HERO + 4 KPI CARDS ── */}
            <div className="db-row-1">

                {/* HERO */}
                <motion.div className="db-hero" variants={itemVariants}>
                    {/* Decorative glow blobs */}
                    <div className="db-hero-blob blob-1" />
                    <div className="db-hero-blob blob-2" />

                    <div className="db-hero-inner">
                        <div className="db-badge">
                            <span className="db-badge-dot" />
                            {t('dashboard.system_active')}
                        </div>

                        <h1 className="db-hero-title">
                            {t('dashboard.welcome_back', { name: userName?.split(' ')[0] || 'Operador' })} 👋
                        </h1>
                        <p className="db-hero-sub">
                            {t('dashboard.managing')} <strong>{empresaActiva?.nombre}</strong> · {stats.nuevosHoy > 0 ? <><strong style={{ color: 'var(--accent)' }}>+{stats.nuevosHoy}</strong> {t('dashboard.new_today')}</> : t('dashboard.no_news_today')}
                        </p>

                        {/* Search */}
                        <div className="db-search-wrap">
                            <Search className="db-search-icon" size={18} />
                            <input
                                type="text"
                                className="db-search-input"
                                placeholder={t('dashboard.search_placeholder')}
                                value={searchQuery}
                                onChange={(e) => handleSearch(e.target.value)}
                            />
                            {/* Secret Debug Button (only in DEV) */}
                            {import.meta.env.DEV && (
                                <button 
                                    onClick={() => {
                                        const err = new Error('Test Error from Dashboard');
                                        logger.error('Manual Test Error', err, undefined, { source: 'dashboard_test_btn' });
                                        alert('Error enviado a Supabase (revisá la consola y la DB)');
                                    }}
                                    style={{
                                        position: 'absolute', right: '-40px', top: '10px',
                                        background: 'transparent', border: 'none', color: 'var(--border)', cursor: 'pointer'
                                    }}
                                    title="Test logger.error()"
                                >
                                    <Bug size={14} />
                                </button>
                            )}
                            {searchResults.length > 0 && (
                                <div className="db-search-results">
                                    {searchResults.map(item => (
                                        <Link key={item.id} to={`/clientes?id=${item.id}`} className="db-search-item" onClick={() => setSearchResults([])}>
                                            <div className="db-search-item-icon"><MapPin size={14} /></div>
                                            <div>
                                                <div className="db-search-item-name">{item.nombre_local}</div>
                                                <div className="db-search-item-addr">{item.direccion || t('dashboard.no_address')}</div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Quick Stats Row */}
                        <div className="db-hero-stats">
                            <div className="db-hs">
                                <span className="db-hs-num">{stats.clientesTotal}</span>
                                <span className="db-hs-lbl">{t('dashboard.hero.clients')}</span>
                            </div>
                            <div className="db-hs-div" />
                            <div className="db-hs">
                                <span className="db-hs-num">{stats.repartidores}</span>
                                <span className="db-hs-lbl">{t('dashboard.hero.in_field')}</span>
                            </div>
                            <div className="db-hs-div" />
                            <div className="db-hs">
                                <span className="db-hs-num">{stats.consumidores >= 1000 ? `${(stats.consumidores/1000).toFixed(1)}K` : stats.consumidores}</span>
                                <span className="db-hs-lbl">{t('dashboard.hero.consumers')}</span>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* KPI CARDS */}
                {isWidgetEnabled('kpis') && (
                    <div className="db-kpi-grid">
                        {[
                            { to: '/clientes', icon: <Target size={22} />, val: stats.clientesTotal, lbl: t('dashboard.kpis.pos'), badge: `+${stats.nuevosHoy}`, badgeColor: '#10b981', accent: 'var(--accent)' },
                            { to: '/repartidores', icon: <Truck size={22} />, val: stats.repartidores, lbl: t('dashboard.kpis.delivery'), badge: t('dashboard.kpis.active'), badgeColor: '#3b82f6', accent: '#3b82f6' },
                            { to: '/consumidores', icon: <Users size={22} />, val: stats.consumidores >= 1000 ? `${(stats.consumidores/1000).toFixed(1)}K` : stats.consumidores, lbl: t('dashboard.kpis.consumers'), badge: 'B2C', badgeColor: '#8b5cf6', accent: '#8b5cf6' },
                            { to: '/pipeline', icon: <Shield size={22} />, val: stats.topChurn.length, lbl: t('dashboard.kpis.churn'), badge: stats.topChurn.length > 0 ? t('dashboard.kpis.alert') : '✓ OK', badgeColor: stats.topChurn.length > 0 ? '#ef4444' : '#10b981', accent: '#ef4444' },
                        ].map((card, i) => (
                            <motion.div key={i} variants={itemVariants}>
                                <Link to={card.to} className="db-kpi-card" style={{ '--kpi-accent': card.accent } as any}>
                                    <div className="db-kpi-top">
                                        <div className="db-kpi-icon">{card.icon}</div>
                                        <span className="db-kpi-badge" style={{ background: `${card.badgeColor}18`, color: card.badgeColor }}>{card.badge}</span>
                                    </div>
                                    <div className="db-kpi-val">{card.val}</div>
                                    <div className="db-kpi-lbl">{card.lbl}</div>
                                    <div className="db-kpi-glow" style={{ background: card.accent }} />
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── ROW 2: ACTION HUB ── */}
            {isWidgetEnabled('actions') && (
                <motion.div className="db-actions-row" variants={itemVariants}>
                    <p className="db-actions-label">{t('dashboard.quick_actions')}</p>
                    <div className="db-actions-grid">
                        {[
                            { to: '/clientes', icon: <Plus size={20} />, label: t('dashboard.actions.new_client'), desc: t('dashboard.actions.new_client_desc'), color: 'var(--accent)' },
                            { to: '/ruta', icon: <MapPin size={20} />, label: t('dashboard.actions.route'), desc: t('dashboard.actions.route_desc'), color: '#3b82f6' },
                            { to: '/calendario', icon: <Calendar size={20} />, label: t('dashboard.actions.agenda'), desc: t('dashboard.actions.agenda_desc'), color: '#8b5cf6' },
                            { to: '/chat', icon: <MessageSquare size={20} />, label: t('dashboard.actions.chat'), desc: t('dashboard.actions.chat_desc'), color: '#10b981' },
                            { to: '/ia-interna', icon: <Zap size={20} />, label: t('dashboard.actions.ai'), desc: t('dashboard.actions.ai_desc'), color: '#f59e0b' },
                            { to: '/pipeline', icon: <Target size={20} />, label: t('dashboard.actions.pipeline'), desc: t('dashboard.actions.pipeline_desc'), color: '#ef4444' },
                        ].map((act, i) => (
                            <Link key={i} to={act.to} className="db-action-chip" style={{ '--chip-color': act.color } as any}>
                                <div className="db-action-chip-icon" style={{ background: `${act.color}15`, color: act.color }}>
                                    {act.icon}
                                </div>
                                <div className="db-action-chip-text">
                                    <span className="db-action-chip-label">{act.label}</span>
                                    <span className="db-action-chip-desc">{act.desc}</span>
                                </div>
                                <ArrowRight size={14} className="db-action-chip-arrow" />
                            </Link>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* ── ROW 3: MAP + FEED ── */}
            <div className="db-row-3">
                {/* MAP */}
                {isWidgetEnabled('map') && (
                    <motion.div className="db-panel db-map-panel" variants={itemVariants}>
                        <div className="db-panel-hdr">
                            <div className="db-panel-title">
                                <span className="db-title-dot" />
                                {t('dashboard.geographic_coverage')}
                            </div>
                            <Link to="/mapa" className="db-panel-link">
                                {t('common.view_all')} <ArrowRight size={12} />
                            </Link>
                        </div>
                        <div className="db-map-body">
                            <MapContainer center={mapCenter} zoom={11} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                {stats.localesMapa.map(l => (
                                    <CircleMarker
                                        key={l.id}
                                        center={[l.clientes.lat, l.clientes.lng]}
                                        radius={7}
                                        fillOpacity={0.85}
                                        color="var(--accent)"
                                        stroke={true}
                                        weight={2}
                                    >
                                        <Popup>{l.clientes?.nombre_local || 'Local'}</Popup>
                                    </CircleMarker>
                                ))}
                            </MapContainer>
                            <div className="db-map-badge">{stats.localesMapa.length} {t('dashboard.active_nodes')}</div>
                        </div>
                    </motion.div>
                )}

                {/* LIVE FEED */}
                {isWidgetEnabled('fleet') && (
                    <motion.div className="db-panel db-feed-panel" variants={itemVariants}>
                        <div className="db-panel-hdr">
                            <div className="db-panel-title">
                                <span className="db-title-dot" style={{ background: 'var(--success)' }} />
                                {t('dashboard.fleet_monitor')}
                            </div>
                            <span className="db-live-badge">LIVE</span>
                        </div>
                        <div className="db-feed-body">
                            <LiveOperationStream />
                        </div>
                    </motion.div>
                )}

                {/* CHURN */}
                {isWidgetEnabled('churn') && (
                    <motion.div className="db-panel db-churn-panel" variants={itemVariants}>
                        <div className="db-panel-hdr">
                            <div className="db-panel-title">
                                <span className="db-title-dot" style={{ background: '#ef4444' }} />
                                {t('dashboard.churn_risk')}
                            </div>
                        </div>
                        <div className="db-churn-list">
                            {stats.topChurn.length === 0 ? (
                                <div className="db-empty">
                                    <CheckCircle size={28} style={{ color: 'var(--success)', opacity: 0.6 }} />
                                    <p>{t('dashboard.no_alerts')}</p>
                                </div>
                            ) : stats.topChurn.map(c => (
                                <Link key={c.id} to={`/clientes?id=${c.cliente_id}`} className="db-churn-row">
                                    <div className="db-churn-dot" style={{ background: c.risk.level === 'alto' ? '#ef4444' : '#f59e0b' }} />
                                    <div className="db-churn-name">{c.clientes?.nombre_local}</div>
                                    <div className="db-churn-days" style={{ color: c.risk.level === 'alto' ? '#ef4444' : '#f59e0b' }}>
                                        {c.risk.diasSinContacto > 1000 ? 'N/D' : `${c.risk.diasSinContacto}${t('common.days_short')}`}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </motion.div>
                )}
            </div>

            {/* ── ROW 4: CHARTS ── */}
            <div className="db-row-4">
                {isWidgetEnabled('growth') && (
                    <motion.div className="db-panel" variants={itemVariants}>
                        <div className="db-panel-hdr">
                            <div className="db-panel-title">
                                <span className="db-title-dot" />
                                {t('dashboard.weekly_growth')}
                            </div>
                        </div>
                        <div style={{ height: 200 }}>
                            <Bar data={stats.crecimientoDiario as any} options={chartOptions as any} />
                        </div>
                    </motion.div>
                )}

                {isWidgetEnabled('mix') && (
                    <motion.div className="db-panel" variants={itemVariants}>
                        <div className="db-panel-hdr">
                            <div className="db-panel-title">
                                <span className="db-title-dot" style={{ background: '#8b5cf6' }} />
                                {t('dashboard.portfolio_mix')}
                            </div>
                        </div>
                        <div style={{ height: 200, display: 'flex', justifyContent: 'center' }}>
                            <Doughnut
                                data={stats.distribucionCartera as any}
                                options={{ ...chartOptions, plugins: { legend: { display: true, position: 'right' as const, labels: { usePointStyle: true, boxWidth: 6, font: { size: 9 }, color: 'var(--text-muted)' } } } } as any}
                            />
                        </div>
                    </motion.div>
                )}

                {/* ACTIVITY TABLE */}
                {isWidgetEnabled('activity') && (
                    <motion.div className="db-panel db-activity-panel" variants={itemVariants}>
                        <div className="db-panel-hdr">
                            <div className="db-panel-title">
                                <span className="db-title-dot" style={{ background: '#10b981' }} />
                                {t('dashboard.recent_activity')}
                            </div>
                        </div>
                        {stats.ultimasVisitas.length === 0 ? (
                            <div className="db-empty"><p>{t('dashboard.no_recent_visits')}</p></div>
                        ) : (
                            <div className="db-activity-list">
                                {stats.ultimasVisitas.map(v => (
                                    <Link key={v.id} to={`/clientes?id=${v.cliente_id}`} className="db-activity-row">
                                        <div className="db-activity-dot" />
                                        <div className="db-activity-info">
                                            <span className="db-activity-name">{v.clientes?.nombre_local || 'Desconocido'}</span>
                                            <span className="db-activity-meta">{v.fecha ? format(new Date(v.fecha), 'HH:mm', { locale: es }) : '--:--'} · {v.usuario || 'Operador'}</span>
                                        </div>
                                        <CheckCircle size={14} style={{ color: 'var(--success)', flexShrink: 0 }} />
                                    </Link>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}
            </div>

        </motion.div>
    );
}
