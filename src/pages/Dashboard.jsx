import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { BentoCard } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import { Users, Truck, Calendar, Sparkles, Lightbulb } from 'lucide-react';

export default function Dashboard() {
    const { user } = useAuth();

    const [stats, setStats] = useState({
        clientes: 0,
        visitasHoy: 0,
        agendaHoy: 0,
        repartidores: 0,
        consumidores: 0,
    });
    const [loading, setLoading] = useState(true);

    // Reusable function to fetch KPIs
    const loadKPIs = async () => {
        try {
            const today = new Date().toISOString().split('T')[0];

            const [
                { count: clientesCount },
                { count: consumidoresCount },
                { count: repartidoresCount },
                { data: agendaHoyData },
                { count: visitasHoyCount }
            ] = await Promise.all([
                supabase.from('clientes').select('*', { count: 'exact', head: true }).eq('activo', true),
                supabase.from('consumidores').select('*', { count: 'exact', head: true }).eq('activo', true),
                supabase.from('repartidores').select('*', { count: 'exact', head: true }),
                supabase.from('clientes').select('id').eq('fecha_proximo_contacto', today).eq('activo', true),
                supabase.from('actividades').select('*', { count: 'exact', head: true }).eq('descripcion', 'Visita realizada').gte('fecha', today)
            ]);

            setStats({
                clientes: clientesCount || 0,
                consumidores: consumidoresCount || 0,
                repartidores: repartidoresCount || 0,
                agendaHoy: agendaHoyData?.length || 0,
                visitasHoy: visitasHoyCount || 0,
            });

        } catch (error) {
            console.error("Error loading dashboard KPIs:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadKPIs();

        // Supabase Realtime
        const channel = supabase.channel('dashboard-kpis')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'clientes' }, () => {
                loadKPIs();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'actividades' }, () => {
                loadKPIs();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const getInsight = () => {
        const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const now = new Date();
        const day = days[now.getDay()];
        const period = now.getHours() < 12 ? 'Mañana' : now.getHours() < 19 ? 'Tarde' : 'Noche';
        return `${day} - ${period}`;
    };

    return (
        <div style={{ paddingBottom: '40px' }}>
            <header className="dashboard-header" style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0 }}>Dashboard</h1>
                <p className="muted" style={{ fontSize: '1.1rem' }}>Resumen operativo del día</p>
            </header>

            <div className="bento-grid">
                {/* 0. HERO WELCOME */}
                <BentoCard
                    className="span-2"
                    variant="gradient-blue"
                    style={{ marginBottom: '-8px' }} // Reduce gap slightly
                >
                    <h2 style={{ fontSize: '1.8rem', fontWeight: 700, margin: '0 0 4px 0' }}>
                        ¡Hola, {user?.email?.split('@')[0] || 'Usuario'}! 👋
                    </h2>
                    <p style={{ margin: 0, opacity: 0.8, fontSize: '1.1rem' }}>{getInsight()}</p>
                </BentoCard>

                {/* 1. KPI AGENDA HOY (MAIN FOCAL POINT) */}
                <Link to="/clientes?agenda=hoy" className="span-2 span-row-2" style={{ textDecoration: 'none', display: 'flex' }}>
                    <BentoCard
                        variant="gradient-purple"
                        style={{ flex: 1, width: '100%', cursor: 'pointer' }}
                    >
                        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
                            <div>
                                <div className="bento-icon" style={{ filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.4))' }}>
                                    <Calendar size={32} />
                                </div>
                                <div className="bento-title" style={{ fontSize: '2rem' }}>Agenda de Hoy</div>
                                <div className="bento-desc" style={{ fontSize: '1.1rem', opacity: 0.9 }}>Clientes para visitar o contactar hoy.</div>
                            </div>
                            <div className="bento-stat" style={{ fontSize: '6rem', marginTop: '20px' }}>
                                {loading ? <Skeleton style={{ height: '80px', width: '80px', background: 'rgba(255,255,255,0.2)' }} /> : stats.agendaHoy}
                            </div>
                            <div style={{ position: 'absolute', bottom: '-20px', right: '-20px', fontSize: '12rem', opacity: 0.1, pointerEvents: 'none' }}>📅</div>
                        </div>
                    </BentoCard>
                </Link>

                {/* 2. CREAR CLIENTE (IMPORTANT ACTION) */}
                <Link to="/clientes?action=new" style={{ textDecoration: 'none' }}>
                    <BentoCard
                        variant="gradient-purple"
                        title="Nuevo Cliente"
                        desc="Registrar comercio"
                        icon={<Sparkles size={28} />}
                        actionIcon="➜"
                    />
                </Link>

                {/* 3. NUEVA VISITA */}
                <Link to="/calendario?action=new" style={{ textDecoration: 'none' }}>
                    <BentoCard
                        variant="gradient-green"
                        icon={<Calendar size={28} />}
                        title="Nueva Visita"
                        desc="Agendar reunión"
                        actionIcon="+"
                    />
                </Link>

                {/* 4. KPI CLIENTES ACTIVOS */}
                <BentoCard
                    variant="dark"
                    title={<span style={{ fontSize: '1.1rem', opacity: 0.8 }}>Clientes Totales</span>}
                    stat={loading ? <Skeleton style={{ height: '40px', width: '60px', background: 'rgba(255,255,255,0.1)' }} /> : stats.clientes}
                    icon={<Users size={20} color="var(--accent)" />}
                />

                {/* 5. KPI VISITAS HOY */}
                <BentoCard
                    variant="dark"
                    title={<span style={{ fontSize: '1.1rem', opacity: 0.8 }}>Visitas Hoy</span>}
                    stat={loading ? <Skeleton style={{ height: '40px', width: '60px', background: 'rgba(255,255,255,0.1)' }} /> : stats.visitasHoy}
                    icon={<Truck size={20} color="var(--success)" />}
                />

                {/* 6. CREAR CONSUMIDOR */}
                <Link to="/consumidores?action=new" style={{ textDecoration: 'none' }}>
                    <BentoCard icon={<Users size={24} />} title="Nuevo Consumidor" desc="B2C" />
                </Link>

                {/* 7. CREAR REPARTIDOR */}
                <Link to="/repartidores?action=new" style={{ textDecoration: 'none' }}>
                    <BentoCard icon={<Truck size={24} />} title="Nuevo Repartidor" desc="Logística" />
                </Link>

                {/* 8. INSIGHT IA (Wide) */}
                <BentoCard
                    className="span-2"
                    variant="gradient-orange"
                    icon={<Lightbulb size={28} />}
                    title={<span style={{ fontSize: '1.5rem' }}>Insight IA</span>}
                    desc={`Tenes ${stats.agendaHoy} contactos pendientes para hoy. Recordá revisar el mapa para optimizar tu ruta.`}
                >
                    <div style={{ position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)', opacity: 0.2 }}>
                        <Sparkles size={100} />
                    </div>
                </BentoCard>
            </div>
        </div>
    );
}
