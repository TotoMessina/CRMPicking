import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
    Search, MoreVertical, Calendar, User, Clock, CheckCircle, 
    Map as MapIcon, Users, Truck, TrendingUp, TrendingDown,
    Activity, Shield, Zap, Target, ArrowRight
} from 'lucide-react';
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
    Legend 
} from 'chart.js';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { format, subDays, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { barValueLabelPlugin } from '../constants/statsConstants';
import { getChurnRisk } from '../utils/riskScoring';
import { usePipelineStates } from '../hooks/usePipelineStates';

// Register ChartJS
ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

export default function Dashboard() {
    const { empresaActiva, user, userName } = useAuth();
    const { states: COLUMNS, loading: loadingStates } = usePipelineStates(empresaActiva?.id);
    
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
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

    const loadDashboardData = async () => {
        if (!empresaActiva?.id || !COLUMNS || COLUMNS.length === 0) return;

        try {
            const today = startOfDay(new Date()).toISOString();
            const sevenDaysAgo = subDays(new Date(), 7).toISOString();

            // Find relevant statuses for filtering (fallback to defaults if names changed)
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

            const allClientIds = new Set([
                ...(recentVisits?.map(v => v.cliente_id) || []),
                ...(pendingContacts?.map(c => c.cliente_id) || []),
                ...(mapLocals?.map(m => m.cliente_id) || []),
                ...(churnDataResult?.map(ch => ch.cliente_id) || [])
            ].filter(Boolean));

            let clientMap = {};
            if (allClientIds.size > 0) {
                const { data: clientsRaw } = await supabase.from('clientes').select('id, nombre_local, lat, lng').in('id', Array.from(allClientIds));
                clientsRaw?.forEach(c => { clientMap[c.id] = c; });
            }

            const recentVisitsFinal = (recentVisits || []).map(v => ({ ...v, clientes: clientMap[v.cliente_id] || { nombre_local: 'Desconocido' } }));
            const churnDataFinal = (churnDataResult || []).map(ch => ({ ...ch, clientes: clientMap[ch.cliente_id] || { nombre_local: 'Desconocido' } }));

            const labelsGrid = Array.from({ length: 7 }, (_, i) => format(subDays(new Date(), 6 - i), 'EEE', { locale: es }));
            const growthCounts = Array(7).fill(0);
            growthData?.forEach(d => {
                const dayIndex = 6 - Math.floor((new Date().getTime() - new Date(d.created_at).getTime()) / (1000 * 60 * 60 * 24));
                if (dayIndex >= 0 && dayIndex < 7) growthCounts[dayIndex]++;
            });

            // Calculate distribution using dynamic labels/colors
            const stateCountsMap = {};
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
                        label: 'Nuevos Locales',
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
                localesMapa: (mapLocals || []).map(m => ({ ...m, clientes: clientMap[m.cliente_id] || null })).filter(m => m.clientes?.lat),
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
                <span className="font-bold tracking-widest text-xs uppercase muted">Sincronizando Misión Control...</span>
            </div>
        </div>
    );

    return (
        <motion.div 
            className="dashboard-mission-control"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
        >
            {/* 1. HERO SECTION */}
            <motion.div className="hero-section-pro" variants={itemVariants}>
                <div className="hero-content">
                    <div className="hero-subtitle-pro">
                        <Activity size={16} style={{ color: 'var(--accent)' }} /> 
                        SISTEMA OPERATIVO ACTIVO
                    </div>
                    <h1 className="hero-title-pro">HOLA, {userName?.split(' ')[0] || 'ADMIN'}</h1>
                    <p className="muted" style={{ fontSize: '1.1rem', marginBottom: '24px' }}>
                        Supervisando **{empresaActiva?.nombre}**. Tenés {stats.nuevosHoy} actualizaciones críticas hoy.
                    </p>
                    
                    <div className="hero-stats-quick">
                        <div className="stat-inline">
                            <span className="stat-inline-val">{stats.clientesTotal}</span>
                            <span className="stat-inline-label">Puntos de Venta</span>
                        </div>
                        <div className="stat-inline" style={{ borderLeft: '1px solid var(--border)', paddingLeft: '32px' }}>
                            <span className="stat-inline-val">{stats.repartidores}</span>
                            <span className="stat-inline-label">Unidades en Campo</span>
                        </div>
                    </div>
                </div>
                <div className="hero-deco deco-1"></div>
                <div className="hero-deco deco-2"></div>
            </motion.div>

            {/* 2. KPI ROW */}
            <div className="metrics-row">
                <motion.div 
                    className="glass-card-pro metric-card-pro cursor-pointer" 
                    variants={itemVariants}
                    onClick={() => window.location.hash = '#/clientes'}
                    style={{ cursor: 'pointer' }}
                >
                    <div className="flex justify-between items-start" style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div className="metric-icon-box"><Target size={24} /></div>
                        <div className="metric-trend trend-up-pro">+{stats.nuevosHoy} Hoy</div>
                    </div>
                    <div className="metric-val-large">{stats.clientesTotal}</div>
                    <div className="stat-inline-label">Alcance Global</div>
                </motion.div>

                <motion.div 
                    className="glass-card-pro metric-card-pro" 
                    variants={itemVariants}
                    onClick={() => window.location.hash = '#/repartidores'}
                    style={{ cursor: 'pointer' }}
                >
                    <div className="flex justify-between items-start" style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div className="metric-icon-box"><Truck size={24} /></div>
                    </div>
                    <div className="metric-val-large">{stats.repartidores}</div>
                    <div className="stat-inline-label">Operadores Activos</div>
                </motion.div>

                <motion.div 
                    className="glass-card-pro metric-card-pro" 
                    variants={itemVariants}
                    onClick={() => window.location.hash = '#/consumidores'}
                    style={{ cursor: 'pointer' }}
                >
                    <div className="flex justify-between items-start" style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div className="metric-icon-box"><Users size={24} /></div>
                    </div>
                    <div className="metric-val-large">{stats.consumidores >= 1000 ? `${(stats.consumidores / 1000).toFixed(1)}K` : stats.consumidores}</div>
                    <div className="stat-inline-label">Comunidad B2C</div>
                </motion.div>

                <motion.div 
                    className="glass-card-pro metric-card-pro" 
                    variants={itemVariants}
                    onClick={() => window.location.hash = '#/pipeline'}
                    style={{ cursor: 'pointer' }}
                >
                    <div className="flex justify-between items-start" style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div className="metric-icon-box" style={{ color: '#ef4444' }}><Shield size={24} /></div>
                        <div className="metric-trend trend-down-pro" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>Crítico</div>
                    </div>
                    <div className="metric-val-large">{stats.topChurn.length}</div>
                    <div className="stat-inline-label">Fugas Detectadas</div>
                </motion.div>
            </div>

            {/* 3. MAIN GRID (INTELLIGENCE + OPERATIONS) */}
            <div className="ops-main-grid">
                
                {/* LEFT: INTELLIGENCE HUB */}
                <div className="intelligence-hub">
                    <motion.div className="glass-card-pro" variants={itemVariants}>
                        <div className="section-header-pro">
                            <h2 className="section-title-pro">Cobertura Geográfica Inteligente</h2>
                            <Link to="/mapa" className="btn-link" style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                MAPA COMPLETO <ArrowRight size={14}/>
                            </Link>
                        </div>
                        <div className="map-container-pro">
                            <MapContainer center={[-34.6, -58.4]} zoom={11} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                {stats.localesMapa.map(l => (
                                    <CircleMarker 
                                        key={l.id} 
                                        center={[l.clientes.lat, l.clientes.lng]} 
                                        radius={5} 
                                        fillOpacity={0.8} 
                                        color="var(--accent)" 
                                        stroke={true}
                                        weight={2}
                                    >
                                        <Popup>{l.clientes.nombre_local}</Popup>
                                    </CircleMarker>
                                ))}
                            </MapContainer>
                            <div className="map-pro-overlay">
                                <div className="badge-live" style={{ background: 'var(--bg-glass)', border: '1px solid var(--border)', padding: '6px 12px', borderRadius: '8px', fontSize: '10px', fontWeight: '800' }}>
                                    {stats.localesMapa.length} NODOS ACTIVOS
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                        <motion.div className="glass-card-pro" variants={itemVariants} style={{ height: '280px' }}>
                            <div className="section-header-pro" style={{ marginBottom: '12px' }}>
                                <h2 className="section-title-pro">Performance de Crecimiento</h2>
                            </div>
                            <div style={{ height: '180px' }}>
                                <Bar data={stats.crecimientoDiario} options={chartOptions} />
                            </div>
                        </motion.div>

                        <motion.div className="glass-card-pro" variants={itemVariants} style={{ height: '280px' }}>
                            <div className="section-header-pro" style={{ marginBottom: '12px' }}>
                                <h2 className="section-title-pro">Mix de Cartera</h2>
                            </div>
                            <div style={{ height: '180px' }}>
                                <Doughnut 
                                    data={stats.distribucionCartera} 
                                    options={{ ...chartOptions, plugins: { legend: { display: true, position: 'right', labels: { boxWidth: 8, font: { size: 9, weight: '700' }, color: 'var(--text-muted)' } } } }} 
                                />
                            </div>
                        </motion.div>
                    </div>
                </div>

                {/* RIGHT: OPERATIONS SIDEBAR */}
                <div className="ops-sidebar">
                    <motion.div className="glass-card-pro" variants={itemVariants} style={{ padding: 0, overflow: 'hidden', height: '100%', minHeight: '400px' }}>
                        <LiveOperationStream />
                    </motion.div>

                    <motion.div className="glass-card-pro" variants={itemVariants}>
                        <div className="section-header-pro" style={{ marginBottom: '12px' }}>
                            <h2 className="section-title-pro">Riesgo de Abandono</h2>
                        </div>
                        <div style={{ maxHeight: '200px', overflowY: 'auto' }} className="hide-scrollbar">
                            <table className="table-pro">
                                <thead>
                                    <tr>
                                        <th>Local</th>
                                        <th style={{ textAlign: 'right' }}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats.topChurn.map(c => (
                                        <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => window.location.hash = `#/clientes?id=${c.cliente_id}`}>
                                            <td style={{ fontSize: '0.8rem', fontWeight: '700' }}>{c.clientes?.nombre_local}</td>
                                            <td style={{ textAlign: 'right' }}>
                                                <span className="trend-down-pro" style={{ fontSize: '9px', fontWeight: '800' }}>
                                                    {c.risk.diasSinContacto > 1000 ? 'N/D' : c.risk.diasSinContacto + 'd'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {stats.topChurn.length === 0 && (
                                        <tr><td colSpan="2" className="text-center py-4 muted" style={{ fontSize: '0.7rem' }}>Sin alertas críticas</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                </div>

            </div>

            {/* 4. BOTTOM MONITORING */}
            <motion.div className="glass-card-pro" variants={itemVariants}>
                <div className="section-header-pro">
                    <h2 className="section-title-pro">Actividad Reciente del Staff</h2>
                    <Zap size={16} style={{ color: 'var(--accent)' }} />
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table className="table-pro">
                        <thead>
                            <tr>
                                <th>Punto de Venta</th>
                                <th>Timestamp</th>
                                <th>Operador</th>
                                <th style={{ textAlign: 'right' }}>Verificación</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.ultimasVisitas.map(v => (
                                <tr key={v.id} style={{ cursor: 'pointer' }} onClick={() => window.location.hash = `#/clientes?id=${v.cliente_id}`}>
                                    <td><div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)' }}></div>
                                        <strong>{v.clientes?.nombre_local}</strong>
                                    </div></td>
                                    <td className="muted" style={{ fontSize: '0.8rem' }}>{format(new Date(v.fecha), 'HH:mm', { locale: es })}hs</td>
                                    <td style={{ fontSize: '0.85rem', fontWeight: '500' }}>{v.usuario || 'Operador'}</td>
                                    <td style={{ textAlign: 'right' }}><CheckCircle size={14} style={{ color: 'var(--success)' }} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </motion.div>

        </motion.div>
    );
}
