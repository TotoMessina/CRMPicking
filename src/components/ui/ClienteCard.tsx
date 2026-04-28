import React, { memo, useState } from 'react';
import { Phone, MapPin, Mail, Calendar, Edit2, Trash2, User, Clock, Sparkles, Wand2 } from 'lucide-react';
import { Button } from './Button';
import { motion, AnimatePresence } from 'framer-motion';
import { ActivityTimeline } from './ActivityTimeline';
import { Client, ClientActivity } from '../../types/client';
import { esEstadoFinal } from '../../constants/estados';
import { formatToLocal } from '../../utils/dateUtils';
import { getChurnRisk } from '../../utils/riskScoring';

import { useAuth } from '../../contexts/AuthContext';
import { aiProvider } from '../../lib/aiProvider';
import toast from 'react-hot-toast';

interface Props {
    cliente: Client;
    acts: ClientActivity[];
    isExpanded: boolean;
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
    onQuickDate: (id: string, days: number | null) => void;
    onToggleHistory: (id: string) => void;
    onRegistrarVisita: (id: string, nombre: string) => void;
    onRegistrarLlamada: (id: string, nombre: string) => void;
    onOpenActivity: (id: string, nombre: string) => void;
}

const getAISmartTags = (activities: ClientActivity[], c: Client) => {
    const allText = activities.map(a => `${a.descripcion} ${a.notas || ''}`).join(' ').toLowerCase();
    const tags: { text: string; color: string }[] = [];
    
    const estadoNum = c.estado ? parseInt(c.estado.split(' ')[0]) : 0;
    const situacion = c.situacion?.toLowerCase() || '';

    // 1. ESTADO DE ADOPCIÓN (REGLAS DE NEGOCIO)
    if (estadoNum === 3) tags.push({ text: '📱 App (Sin Tienda)', color: '#f59e0b' });
    if (estadoNum === 4) tags.push({ text: '✨ Tienda Orgánica', color: '#8b5cf6' });
    if (estadoNum === 5) tags.push({ text: '🤝 Convertido (Field)', color: '#10b981' });
    if (estadoNum === 2 || estadoNum === 6) tags.push({ text: '🚫 No Interesado', color: '#ef4444' });

    // 2. SITUACIÓN OPERATIVA
    if (situacion === 'en funcionamiento') tags.push({ text: '🚀 Operativo', color: '#10b981' });
    else if (situacion === 'en proceso') tags.push({ text: '⚒️ Cargando Catálogo', color: '#3b82f6' });
    else if (situacion === 'sin comunicacion nueva' && (estadoNum >= 3)) tags.push({ text: '❓ Estado Incierto', color: '#64748b' });

    // 3. ALERTAS DE HISTORIAL
    if (allText.includes('error') || allText.includes('bug') || allText.includes('falla')) 
        tags.push({ text: '🛠️ Soporte Urgente', color: '#dc2626' });

    if (allText.includes('señor grande') || allText.includes('celular viejo')) 
        tags.push({ text: '📵 Barrera Técnica', color: '#64748b' });

    return tags;
};

export const ClienteCard = memo<Props>(({
    cliente: c,
    acts,
    isExpanded,
    onEdit,
    onDelete,
    onQuickDate,
    onToggleHistory,
    onRegistrarVisita,
    onRegistrarLlamada,
    onOpenActivity
}) => {
    const { isDemoMode } = useAuth();
    const [aiResult, setAiResult] = useState<any>(null);
    const [isSummarizing, setIsSummarizing] = useState(false);

    const handleSummarize = async () => {
        setIsSummarizing(true);
        try {
            const lastDate = acts.length > 0 ? new Date(acts[0].fecha) : null;
            const diffDays = lastDate 
                ? Math.floor((new Date().getTime() - lastDate.getTime()) / (1000 * 3600 * 24))
                : 365;

            const res = await aiProvider.summarizeActivities(
                acts.map(a => ({
                    fecha: a.fecha,
                    descripcion: a.descripcion,
                    notas: a.notas || ''
                })),
                {
                    estado: c.estado,
                    situacion: c.situacion,
                    interes: c.interes,
                    diasSinContacto: diffDays,
                    rubro: c.rubro
                }
            );
            setAiResult(res);
        } catch (error) {
            console.error(error);
            toast.error("Error al generar análisis.");
        } finally {
            setIsSummarizing(false);
        }
    };

    const visitCount = acts.filter(a => a.descripcion === 'Visita realizada').length;
    const callCount = acts.filter(a => a.descripcion === 'Llamada realizada').length;
    const hasPhone = Boolean(c.telefono);
    const hasEmail = Boolean(c.mail);
    const hasAddress = Boolean(c.direccion);

    let accentColor = 'transparent';
    if (esEstadoFinal(c.estado)) {
        if (c.situacion === 'en funcionamiento') accentColor = 'var(--success)';
        else if (c.situacion === 'en proceso') accentColor = '#f59e0b'; // Amber
        else accentColor = 'var(--text-muted)';
    }

    const { level: churnLevel, color: churnColor, label: churnLabel, diasSinContacto } = getChurnRisk(c);
    const showChurnWarning = churnLevel === 'alto' || churnLevel === 'medio';
    const aiTags = getAISmartTags(acts, c);

    return (
        <div className="bento-card" style={{ padding: '24px', position: 'relative', display: 'flex', flexDirection: 'column', gap: '16px', overflow: 'hidden' }}>
            {accentColor !== 'transparent' && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: accentColor }}></div>}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, paddingRight: '12px' }}>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text)' }}>
                        {c.nombre_local || c.nombre || "(Sin nombre)"}
                    </h3>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                        Creado: {c.clientes?.created_at ? new Date(c.clientes.created_at).toLocaleDateString('es-AR') : c.created_at ? new Date(c.created_at).toLocaleDateString('es-AR') : '-'}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                        {c.tipo_contacto && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text)', fontWeight: 600 }}>
                                {c.tipo_contacto === 'Llamada' ? <Phone size={15} color="var(--accent)" /> : <MapPin size={15} color="var(--accent)" />}
                                {c.tipo_contacto}
                            </div>
                        )}
                        {hasAddress && <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={15} /> {c.direccion}</div>}
                        {hasPhone && <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Phone size={15} /> {c.telefono}</div>}
                        {hasEmail && <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Mail size={15} /> {c.mail}</div>}
                        {(c.fecha_proximo_contacto || c.hora_proximo_contacto) && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent)', fontWeight: 600, marginTop: '4px' }}>
                                <Calendar size={15} />
                                Próx: {c.fecha_proximo_contacto ? formatToLocal(c.fecha_proximo_contacto) : ''}
                                {c.hora_proximo_contacto ? ` a las ${c.hora_proximo_contacto.slice(0, 5)}` : ""}
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => onEdit(c.id)} className="" style={{ padding: '8px', borderRadius: '10px', background: 'var(--bg)', color: 'var(--text-muted)', border: '1px solid var(--border)', cursor: 'pointer' }} title="Editar">
                        <Edit2 size={16} />
                    </button>
                    {!isDemoMode && (
                        <button onClick={() => onDelete(c.id)} className="" style={{ padding: '8px', borderRadius: '10px', border: '1px solid var(--border)', background: 'rgba(239, 68, 68, 0.05)', color: 'var(--danger)', cursor: 'pointer' }} title="Eliminar">
                            <Trash2 size={16} />
                        </button>
                    )}
                </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {c.estado && (
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '4px 10px', borderRadius: '99px', background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--border)' }}>
                        {c.estado}
                    </span>
                )}
                {esEstadoFinal(c.estado) && c.situacion && (
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '4px 10px', borderRadius: '99px', background: accentColor !== 'transparent' ? `${accentColor}20` : 'var(--bg-elevated)', color: accentColor !== 'transparent' ? accentColor : 'var(--text)', border: `1px solid ${accentColor !== 'transparent' ? accentColor : 'var(--border)'}` }}>
                        {c.situacion.toUpperCase()}
                    </span>
                )}
                {c.rubro && (
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '4px 10px', borderRadius: '99px', background: 'var(--bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                        {c.rubro}
                    </span>
                )}
                {c.interes && (
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '4px 10px', borderRadius: '99px', background: c.interes === 'Alto' ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg)', color: c.interes === 'Alto' ? '#ef4444' : 'var(--text-muted)', border: '1px solid var(--border)' }}>
                        🔥 Interés: {c.interes}
                    </span>
                )}
                {c.responsable && (
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '4px 10px', borderRadius: '99px', background: 'var(--bg-elevated)', color: 'var(--text)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <User size={12} /> {c.responsable}
                    </span>
                )}
                
                {showChurnWarning && (
                    <span 
                        title={`No se registra actividad hace ${diasSinContacto > 1000 ? 'mucho' : diasSinContacto} días`}
                        style={{ 
                            fontSize: '0.75rem', fontWeight: 700, padding: '4px 10px', borderRadius: '99px', 
                            background: `${churnColor}15`, color: churnColor, border: `1px solid ${churnColor}50`, 
                            display: 'flex', alignItems: 'center', gap: '4px',
                            animation: churnLevel === 'alto' ? 'pulse 2s infinite' : 'none'
                        }}
                    >
                        {churnLabel} ({diasSinContacto > 1000 ? 'Nunca' : `${diasSinContacto}d`})
                    </span>
                )}

                {/* AI Smart Tags */}
                {aiTags.map((tag, idx) => (
                    <span key={idx} className="animate-ai-pulse" style={{ 
                        fontSize: '0.75rem', fontWeight: 800, padding: '4px 12px', borderRadius: '99px', 
                        background: `${tag.color}15`, color: tag.color, border: `1px solid ${tag.color}50`,
                        boxShadow: `0 0 10px ${tag.color}20`
                    }}>
                        {tag.text}
                    </span>
                ))}

                {/* Etiquetas de Grupos */}
                {c.grupos && c.grupos.map(g => (
                    <span key={g.id} style={{ 
                        fontSize: '0.72rem', fontWeight: 700, padding: '3px 9px', borderRadius: '99px', 
                        background: `${g.color}15`, color: g.color, border: `1px solid ${g.color}40`,
                        display: 'flex', alignItems: 'center'
                    }}>
                        {g.nombre}
                    </span>
                ))}
            </div>

            {c.notas && (
                <div style={{ fontSize: '0.9rem', color: 'var(--text)', background: 'rgba(255,255,255,0.02)', border: '1px dashed var(--border)', padding: '12px', borderRadius: '12px', fontStyle: 'italic' }}>
                    "{c.notas}"
                </div>
            )}

            {/* AI Summary Section */}
            {aiResult ? (
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    style={{ 
                        padding: '2px',
                        borderRadius: '24px', 
                        background: 'linear-gradient(135deg, #8b5cf6, #d946ef)', 
                        position: 'relative',
                        boxShadow: '0 12px 40px rgba(139, 92, 246, 0.2)',
                    }}
                >
                    <div style={{ 
                        background: 'var(--bg-card)',
                        borderRadius: '22px', 
                        padding: '20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px'
                    }}>
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#8b5cf6', fontWeight: 900, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                                <Sparkles size={16} /> Inteligencia Estratégica
                            </div>
                            <button 
                                onClick={() => setAiResult(null)}
                                style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem', width: '28px', height: '28px', borderRadius: '50%', display: 'grid', placeItems: 'center', transition: 'all 0.2s' }}
                            >
                                ×
                            </button>
                        </div>

                        {/* Bento Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            {/* Digital Status Box */}
                            <div style={{ 
                                padding: '16px', borderRadius: '18px', 
                                background: `${aiResult.estadoDigital.color}10`,
                                border: `1px solid ${aiResult.estadoDigital.color}30`,
                                display: 'flex', flexDirection: 'column', gap: '8px'
                            }}>
                                <div style={{ fontSize: '1.5rem' }}>{aiResult.estadoDigital.icon}</div>
                                <div style={{ fontWeight: 800, color: aiResult.estadoDigital.color, fontSize: '0.9rem' }}>{aiResult.estadoDigital.label}</div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>{aiResult.estadoDigital.desc}</div>
                            </div>

                            {/* Alertas Box */}
                            <div style={{ 
                                padding: '16px', borderRadius: '18px', 
                                background: aiResult.alertas.length > 0 ? 'rgba(239, 68, 68, 0.05)' : 'rgba(255,255,255,0.02)',
                                border: aiResult.alertas.length > 0 ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid var(--border)',
                                display: 'flex', flexDirection: 'column', gap: '8px'
                            }}>
                                <div style={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', color: aiResult.alertas.length > 0 ? '#ef4444' : 'var(--text-muted)' }}>
                                    ⚠️ Alertas Críticas
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    {aiResult.alertas.length > 0 ? aiResult.alertas.map((a: string, i: number) => (
                                        <div key={i} style={{ fontSize: '0.72rem', color: '#ef4444', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            • {a}
                                        </div>
                                    )) : <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Sin alertas detectadas.</div>}
                                </div>
                            </div>
                        </div>

                        {/* Patrones Box */}
                        <div style={{ padding: '16px', borderRadius: '18px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
                            <div style={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Wand2 size={12} /> Detección de Patrones
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                {aiResult.patrones.map((p: string, i: number) => (
                                    <div key={i} style={{ fontSize: '0.75rem', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#8b5cf6' }}></div>
                                        {p}
                                    </div>
                                ))}
                                {aiResult.patrones.length === 0 && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Analizando tendencias...</div>}
                            </div>
                        </div>

                        {/* Plan de Acción */}
                        <div style={{ 
                            padding: '16px', borderRadius: '18px', 
                            background: 'linear-gradient(to right, rgba(139, 92, 246, 0.1), transparent)',
                            border: '1px solid rgba(139, 92, 246, 0.2)'
                        }}>
                            <div style={{ fontWeight: 800, fontSize: '0.72rem', textTransform: 'uppercase', color: '#8b5cf6', marginBottom: '12px' }}>
                                🎯 Próximos Hitos (Next Milestones)
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {aiResult.planAccion.map((p: string, i: number) => (
                                    <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                        <div style={{ 
                                            minWidth: '18px', height: '18px', borderRadius: '50%', 
                                            background: '#8b5cf6', color: 'white', 
                                            display: 'grid', placeItems: 'center', 
                                            fontSize: '0.65rem', fontWeight: 900 
                                        }}>
                                            {i + 1}
                                        </div>
                                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)', lineHeight: '1.3' }}>{p}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </motion.div>
            ) : (
                <button 
                    onClick={handleSummarize}
                    disabled={isSummarizing}
                    className={`ai-button ${isSummarizing ? 'thinking' : ''}`}
                    style={{ 
                        alignSelf: 'flex-start',
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '10px 20px', borderRadius: '14px',
                        fontSize: '0.9rem', fontWeight: 800
                    }}
                >
                    {isSummarizing ? <Sparkles size={18} className="animate-spin" /> : <Wand2 size={18} />}
                    {isSummarizing ? 'IA Generando Estrategia...' : '✨ Analizar Estrategia con IA'}
                </button>
            )}

            <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', marginRight: '2px' }}>
                        <Calendar size={13} style={{ marginRight: '4px' }} /> Próx. contacto:
                    </span>
                    {[{ label: '+3d', days: 3 }, { label: '+7d', days: 7 }, { label: '+15d', days: 15 }, { label: '+1mes', days: 30 }].map(({ label, days }) => (
                        <button
                            key={label}
                            onClick={() => onQuickDate(c.id, days)}
                            className="quick-date-btn"
                            style={{ fontSize: '0.72rem', fontWeight: 600, padding: '3px 9px', borderRadius: '99px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-muted)', cursor: 'pointer' }}
                        >{label}</button>
                    ))}
                    {c.fecha_proximo_contacto && (
                        <button onClick={() => onQuickDate(c.id, null)} style={{ fontSize: '0.72rem', fontWeight: 600, padding: '3px 9px', borderRadius: '99px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)', color: 'var(--danger)', cursor: 'pointer' }}>✕</button>
                    )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button onClick={() => onToggleHistory(c.id)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={16} /> Historial ({acts.length})
                    </button>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => onRegistrarVisita(c.id, c.nombre || c.nombre_local || '')} style={{ padding: '6px 12px', fontSize: '0.85rem', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.35)', background: 'rgba(16,185,129,0.08)', color: '#10b981', cursor: 'pointer', fontWeight: 600 }}>
                            🏪 Visita {visitCount > 0 && <span>({visitCount})</span>}
                        </button>
                        <button onClick={() => onRegistrarLlamada(c.id, c.nombre || c.nombre_local || '')} style={{ padding: '6px 12px', fontSize: '0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-active)', color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}>
                            📞 Llamada {callCount > 0 && <span>({callCount})</span>}
                        </button>
                        <Button variant="secondary" onClick={() => onOpenActivity(c.id, c.nombre || c.nombre_local || '')} style={{ padding: '6px 12px', fontSize: '0.85rem', borderRadius: '8px' }}>
                            + Actividad
                        </Button>
                    </div>
                </div>

                <AnimatePresence>
                    {isExpanded && (
                        <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: 'easeOut' }}
                            style={{ overflow: 'hidden' }}
                        >
                            <div style={{ padding: '12px 4px 12px 0', borderTop: '1px solid var(--border)', marginTop: '8px' }}>
                                <ActivityTimeline activities={acts} />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}, (prevProps, nextProps) => {
    return (
        prevProps.isExpanded === nextProps.isExpanded &&
        prevProps.acts?.length === nextProps.acts?.length &&
        prevProps.cliente.fecha_proximo_contacto === nextProps.cliente.fecha_proximo_contacto &&
        prevProps.cliente.hora_proximo_contacto === nextProps.cliente.hora_proximo_contacto &&
        prevProps.cliente.estado === nextProps.cliente.estado &&
        prevProps.cliente.situacion === nextProps.cliente.situacion &&
        prevProps.cliente.notas === nextProps.cliente.notas &&
        prevProps.cliente.responsable === nextProps.cliente.responsable &&
        prevProps.cliente.rubro === nextProps.cliente.rubro &&
        prevProps.cliente.interes === nextProps.cliente.interes &&
        prevProps.cliente.tipo_contacto === nextProps.cliente.tipo_contacto &&
        prevProps.cliente.nombre === nextProps.cliente.nombre &&
        prevProps.cliente.nombre_local === nextProps.cliente.nombre_local &&
        prevProps.cliente.telefono === nextProps.cliente.telefono &&
        prevProps.cliente.mail === nextProps.cliente.mail &&
        prevProps.cliente.direccion === nextProps.cliente.direccion &&
        prevProps.cliente.updated_at === nextProps.cliente.updated_at &&
        prevProps.cliente.clientes?.created_at === nextProps.cliente.clientes?.created_at &&
        prevProps.cliente.grupos?.length === nextProps.cliente.grupos?.length
    );
});
