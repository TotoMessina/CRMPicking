import React from 'react';
import { 
    Building2, MapPin, Package, Users, Truck, DollarSign, Cpu, 
    Phone, Mail, Calendar, Edit2, Trash2, ChevronDown, ChevronUp, 
    Plus, Clock, MessageSquare, ShoppingBag, Globe, Store
} from 'lucide-react';
import { Button } from '../ui/Button';
import { motion, AnimatePresence } from 'framer-motion';
import { Distribuidor, ActividadDistribuidor } from '../../types/distribuidor';

interface DistribuidorCardProps {
    distribuidor: Distribuidor;
    acts: ActividadDistribuidor[];
    isExpanded: boolean;
    onEdit: (id: number | string) => void;
    onDelete: (id: number | string) => void;
    onOpenActivity: (id: number | string, nombre: string) => void;
    onToggleHistory: (id: number | string) => void;
}

export const DistribuidorCard: React.FC<DistribuidorCardProps> = ({
    distribuidor: d,
    acts = [],
    isExpanded,
    onEdit,
    onDelete,
    onOpenActivity,
    onToggleHistory
}) => {
    const lastActivity = acts.length > 0 ? acts[0] : null;

    const getActivityTypeIcon = (type?: string) => {
        switch (type) {
            case 'Llamada': return <Phone size={14} style={{ color: '#3b82f6' }} />;
            case 'Visita': return <MapPin size={14} style={{ color: '#10b981' }} />;
            case 'Reunión': return <Users size={14} style={{ color: '#8b5cf6' }} />;
            case 'WhatsApp': return <MessageSquare size={14} style={{ color: '#22c55e' }} />;
            default: return <Clock size={14} style={{ color: '#f59e0b' }} />;
        }
    };

    return (
        <div 
            className="bento-card" 
            style={{ 
                padding: '24px', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '16px',
                borderRadius: '20px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                transition: 'all 0.2s ease',
                boxShadow: 'var(--shadow-sm)'
            }}
        >
            {/* 1. CABECERA: NOMBRE Y ESTADO */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                        <span 
                            style={{ 
                                padding: '3px 10px', 
                                borderRadius: '20px', 
                                fontSize: '0.75rem', 
                                fontWeight: 700,
                                background: d.estado === 'Activo' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                                color: d.estado === 'Activo' ? '#10b981' : '#f59e0b',
                                border: `1px solid ${d.estado === 'Activo' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.25)'}`
                            }}
                        >
                            {d.estado || 'Activo'}
                        </span>

                        {d.ejecutivo_cuenta && (
                            <span 
                                style={{ 
                                    padding: '3px 10px', 
                                    borderRadius: '20px', 
                                    fontSize: '0.75rem', 
                                    fontWeight: 600,
                                    background: 'var(--bg-elevated)',
                                    color: 'var(--text-muted)',
                                    border: '1px solid var(--border)'
                                }}
                            >
                                👤 {d.ejecutivo_cuenta}
                            </span>
                        )}

                        {d.canal_comercializacion && (
                            <span 
                                style={{ 
                                    padding: '3px 10px', 
                                    borderRadius: '20px', 
                                    fontSize: '0.75rem', 
                                    fontWeight: 600,
                                    background: 'rgba(59, 130, 246, 0.10)',
                                    color: '#3b82f6',
                                    border: '1px solid rgba(59, 130, 246, 0.2)'
                                }}
                            >
                                🛒 {d.canal_comercializacion}
                            </span>
                        )}
                    </div>

                    <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.01em' }}>
                        {d.nombre}
                    </h3>

                    {d.direccion && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            <MapPin size={14} style={{ flexShrink: 0, color: 'var(--primary)' }} />
                            <span>{d.direccion}</span>
                        </div>
                    )}
                </div>

                {/* Acciones Editar y Eliminar */}
                <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                        onClick={() => onEdit(d.id)}
                        className="btn-icon"
                        title="Editar Distribuidor"
                        style={{ 
                            background: 'var(--bg-elevated)', 
                            border: '1px solid var(--border)', 
                            borderRadius: '10px', 
                            width: '34px', 
                            height: '34px', 
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--text)'
                        }}
                    >
                        <Edit2 size={15} />
                    </button>
                    <button
                        onClick={() => onDelete(d.id)}
                        className="btn-icon"
                        title="Eliminar Distribuidor"
                        style={{ 
                            background: 'rgba(239, 68, 68, 0.08)', 
                            border: '1px solid rgba(239, 68, 68, 0.2)', 
                            borderRadius: '10px', 
                            width: '34px', 
                            height: '34px', 
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#ef4444'
                        }}
                    >
                        <Trash2 size={15} />
                    </button>
                </div>
            </div>

            {/* 2. GRID DE DATOS CLAVE */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                {d.categorias_productos && (
                    <div style={{ background: 'var(--bg-elevated)', padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Categorías</span>
                        <strong style={{ fontSize: '0.85rem', color: 'var(--text)' }}>{d.categorias_productos}</strong>
                    </div>
                )}

                {d.pedido_minimo && (
                    <div style={{ background: 'var(--bg-elevated)', padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Pedido Mínimo</span>
                        <strong style={{ fontSize: '0.85rem', color: 'var(--text)' }}>{d.pedido_minimo}</strong>
                    </div>
                )}

                {d.tiempo_entrega && (
                    <div style={{ background: 'var(--bg-elevated)', padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Tiempo Entrega</span>
                        <strong style={{ fontSize: '0.85rem', color: 'var(--text)' }}>{d.tiempo_entrega}</strong>
                    </div>
                )}

                {d.zona_entrega && (
                    <div style={{ background: 'var(--bg-elevated)', padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Zona de Entrega</span>
                        <strong style={{ fontSize: '0.85rem', color: 'var(--text)' }}>{d.zona_entrega}</strong>
                    </div>
                )}

                {d.cantidad_sku && (
                    <div style={{ background: 'var(--bg-elevated)', padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Cantidad SKU</span>
                        <strong style={{ fontSize: '0.85rem', color: 'var(--text)' }}>{d.cantidad_sku}</strong>
                    </div>
                )}

                {d.vendedores && (
                    <div style={{ background: 'var(--bg-elevated)', padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Vendedores</span>
                        <strong style={{ fontSize: '0.85rem', color: 'var(--text)' }}>{d.vendedores}</strong>
                    </div>
                )}

                {d.salones && (
                    <div style={{ background: 'var(--bg-elevated)', padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Salones</span>
                        <strong style={{ fontSize: '0.85rem', color: 'var(--text)' }}>{d.salones}</strong>
                    </div>
                )}

                {d.cartera_clientes && (
                    <div style={{ background: 'var(--bg-elevated)', padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Cartera Clientes</span>
                        <strong style={{ fontSize: '0.85rem', color: 'var(--text)' }}>{d.cartera_clientes}</strong>
                    </div>
                )}

                {d.medio_pago && (
                    <div style={{ background: 'var(--bg-elevated)', padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Medio de Pago</span>
                        <strong style={{ fontSize: '0.85rem', color: 'var(--text)' }}>{d.medio_pago}</strong>
                    </div>
                )}

                {d.erp_sistema_gestion && (
                    <div style={{ background: 'var(--bg-elevated)', padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>ERP / Sistema</span>
                        <strong style={{ fontSize: '0.85rem', color: 'var(--text)' }}>{d.erp_sistema_gestion}</strong>
                    </div>
                )}

                {d.experiencia_digital && (
                    <div style={{ background: 'var(--bg-elevated)', padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Exp. Digital</span>
                        <strong style={{ fontSize: '0.85rem', color: 'var(--text)' }}>{d.experiencia_digital}</strong>
                    </div>
                )}
            </div>

            {/* 3. CONTACTO RÁPIDO Y NOTAS */}
            {(d.telefono || d.email || d.notas) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px' }}>
                        {d.telefono && (
                            <a 
                                href={`tel:${d.telefono}`} 
                                style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}
                            >
                                <Phone size={14} />
                                <span>{d.telefono}</span>
                            </a>
                        )}
                        {d.email && (
                            <a 
                                href={`mailto:${d.email}`} 
                                style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', textDecoration: 'none' }}
                            >
                                <Mail size={14} />
                                <span>{d.email}</span>
                            </a>
                        )}
                    </div>
                    {d.notas && (
                        <p className="muted" style={{ margin: 0, fontStyle: 'italic', fontSize: '0.82rem', background: 'var(--bg-elevated)', padding: '6px 10px', borderRadius: '8px' }}>
                            "{d.notas}"
                        </p>
                    )}
                </div>
            )}

            {/* 4. SEGUIMIENTO: ÚLTIMA ACTIVIDAD & BOTONES */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ flex: 1, minWidth: '180px' }}>
                    {lastActivity ? (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {getActivityTypeIcon(lastActivity.tipo)}
                            <span>
                                <strong>{lastActivity.tipo || 'Actividad'}:</strong> {lastActivity.descripcion.slice(0, 45)}
                                {lastActivity.descripcion.length > 45 ? '...' : ''}
                            </span>
                        </div>
                    ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            Sin actividades registradas
                        </span>
                    )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Button
                        variant="secondary"
                        onClick={() => onOpenActivity(d.id, d.nombre)}
                        style={{ height: '34px', padding: '0 12px', fontSize: '0.82rem', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        <Plus size={14} />
                        <span>Actividad</span>
                    </Button>

                    <Button
                        variant="secondary"
                        onClick={() => onToggleHistory(d.id)}
                        style={{ height: '34px', padding: '0 12px', fontSize: '0.82rem', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        <Clock size={14} />
                        <span>Historial ({acts.length})</span>
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </Button>
                </div>
            </div>

            {/* 5. HISTORIAL DESPLEGABLE (TIMELINE) */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25 }}
                        style={{ overflow: 'hidden', borderTop: '1px dashed var(--border)', paddingTop: '14px' }}
                    >
                        <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)' }}>
                            Historial de Seguimiento
                        </h4>

                        {acts.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '16px', background: 'var(--bg-elevated)', borderRadius: '12px' }}>
                                <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
                                    Aún no hay actividades registradas para este distribuidor.
                                </p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '240px', overflowY: 'auto', paddingRight: '4px' }}>
                                {acts.map(act => (
                                    <div 
                                        key={act.id} 
                                        style={{ 
                                            padding: '10px 14px', 
                                            borderRadius: '10px', 
                                            background: 'var(--bg-elevated)',
                                            border: '1px solid var(--border)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '4px'
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                {getActivityTypeIcon(act.tipo)}
                                                <strong style={{ color: 'var(--text)' }}>{act.tipo || 'Nota'}</strong>
                                                <span>por {act.usuario || 'Sistema'}</span>
                                            </div>
                                            <span>
                                                {act.fecha ? new Date(act.fecha).toLocaleString([], { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                                            </span>
                                        </div>
                                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text)', whiteSpace: 'pre-wrap' }}>
                                            {act.descripcion}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
