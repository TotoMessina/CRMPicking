import React, { useState, useMemo } from 'react';
import { useLlamadasStats } from '../../hooks/useLlamadasStats';
import {
    PhoneCall, Users, CheckCircle2, RefreshCw, Sparkles,
    MessageCircle, FileText, User, Compass, Clock, Search,
    TrendingUp, Store, ChevronRight, Activity, Calendar, AlertCircle, BarChart3, Award, PhoneMissed
} from 'lucide-react';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import { motion } from 'framer-motion';

interface Props {
    dateFrom?: string;
    dateTo?: string;
}

const PALETTE = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];

export const LlamadasStats: React.FC<Props> = ({ dateFrom, dateTo }) => {
    const [useDateFilter, setUseDateFilter] = useState(false);
    const { data: stats, isLoading, isError, error, refetch } = useLlamadasStats({ dateFrom, dateTo, useDateFilter });
    const [searchTable, setSearchTable] = useState('');

    const filteredModificaciones = useMemo(() => {
        if (!stats?.ultimasModificaciones) return [];
        if (!searchTable.trim()) return stats.ultimasModificaciones;
        const q = searchTable.toLowerCase().trim();
        return stats.ultimasModificaciones.filter(m => {
            const name = [m.nombre, m.apellido].filter(Boolean).join(' ').toLowerCase();
            const com = (m.nombre_comercio || '').toLowerCase();
            const tel = (m.telefono || '').toLowerCase();
            const op = (m.nombre_operador || '').toLowerCase();
            const resp = (m.respuesta_llamado || '').toLowerCase();
            const orig = (m.origen_contacto || '').toLowerCase();
            return name.includes(q) || com.includes(q) || tel.includes(q) || op.includes(q) || resp.includes(q) || orig.includes(q);
        });
    }, [stats?.ultimasModificaciones, searchTable]);

    if (isLoading) {
        return (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Activity className="animate-spin" size={32} style={{ margin: '0 auto 12px', color: 'var(--accent)' }} />
                <p style={{ fontSize: '0.95rem', fontWeight: 600 }}>Cargando estadísticas y modificaciones de llamadas...</p>
            </div>
        );
    }

    if (isError) {
        return (
            <div style={{
                padding: '40px 20px',
                textAlign: 'center',
                background: 'rgba(239,68,68,0.08)',
                borderRadius: '20px',
                border: '1px solid rgba(239,68,68,0.25)',
                color: '#ef4444'
            }}>
                <AlertCircle size={36} style={{ margin: '0 auto 12px' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 6 }}>Error al cargar estadísticas</h3>
                <p style={{ fontSize: '0.85rem', maxWidth: '450px', margin: '0 auto 16px', color: 'var(--text-muted)' }}>
                    {(error as any)?.message || 'Ocurrió un error al consultar las fichas de llamada.'}
                </p>
                <button
                    onClick={() => refetch()}
                    style={{
                        padding: '8px 18px', borderRadius: '10px',
                        border: 'none', background: 'var(--accent)', color: 'white',
                        fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer'
                    }}
                >
                    Reintentar
                </button>
            </div>
        );
    }

    if (!stats || stats.totalHistorico === 0) {
        return (
            <div style={{
                padding: '60px 20px',
                textAlign: 'center',
                background: 'var(--bg-card)',
                borderRadius: '20px',
                border: '1px solid var(--border)',
                color: 'var(--text-muted)'
            }}>
                <PhoneCall size={48} style={{ margin: '0 auto 16px', opacity: 0.4, color: 'var(--accent)' }} />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
                    No hay fichas de llamadas registradas en esta empresa
                </h3>
                <p style={{ fontSize: '0.9rem', maxWidth: '420px', margin: '0 auto' }}>
                    Agregá contactos o importá un archivo Excel en la página de llamadas para visualizar aquí las métricas de rendimiento, actividad y modificaciones.
                </p>
            </div>
        );
    }

    // Chart: Llamadas Realizadas por Día (Mixto: Barras de Llamadas + Línea de Contactos)
    const llamadasPorDiaChartData: any = {
        labels: stats.llamadasPorDia.labels,
        datasets: [
            {
                type: 'bar' as const,
                label: 'Llamadas / Intentos Realizados',
                data: stats.llamadasPorDia.totalLlamadas,
                backgroundColor: 'rgba(59, 130, 246, 0.85)',
                hoverBackgroundColor: '#2563eb',
                borderRadius: 8,
                order: 2,
            },
            {
                type: 'bar' as const,
                label: 'Llamadas Exitosas',
                data: stats.llamadasPorDia.llamadasExitosas,
                backgroundColor: 'rgba(16, 185, 129, 0.85)',
                hoverBackgroundColor: '#059669',
                borderRadius: 8,
                order: 3,
            },
            {
                type: 'line' as const,
                label: 'Contactos Llamados',
                data: stats.llamadasPorDia.contactosAtendidos,
                borderColor: '#f59e0b',
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                borderWidth: 3,
                pointBackgroundColor: '#f59e0b',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
                fill: false,
                tension: 0.35,
                order: 1,
            }
        ]
    };

    // Chart: Respuestas
    const respuestasChartData = {
        labels: stats.respuestas.map(r => r.label),
        datasets: [{
            data: stats.respuestas.map(r => r.count),
            backgroundColor: stats.respuestas.map(r => r.color),
            borderWidth: 2,
            borderColor: 'var(--bg-card)',
        }]
    };

    // Chart: Orígenes
    const origenesChartData = {
        labels: stats.origenes.map(o => o.label),
        datasets: [{
            data: stats.origenes.map(o => o.count),
            backgroundColor: stats.origenes.map((_, i) => PALETTE[i % PALETTE.length]),
            borderWidth: 2,
            borderColor: 'var(--bg-card)',
        }]
    };

    // Chart: Operadores
    const operadoresChartData = {
        labels: stats.operadores.map(o => o.nombre),
        datasets: [
            {
                label: 'Llamadas Realizadas',
                data: stats.operadores.map(o => o.totalLlamadas),
                backgroundColor: 'rgba(59, 130, 246, 0.85)',
                borderRadius: 8,
            },
            {
                label: 'Contactos Llamados',
                data: stats.operadores.map(o => o.contactosLlamados),
                backgroundColor: 'rgba(16, 185, 129, 0.85)',
                borderRadius: 8,
            },
            {
                label: 'Llamadas Exitosas',
                data: stats.operadores.map(o => o.exitosas),
                backgroundColor: 'rgba(245, 158, 11, 0.85)',
                borderRadius: 8,
            }
        ]
    };

    // Chart: Evolución Diaria
    const evolucionChartData = {
        labels: stats.evolucionDiaria.labels,
        datasets: [
            {
                label: 'Modificaciones / Actualizaciones',
                data: stats.evolucionDiaria.modificados,
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                fill: true,
                tension: 0.35,
            },
            {
                label: 'Nuevos Contactos en BD',
                data: stats.evolucionDiaria.creados,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                fill: true,
                tension: 0.35,
            }
        ]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom' as const,
                labels: {
                    boxWidth: 12,
                    padding: 14,
                    color: '#94a3b8',
                    font: { size: 11, weight: 600 as const }
                }
            }
        }
    };

    const barOptions = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    precision: 0,
                    color: '#94a3b8',
                    font: { size: 11, weight: 600 as const }
                },
                grid: {
                    color: 'rgba(255, 255, 255, 0.05)'
                }
            },
            x: {
                ticks: {
                    color: '#94a3b8',
                    font: { size: 11, weight: 600 as const }
                },
                grid: {
                    display: false
                }
            }
        },
        plugins: {
            legend: {
                position: 'bottom' as const,
                labels: {
                    boxWidth: 12,
                    padding: 14,
                    color: '#94a3b8',
                    font: { size: 11, weight: 600 as const }
                }
            }
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* ── BARRA DE ALCANCE / FILTRO ───────────────────── */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                padding: '12px 18px',
                background: 'var(--bg-elevated)',
                borderRadius: '14px',
                border: '1px solid var(--border)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', color: 'var(--text)' }}>
                    <Calendar size={16} style={{ color: 'var(--accent)' }} />
                    <span>
                        Mostrando: <strong>{useDateFilter ? 'Período seleccionado en filtros' : `Todo el histórico (${stats.totalHistorico} fichas en BD)`}</strong>
                    </span>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                        onClick={() => setUseDateFilter(false)}
                        style={{
                            padding: '6px 14px',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            background: !useDateFilter ? 'var(--accent)' : 'transparent',
                            color: !useDateFilter ? 'white' : 'var(--text-muted)',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        Todo el Histórico ({stats.totalHistorico})
                    </button>
                    <button
                        onClick={() => setUseDateFilter(true)}
                        style={{
                            padding: '6px 14px',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            background: useDateFilter ? 'var(--accent)' : 'transparent',
                            color: useDateFilter ? 'white' : 'var(--text-muted)',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        Filtrar por Fechas ({dateFrom || 'Inicio'} a {dateTo || 'Fin'})
                    </button>
                </div>
            </div>

            {/* ── TOP KPI CARDS ─────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>

                {/* KPI: Total Llamadas Realizadas */}
                <motion.div
                    whileHover={{ translateY: -3 }}
                    style={{
                        background: 'linear-gradient(135deg, rgba(59,130,246,0.12) 0%, rgba(59,130,246,0.02) 100%)',
                        border: '1px solid rgba(59,130,246,0.25)',
                        borderRadius: '20px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px'
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Llamadas Realizadas
                        </span>
                        <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'rgba(59,130,246,0.15)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <PhoneCall size={18} />
                        </div>
                    </div>
                    <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text)' }}>
                        {stats.totalIntentos.toLocaleString()}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        Promedio: {stats.contactosLlamados > 0 ? (stats.totalIntentos / stats.contactosLlamados).toFixed(1) : 0} llamadas por contacto llamado
                    </span>
                </motion.div>

                {/* KPI: Contactos Atendidos / Llamados */}
                <motion.div
                    whileHover={{ translateY: -3 }}
                    style={{
                        background: 'linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(16,185,129,0.02) 100%)',
                        border: '1px solid rgba(16,185,129,0.25)',
                        borderRadius: '20px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px'
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Contactos Llamados
                        </span>
                        <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'rgba(16,185,129,0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Users size={18} />
                        </div>
                    </div>
                    <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text)' }}>
                        {stats.contactosLlamados.toLocaleString()}
                    </span>
                    <div style={{ display: 'flex', gap: '8px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        <span>De {stats.totalFichas} fichas</span>
                        {stats.contactosSinLlamar > 0 && (
                            <span style={{ color: '#f59e0b', fontWeight: 600 }}>({stats.contactosSinLlamar} pendientes)</span>
                        )}
                    </div>
                </motion.div>

                {/* KPI: Tasa de Éxito */}
                <motion.div
                    whileHover={{ translateY: -3 }}
                    style={{
                        background: 'linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(245,158,11,0.02) 100%)',
                        border: '1px solid rgba(245,158,11,0.25)',
                        borderRadius: '20px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px'
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Tasa de Éxito
                        </span>
                        <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <CheckCircle2 size={18} />
                        </div>
                    </div>
                    <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text)' }}>
                        {stats.tasaExito}%
                    </span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {stats.respuestas.find(r => r.label === 'Llamada Exitosa')?.count || 0} exitosas sobre contactados
                    </span>
                </motion.div>

                {/* KPI: Fichas Modificadas & Actividad */}
                <motion.div
                    whileHover={{ translateY: -3 }}
                    style={{
                        background: 'linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(139,92,246,0.02) 100%)',
                        border: '1px solid rgba(139,92,246,0.25)',
                        borderRadius: '20px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px'
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Fichas Modificadas
                        </span>
                        <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'rgba(139,92,246,0.15)', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <RefreshCw size={18} />
                        </div>
                    </div>
                    <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text)' }}>
                        {stats.totalModificados.toLocaleString()}
                    </span>
                    <div style={{ display: 'flex', gap: '10px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        <span style={{ color: '#10b981', fontWeight: 600 }}>✨ {stats.clientesNuevos} nuevos</span>
                        <span style={{ color: '#3b82f6', fontWeight: 600 }}>🔄 {stats.clientesActualizados} actualizados</span>
                    </div>
                </motion.div>
            </div>

            {/* ── GRÁFICO DESTACADO: LLAMADAS POR DÍA ─────────── */}
            <div style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '20px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <BarChart3 size={20} style={{ color: 'var(--accent)' }} /> Llamadas Realizadas por Día
                        </h3>
                        <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            Cantidad exacta de llamadas realizadas cada día, contactos que fueron llamados y llamadas exitosas
                        </p>
                    </div>

                    {/* Resumen numérico rápido */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <div style={{ padding: '6px 12px', borderRadius: '12px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', fontSize: '0.8rem', fontWeight: 700, color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <PhoneCall size={13} /> {stats.totalIntentos} llamadas totales
                        </div>
                        <div style={{ padding: '6px 12px', borderRadius: '12px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', fontSize: '0.8rem', fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <Users size={13} /> {stats.contactosLlamados} contactos llamados
                        </div>
                        <div style={{ padding: '6px 12px', borderRadius: '12px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', fontSize: '0.8rem', fontWeight: 700, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <TrendingUp size={13} /> Promedio: {stats.llamadasPorDia.promedioDiario} llamadas/día
                        </div>
                        {stats.llamadasPorDia.diaPico.total > 0 && (
                            <div style={{ padding: '6px 12px', borderRadius: '12px', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.25)', fontSize: '0.8rem', fontWeight: 700, color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <Award size={13} /> Día pico: {stats.llamadasPorDia.diaPico.fecha} ({stats.llamadasPorDia.diaPico.total} llamadas)
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ height: '340px', position: 'relative', width: '100%' }}>
                    <Bar data={llamadasPorDiaChartData} options={barOptions} />
                </div>
            </div>

            {/* ── CONVERSIONES EMBARRADAS ──────────────────────── */}
            <div style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '20px',
                padding: '20px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '12px', background: 'rgba(37,211,102,0.15)', color: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <MessageCircle size={20} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>WhatsApp Enviado</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)' }}>
                            {stats.conversiones.whatsappCount} <span style={{ fontSize: '0.85rem', color: '#25D366' }}>({stats.conversiones.whatsappPct}%)</span>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '12px', background: 'rgba(59,130,246,0.15)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <FileText size={20} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Formulario Completado</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)' }}>
                            {stats.conversiones.formularioCount} <span style={{ fontSize: '0.85rem', color: '#3b82f6' }}>({stats.conversiones.formularioPct}%)</span>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '12px', background: 'rgba(16,185,129,0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <CheckCircle2 size={20} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Envió "Listo"</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)' }}>
                            {stats.conversiones.listoCount} <span style={{ fontSize: '0.85rem', color: '#10b981' }}>({stats.conversiones.listoPct}%)</span>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '12px', background: 'rgba(236,72,153,0.15)', color: '#ec4899', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Sparkles size={20} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Siguió en Redes</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)' }}>
                            {stats.conversiones.redesCount} <span style={{ fontSize: '0.85rem', color: '#ec4899' }}>({stats.conversiones.redesPct}%)</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── CHARTS ROW ────────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '20px' }}>

                {/* Donut: Respuestas de Llamado */}
                <div style={{
                    gridColumn: 'span 6',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: '20px',
                    padding: '22px',
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: '340px'
                }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <PhoneCall size={16} style={{ color: 'var(--accent)' }} /> Respuestas y Estados del Llamado
                    </h3>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <Doughnut data={respuestasChartData} options={chartOptions} />
                    </div>
                </div>

                {/* Donut: Origen de Contacto */}
                <div style={{
                    gridColumn: 'span 6',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: '20px',
                    padding: '22px',
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: '340px'
                }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Compass size={16} style={{ color: 'var(--accent)' }} /> ¿Cómo llegaron a la Base de Datos?
                    </h3>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <Doughnut data={origenesChartData} options={chartOptions} />
                    </div>
                </div>

                {/* Bar: Desempeño por Operador */}
                <div style={{
                    gridColumn: 'span 7',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: '20px',
                    padding: '22px',
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: '340px'
                }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <User size={16} style={{ color: 'var(--accent)' }} /> Rendimiento y Llamadas por Operador
                    </h3>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <Bar data={operadoresChartData} options={barOptions} />
                    </div>
                </div>

                {/* Line: Evolución de Altas y Modificaciones */}
                <div style={{
                    gridColumn: 'span 5',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: '20px',
                    padding: '22px',
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: '340px'
                }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <TrendingUp size={16} style={{ color: 'var(--accent)' }} /> Evolución de Altas y Modificaciones
                    </h3>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <Line data={evolucionChartData} options={chartOptions} />
                    </div>
                </div>
            </div>

            {/* ── TABLA DE ÚLTIMAS MODIFICACIONES & CONTACTOS ACTUALIZADOS ─ */}
            <div style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '20px',
                padding: '22px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <RefreshCw size={18} style={{ color: 'var(--accent)' }} /> Historial de Últimas Modificaciones y Llamadas
                        </h3>
                        <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                            Contactos actualizados recientemente con sus estados, llamadas realizadas y origen
                        </p>
                    </div>

                    <div style={{ position: 'relative', minWidth: '240px' }}>
                        <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            placeholder="Buscar en el historial..."
                            value={searchTable}
                            onChange={e => setSearchTable(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '8px 12px 8px 34px',
                                borderRadius: '10px',
                                border: '1px solid var(--border)',
                                background: 'var(--bg-elevated)',
                                color: 'var(--text)',
                                fontSize: '0.85rem',
                                outline: 'none',
                            }}
                        />
                    </div>
                </div>

                {/* Tabla */}
                <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <thead>
                            <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                                <th style={{ padding: '12px 14px', fontWeight: 600 }}>Contacto / Comercio</th>
                                <th style={{ padding: '12px 14px', fontWeight: 600 }}>Teléfono</th>
                                <th style={{ padding: '12px 14px', fontWeight: 600 }}>Operador</th>
                                <th style={{ padding: '12px 14px', fontWeight: 600 }}>Respuesta / Estado</th>
                                <th style={{ padding: '12px 14px', fontWeight: 600 }}>Llamadas</th>
                                <th style={{ padding: '12px 14px', fontWeight: 600 }}>Etiqueta</th>
                                <th style={{ padding: '12px 14px', fontWeight: 600 }}>Origen BD</th>
                                <th style={{ padding: '12px 14px', fontWeight: 600 }}>Última Actividad</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredModificaciones.length === 0 ? (
                                <tr>
                                    <td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        No se encontraron registros con el término ingresado.
                                    </td>
                                </tr>
                            ) : (
                                filteredModificaciones.map((m) => {
                                    const fullName = [m.nombre, m.apellido].filter(Boolean).join(' ') || '—';
                                    const calls = Number(m.cantidad_llamadas ?? 0);
                                    const dateStr = m.updated_at || m.created_at;
                                    const formattedDate = dateStr ? new Date(dateStr).toLocaleString([], {
                                        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                                    }) : '—';

                                    const isNuevo = (m.etiqueta || '').toLowerCase().includes('nuevo');
                                    const isActualizado = (m.etiqueta || '').toLowerCase().includes('actualiz');

                                    return (
                                        <tr key={m.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}>
                                            <td style={{ padding: '12px 14px' }}>
                                                <div style={{ fontWeight: 700, color: 'var(--text)' }}>{fullName}</div>
                                                {m.nombre_comercio && (
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                        <Store size={11} /> {m.nombre_comercio}
                                                    </div>
                                                )}
                                            </td>
                                            <td style={{ padding: '12px 14px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                                                {m.telefono || '—'}
                                            </td>
                                            <td style={{ padding: '12px 14px', color: 'var(--text)' }}>
                                                {m.nombre_operador ? (
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                                                        <User size={12} style={{ color: 'var(--accent)' }} /> {m.nombre_operador}
                                                    </span>
                                                ) : '—'}
                                            </td>
                                            <td style={{ padding: '12px 14px' }}>
                                                {m.respuesta_llamado ? (
                                                    <span style={{
                                                        fontSize: '0.72rem',
                                                        fontWeight: 700,
                                                        padding: '3px 8px',
                                                        borderRadius: '12px',
                                                        background: m.respuesta_llamado === 'exitosa' ? 'rgba(16,185,129,0.15)' : 'rgba(100,116,139,0.15)',
                                                        color: m.respuesta_llamado === 'exitosa' ? '#10b981' : 'var(--text)',
                                                        border: '1px solid var(--border)'
                                                    }}>
                                                        {m.respuesta_llamado}
                                                    </span>
                                                ) : '—'}
                                            </td>
                                            <td style={{ padding: '12px 14px' }}>
                                                <span style={{
                                                    fontSize: '0.74rem',
                                                    fontWeight: 700,
                                                    padding: '2px 8px',
                                                    borderRadius: '8px',
                                                    background: calls > 0 ? 'rgba(59,130,246,0.12)' : 'var(--bg-elevated)',
                                                    color: calls > 0 ? '#3b82f6' : 'var(--text-muted)',
                                                    border: '1px solid var(--border)',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 4
                                                }}>
                                                    <PhoneCall size={11} /> {calls} {calls === 1 ? 'llamada' : 'llamadas'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px 14px' }}>
                                                {isNuevo && (
                                                    <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>
                                                        ✨ Nuevo
                                                    </span>
                                                )}
                                                {isActualizado && (
                                                    <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: 'rgba(59,130,246,0.15)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.3)' }}>
                                                        🔄 Actualizado
                                                    </span>
                                                )}
                                                {!isNuevo && !isActualizado && '—'}
                                            </td>
                                            <td style={{ padding: '12px 14px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                                {m.origen_contacto || '—'}
                                            </td>
                                            <td style={{ padding: '12px 14px', fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <Clock size={11} /> {formattedDate}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
