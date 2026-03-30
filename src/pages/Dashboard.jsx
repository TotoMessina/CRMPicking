import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Search, MoreVertical, Calendar, User, Clock, CheckCircle, Map as MapIcon, Users, Truck } from 'lucide-react';
import { Bar, Doughnut } from 'react-chartjs-2';
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

// Register ChartJS
ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

export default function Dashboard() {
    const { empresaActiva, user, userName } = useAuth();
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
        localesMapa: []
    });

    const loadDashboardData = async () => {
        if (!empresaActiva?.id) return;

        try {
            const today = startOfDay(new Date()).toISOString();
            const sevenDaysAgo = subDays(new Date(), 7).toISOString();

            const [
                { count: totalClientes },
                { count: nuevosHoyCount },
                { count: totalRepartidores },
                { count: totalConsumidores },
                { data: growthData },
                { data: stateDist },
                { data: recentVisits },
                { data: pendingContacts },
                { data: mapLocals }
            ] = await Promise.all([
                supabase.from('empresa_cliente').select('*', { count: 'exact', head: true }).eq('empresa_id', empresaActiva.id).eq('activo', true),
                supabase.from('empresa_cliente').select('*', { count: 'exact', head: true }).eq('empresa_id', empresaActiva.id).gte('created_at', today).eq('activo', true),
                supabase.from('repartidores').select('*', { count: 'exact', head: true }).eq('empresa_id', empresaActiva.id),
                supabase.from('consumidores').select('*', { count: 'exact', head: true }).eq('empresa_id', empresaActiva.id).eq('activo', true),
                supabase.from('empresa_cliente').select('created_at').eq('empresa_id', empresaActiva.id).gte('created_at', sevenDaysAgo).eq('activo', true),
                supabase.from('empresa_cliente').select('estado').eq('empresa_id', empresaActiva.id).eq('activo', true),
                supabase.from('actividades').select('id, fecha, clientes:cliente_id(nombre_local)').eq('empresa_id', empresaActiva.id).eq('descripcion', 'Visita realizada').order('fecha', { ascending: false }).limit(5),
                supabase.from('empresa_cliente').select('id, fecha_proximo_contacto, clientes:cliente_id(nombre_local, responsable_id)').eq('empresa_id', empresaActiva.id).not('fecha_proximo_contacto', 'is', null).gte('fecha_proximo_contacto', today.split('T')[0]).order('fecha_proximo_contacto', { ascending: true }).limit(5),
                supabase.from('empresa_cliente').select('id, estado, clientes!inner(id, nombre_local, lat, lng)').eq('empresa_id', empresaActiva.id).eq('estado', '5 - Local Visitado Activo').not('clientes.lat', 'is', null).limit(100)
            ]);

            // Process Growth Data
            const labelsGrid = Array.from({ length: 7 }, (_, i) => format(subDays(new Date(), 6 - i), 'EEE', { locale: es }));
            const growthCounts = Array(7).fill(0);
            growthData?.forEach(d => {
                const dayIndex = 6 - Math.floor((new Date().getTime() - new Date(d.created_at).getTime()) / (1000 * 60 * 60 * 24));
                if (dayIndex >= 0 && dayIndex < 7) growthCounts[dayIndex]++;
            });

            // Process State Distribution
            const states = {};
            stateDist?.forEach(d => { states[d.estado] = (states[d.estado] || 0) + 1; });
            const stateLabels = Object.keys(states);
            const stateValues = Object.values(states);

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
                        backgroundColor: '#8b5cf6',
                        borderRadius: 6
                    }]
                },
                distribucionCartera: {
                    labels: stateLabels,
                    datasets: [{
                        data: stateValues,
                        backgroundColor: ['#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#a78bfa', '#64748b'],
                        borderWidth: 0
                    }]
                },
                ultimasVisitas: recentVisits || [],
                proximosContactos: pendingContacts || [],
                localesMapa: mapLocals || []
            });

        } catch (error) {
            console.error("Error loading enhanced dashboard data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (empresaActiva?.id) {
            loadDashboardData();
            const channel = supabase.channel('db-refresh')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'empresa_cliente', filter: `empresa_id=eq.${empresaActiva.id}` }, () => loadDashboardData())
                .subscribe();
            return () => supabase.removeChannel(channel);
        }
    }, [empresaActiva]);

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, grid: { display: false } }, x: { grid: { display: false } } }
    };

    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);

    const handleSearch = async (val) => {
        setSearchTerm(val);
        if (val.length < 2) {
            setSearchResults([]);
            return;
        }
        const { data } = await supabase.from('clientes').select('id, nombre_local').ilike('nombre_local', `%${val}%`).limit(5);
        setSearchResults(data || []);
    };

    return (
        <div className="db-container">
            {/* Header */}
            <header className="db-header">
                <div className="db-title-group">
                    <h1>HOLA, {userName || user?.email?.split('@')[0] || 'TOTO'}</h1>
                    <p>MULTI-EMPRESA: {empresaActiva?.nombre?.toUpperCase() || 'S/D'} ▾</p>
                </div>
                <div className="db-search">
                    <Search size={18} />
                    <input 
                        type="text" 
                        placeholder="Buscar local..." 
                        value={searchTerm}
                        onChange={(e) => handleSearch(e.target.value)}
                    />
                    {searchResults.length > 0 && (
                        <div className="db-search-results">
                            {searchResults.map(r => (
                                <Link key={r.id} to={`/clientes?id=${r.id}`} className="db-search-item">
                                    {r.nombre_local}
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </header>

            {/* KPI Grid */}
            <div className="db-kpi-grid">
                <div className="db-card">
                    <div className="db-kpi-label">Locales Activos</div>
                    <div className="db-kpi-value">{stats.clientesTotal}</div>
                </div>
                <div className="db-card">
                    <div className="db-kpi-label">Nuevos (Hoy)</div>
                    <div className="db-kpi-value trend-up">+{stats.nuevosHoy}</div>
                </div>
                <div className="db-card">
                    <div className="db-kpi-label">Repartidores Operativos</div>
                    <div className="db-kpi-value">{stats.repartidores}</div>
                </div>
                <div className="db-card">
                    <div className="db-kpi-label">Consumidores Registrados</div>
                    <div className="db-kpi-value">{stats.consumidores >= 1000 ? `${(stats.consumidores / 1000).toFixed(1)}K` : stats.consumidores}</div>
                </div>
            </div>

            {/* Charts Row */}
            <div className="db-main-grid">
                <div className="db-section-card">
                    <div className="db-section-header">
                        <h2>Crecimiento Diario de Locales</h2>
                        <MoreVertical size={18} className="muted" />
                    </div>
                    <div className="chart-container-db">
                        <Bar data={stats.crecimientoDiario} options={chartOptions} />
                    </div>
                </div>
                <div className="db-section-card">
                    <div className="db-section-header">
                        <h2>Distribución de Cartera</h2>
                        <MoreVertical size={18} className="muted" />
                    </div>
                    <div className="chart-container-db">
                        <Doughnut data={stats.distribucionCartera} options={{ ...chartOptions, plugins: { legend: { display: true, position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } } }} />
                    </div>
                </div>
            </div>

            {/* Bottom Row */}
            <div className="db-bottom-grid">
                {/* Mini Map */}
                <div className="db-section-card" style={{ gridColumn: 'span 1' }}>
                    <div className="db-section-header">
                        <h2>Mapa de Cobertura Inteligente</h2>
                        <button className="btn-link" style={{ background: 'var(--accent)', color: 'white', border: 'none', padding: '4px 12px', fontSize: '0.75rem' }}>MAPA COMPLETO</button>
                    </div>
                    <div className="db-mini-map">
                        <MapContainer center={[-34.6, -58.4]} zoom={11} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                            {stats.localesMapa
                                .filter(l => l.clientes?.lat && l.clientes?.lng)
                                .map(l => (
                                <CircleMarker key={l.id} center={[l.clientes.lat, l.clientes.lng]} radius={4} fillOpacity={0.7} color="#8b5cf6" stroke={false}>
                                    <Popup>{l.clientes.nombre_local}</Popup>
                                </CircleMarker>
                            ))}
                        </MapContainer>
                    </div>
                </div>

                {/* Last Visits */}
                <div className="db-section-card">
                    <div className="db-section-header">
                        <h2>Últimas Visitas</h2>
                        <MoreVertical size={18} className="muted" />
                    </div>
                    <table className="db-table">
                        <thead>
                            <tr>
                                <th>Local</th>
                                <th>Tiempo</th>
                                <th>Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.ultimasVisitas.map(v => (
                                <tr key={v.id}>
                                    <td><strong>{v.clientes?.nombre_local || 'Local'}</strong></td>
                                    <td className="muted">{format(new Date(v.fecha), 'HH:mm', { locale: es })}hs</td>
                                    <td><Clock size={16} className="muted" /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Next Contacts */}
                <div className="db-section-card">
                    <div className="db-section-header">
                        <h2>Próximos Contactos</h2>
                        <MoreVertical size={18} className="muted" />
                    </div>
                    <div className="db-agenda-list">
                        {stats.proximosContactos.map(c => (
                            <div key={c.id} className="db-agenda-item">
                                <div className="db-avatar"><User size={20} className="muted" /></div>
                                <div className="db-agenda-info">
                                    <div className="db-agenda-name">{c.clientes?.nombre_local}</div>
                                    <div className="db-agenda-date">{c.fecha_proximo_contacto}</div>
                                </div>
                                <button style={{ background: 'var(--accent-soft)', color: 'var(--accent)', border: 'none', borderRadius: '4px', padding: '4px 8px', fontSize: '0.7rem', fontWeight: 700 }}>+2 DÍAS</button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
