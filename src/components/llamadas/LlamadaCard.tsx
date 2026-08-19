import React from 'react';
import { Llamada, useIncrementLlamadaCount } from '../../hooks/useLlamadas';
import { Pencil, Trash2, Phone, Mail, MapPin, Store, User, Clock, MessageCircle, Instagram, Facebook, CheckCircle2, XCircle, FileText, Sparkles, RefreshCw, PhoneCall, Plus, Minus, Compass } from 'lucide-react';
import { motion } from 'framer-motion';

// ── Color tokens ──────────────────────────────────────────
const COLOR_BD = {
    bg: 'rgba(59,130,246,0.07)',
    border: 'rgba(59,130,246,0.25)',
    text: '#3b82f6',
    header: 'rgba(59,130,246,0.12)',
};
const COLOR_FORMS = {
    bg: 'rgba(16,185,129,0.07)',
    border: 'rgba(16,185,129,0.25)',
    text: '#10b981',
    header: 'rgba(16,185,129,0.12)',
};
const COLOR_OP = {
    bg: 'rgba(245,158,11,0.07)',
    border: 'rgba(245,158,11,0.25)',
    text: '#f59e0b',
    header: 'rgba(245,158,11,0.12)',
};

const ETIQUETA_STYLES: Record<string, { label: string; bg: string; border: string; text: string; icon: any }> = {
    'cliente nuevo': {
        label: 'Cliente Nuevo',
        bg: 'rgba(16,185,129,0.12)',
        border: 'rgba(16,185,129,0.35)',
        text: '#10b981',
        icon: Sparkles,
    },
    'cliente actualizado': {
        label: 'Cliente Actualizado',
        bg: 'rgba(59,130,246,0.12)',
        border: 'rgba(59,130,246,0.35)',
        text: '#3b82f6',
        icon: RefreshCw,
    },
};

// ── Helpers ───────────────────────────────────────────────
const RUBRO_LABELS: Record<string, string> = {
    kiosco: 'Kiosco / Almacén',
    almacen: 'Almacén',
    autoservicio: 'Autoservicio',
    otro: 'Otro',
    sin_comercio: 'Sin Comercio',
};

const RESPUESTA_LABELS: Record<string, string> = {
    sin_respuesta: 'Sin Respuesta',
    numero_incorrecto: 'Número incorrecto',
    otro_momento: 'Llamar otro momento',
    sin_interes: 'Sin Interés',
    exitosa: 'Llamada Exitosa',
    sin_comercio: 'Sin Comercio',
};

const RESPUESTA_COLORS: Record<string, string> = {
    sin_respuesta: '#94a3b8',
    numero_incorrecto: '#ef4444',
    otro_momento: '#f59e0b',
    sin_interes: '#ef4444',
    exitosa: '#10b981',
    sin_comercio: '#64748b',
};

const REDES_LABELS: Record<string, string> = {
    instagram: 'Instagram',
    facebook: 'Facebook',
    ambas: 'Instagram + Facebook',
    no: 'No siguió',
};

function SectionHeader({ color, label }: { color: typeof COLOR_BD; label: string }) {
    return (
        <div style={{
            background: color.header,
            borderBottom: `1px solid ${color.border}`,
            padding: '6px 14px',
            borderRadius: '10px 10px 0 0',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
        }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: color.text, display: 'inline-block', flexShrink: 0 }} />
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: color.text, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                {label}
            </span>
        </div>
    );
}

function InfoRow({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | null | undefined; color: string }) {
    if (!value) return null;
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
            <Icon size={13} style={{ color, flexShrink: 0 }} />
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', flexShrink: 0 }}>{label}:</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)', wordBreak: 'break-word' }}>{value}</span>
        </div>
    );
}

function BoolBadge({ value, label }: { value: boolean | null; label: string }) {
    if (value === null || value === undefined) return null;
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '3px 0' }}>
            {value
                ? <CheckCircle2 size={13} style={{ color: '#10b981' }} />
                : <XCircle size={13} style={{ color: '#ef4444' }} />
            }
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{label}:</span>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: value ? '#10b981' : '#ef4444' }}>
                {value ? 'Sí' : 'No'}
            </span>
        </div>
    );
}

interface Props {
    llamada: Llamada;
    onEdit: (id: number) => void;
    onDelete: (id: number) => void;
}

export function LlamadaCard({ llamada: l, onEdit, onDelete }: Props) {
    const incrementMutation = useIncrementLlamadaCount();
    const fullName = [l.nombre, l.apellido].filter(Boolean).join(' ') || '—';
    const respuestaColor = l.respuesta_llamado ? RESPUESTA_COLORS[l.respuesta_llamado] || '#94a3b8' : '#94a3b8';
    const callCount = Math.max(0, Number(l.cantidad_llamadas ?? 0));

    const normEtiqueta = (l.etiqueta || '').toLowerCase().trim();
    const etiquetaConfig = ETIQUETA_STYLES[normEtiqueta] || (normEtiqueta.includes('nuevo') ? ETIQUETA_STYLES['cliente nuevo'] : normEtiqueta.includes('actualiz') ? ETIQUETA_STYLES['cliente actualizado'] : null);

    return (
        <div
            className="bento-card"
            style={{
                padding: 0,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: '20px',
                border: '1px solid var(--border)',
                background: 'var(--bg-card)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                transition: 'box-shadow 0.2s, transform 0.2s',
            }}
            onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px rgba(0,0,0,0.12)';
            }}
            onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.transform = '';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(0,0,0,0.06)';
            }}
        >
            {/* ── CARD HEADER ─────────────────────── */}
            <div style={{
                padding: '16px 18px 12px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '8px',
            }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                    <h3 style={{
                        margin: 0, fontSize: '1.05rem', fontWeight: 700,
                        color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                    }}>
                        {fullName}
                    </h3>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginTop: 3 }}>
                        {l.nombre_operador && (
                            <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                                <User size={11} /> {l.nombre_operador}
                            </span>
                        )}
                        {(l.updated_at || l.created_at) && (
                            <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }} title={`Creado: ${l.created_at ? new Date(l.created_at).toLocaleString() : '—'}`}>
                                <Clock size={11} style={{ opacity: 0.6 }} />
                                {new Date(l.updated_at || l.created_at).toLocaleString([], { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </span>
                        )}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center', flexShrink: 0 }}>
                    {etiquetaConfig && (
                        <span style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '3px 9px',
                            borderRadius: '20px',
                            background: etiquetaConfig.bg,
                            color: etiquetaConfig.text,
                            border: `1px solid ${etiquetaConfig.border}`,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            whiteSpace: 'nowrap',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                        }}>
                            <etiquetaConfig.icon size={11} />
                            {etiquetaConfig.label}
                        </span>
                    )}
                    {l.respuesta_llamado && (
                        <span style={{
                            fontSize: '0.7rem', fontWeight: 700, padding: '3px 9px', borderRadius: '20px',
                            background: `${respuestaColor}20`, color: respuestaColor, border: `1px solid ${respuestaColor}40`,
                            whiteSpace: 'nowrap',
                        }}>
                            {RESPUESTA_LABELS[l.respuesta_llamado]}
                        </span>
                    )}
                </div>
            </div>

            {/* ── SECCIONES ────────────────────────── */}
            <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>

                {/* 🔵 BASE DE DATOS */}
                <div style={{ border: `1px solid ${COLOR_BD.border}`, borderRadius: '12px', overflow: 'hidden', background: COLOR_BD.bg }}>
                    <SectionHeader color={COLOR_BD} label="Base de Datos" />
                    <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <InfoRow icon={Phone} label="Teléfono" value={l.telefono} color={COLOR_BD.text} />
                        <InfoRow icon={Mail} label="Mail" value={l.mail} color={COLOR_BD.text} />
                    </div>
                </div>

                {/* 🟢 FORMULARIO */}
                {(l.direccion || l.localidad || l.provincia || l.nombre_comercio || l.rol_contacto || l.instagram || l.origen_contacto) && (
                    <div style={{ border: `1px solid ${COLOR_FORMS.border}`, borderRadius: '12px', overflow: 'hidden', background: COLOR_FORMS.bg }}>
                        <SectionHeader color={COLOR_FORMS} label="Formulario" />
                        <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <InfoRow icon={MapPin} label="Dirección" value={l.direccion} color={COLOR_FORMS.text} />
                            <InfoRow icon={MapPin} label="Localidad" value={l.localidad} color={COLOR_FORMS.text} />
                            <InfoRow icon={MapPin} label="Provincia" value={l.provincia} color={COLOR_FORMS.text} />
                            <InfoRow icon={Store} label="Comercio" value={l.nombre_comercio} color={COLOR_FORMS.text} />
                            <InfoRow icon={User} label="Rol" value={l.rol_contacto} color={COLOR_FORMS.text} />
                            <InfoRow icon={Instagram} label="Instagram" value={l.instagram} color={COLOR_FORMS.text} />
                            <InfoRow icon={Compass} label="Origen BD" value={l.origen_contacto} color={COLOR_FORMS.text} />
                        </div>
                    </div>
                )}

                {/* 🟠 OPERADOR */}
                <div style={{ border: `1px solid ${COLOR_OP.border}`, borderRadius: '12px', overflow: 'hidden', background: COLOR_OP.bg }}>
                    <SectionHeader color={COLOR_OP} label="Operador" />
                    <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {l.rubro && (
                            <InfoRow icon={Store} label="Rubro" value={RUBRO_LABELS[l.rubro] || l.rubro} color={COLOR_OP.text} />
                        )}
                        {l.tiempo_llamado && (
                            <InfoRow icon={Clock} label="Tiempo (min)" value={l.tiempo_llamado === 'mayor_5' ? '> 5 min' : `${l.tiempo_llamado} min`} color={COLOR_OP.text} />
                        )}
                        {l.siguio_redes && (
                            <InfoRow icon={Instagram} label="Siguió en redes" value={REDES_LABELS[l.siguio_redes] || l.siguio_redes} color={COLOR_OP.text} />
                        )}
                        <BoolBadge value={l.envio_whatsapp} label="WhatsApp enviado" />
                        <BoolBadge value={l.completo_formulario} label="Completó formulario" />
                        <BoolBadge value={l.envio_listo} label='Envió "Listo"' />
                    </div>
                </div>
            </div>

            {/* ── FOOTER ACTIONS ──────────────────── */}
            <div style={{
                padding: '10px 14px',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                gap: '8px',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
            }}>
                {/* Contador de llamadas con botón interactivo +1 */}
                <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: 'var(--bg-elevated)',
                    padding: '3px 6px 3px 10px',
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                }}>
                    <PhoneCall size={12} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text)' }}>
                        {callCount} {callCount === 1 ? 'llamada' : 'llamadas'}
                    </span>

                    {/* Botón Decrementar (-) si es mayor a 0 */}
                    {callCount > 0 && (
                        <button
                            type="button"
                            id={`btn-dec-llamada-${l.id}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                incrementMutation.mutate({ id: l.id, delta: -1, currentCount: callCount });
                            }}
                            disabled={incrementMutation.isPending}
                            title="Restar 1 llamada"
                            style={{
                                width: '20px', height: '20px', borderRadius: '6px',
                                border: '1px solid var(--border)', background: 'var(--bg-card)',
                                color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
                                justifyContent: 'center', cursor: 'pointer', marginLeft: '2px',
                                padding: 0,
                            }}
                        >
                            <Minus size={11} />
                        </button>
                    )}

                    {/* Botón Sumar (+1) */}
                    <button
                        type="button"
                        id={`btn-inc-llamada-${l.id}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            incrementMutation.mutate({ id: l.id, delta: 1, currentCount: callCount });
                        }}
                        disabled={incrementMutation.isPending}
                        title="Registrar +1 llamada realizada a este cliente"
                        style={{
                            padding: '3px 8px', borderRadius: '8px',
                            border: 'none', background: 'var(--accent)',
                            color: 'white', display: 'flex', alignItems: 'center',
                            gap: '2px', cursor: 'pointer', marginLeft: '2px',
                            fontSize: '0.74rem', fontWeight: 700,
                            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                            transition: 'transform 0.1s, opacity 0.1s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                    >
                        <Plus size={11} strokeWidth={3} /> 1
                    </button>
                </div>

                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <button
                        id={`btn-edit-llamada-${l.id}`}
                        onClick={() => onEdit(l.id)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 5,
                            padding: '7px 12px', borderRadius: '10px',
                            border: '1px solid var(--border)', background: 'var(--bg-elevated)',
                            color: 'var(--text)', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
                            transition: 'background 0.15s',
                        }}
                        title="Editar ficha"
                    >
                        <Pencil size={13} /> Editar
                    </button>
                    <button
                        id={`btn-delete-llamada-${l.id}`}
                        onClick={() => onDelete(l.id)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 5,
                            padding: '7px 10px', borderRadius: '10px',
                            border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.07)',
                            color: '#ef4444', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
                            transition: 'background 0.15s',
                        }}
                        title="Eliminar ficha"
                    >
                        <Trash2 size={13} />
                    </button>
                </div>
            </div>
        </div>
    );
}
