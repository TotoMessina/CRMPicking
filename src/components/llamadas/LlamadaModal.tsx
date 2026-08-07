import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Database, FileText, User } from 'lucide-react';
import { Llamada, useCreateLlamada, useUpdateLlamada } from '../../hooks/useLlamadas';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

// ── Color tokens ──────────────────────────────────────────
const COLOR_BD = { bg: 'rgba(59,130,246,0.06)', border: 'rgba(59,130,246,0.3)', text: '#3b82f6', dot: '#3b82f6' };
const COLOR_FORMS = { bg: 'rgba(16,185,129,0.06)', border: 'rgba(16,185,129,0.3)', text: '#10b981', dot: '#10b981' };
const COLOR_OP = { bg: 'rgba(245,158,11,0.06)', border: 'rgba(245,158,11,0.3)', text: '#f59e0b', dot: '#f59e0b' };

const RUBROS = [
    { value: '', label: 'Seleccionar...' },
    { value: 'kiosco', label: 'Kiosco / Almacén' },
    { value: 'almacen', label: 'Almacén' },
    { value: 'autoservicio', label: 'Autoservicio' },
    { value: 'otro', label: 'Otro' },
    { value: 'sin_comercio', label: 'Sin Comercio' },
];

const RESPUESTAS = [
    { value: '', label: 'Seleccionar...' },
    { value: 'sin_respuesta', label: 'Sin Respuesta' },
    { value: 'numero_incorrecto', label: 'Número incorrecto o inexistente' },
    { value: 'otro_momento', label: 'Llamada en otro momento' },
    { value: 'sin_interes', label: 'Sin Interés' },
    { value: 'exitosa', label: 'Llamada Exitosa' },
    { value: 'sin_comercio', label: 'Sin Comercio' },
];

const TIEMPOS = [
    { value: '', label: 'Seleccionar...' },
    { value: '1', label: '1 minuto' },
    { value: '2', label: '2 minutos' },
    { value: '3', label: '3 minutos' },
    { value: '4', label: '4 minutos' },
    { value: '5', label: '5 minutos' },
    { value: 'mayor_5', label: 'Mayor a 5 minutos' },
];

const REDES = [
    { value: '', label: 'Seleccionar...' },
    { value: 'instagram', label: 'Instagram' },
    { value: 'facebook', label: 'Facebook' },
    { value: 'ambas', label: 'Ambas' },
    { value: 'no', label: 'No' },
];

// ── Helpers ───────────────────────────────────────────────
const EMPTY_FORM: Partial<Llamada> = {
    nombre: '', apellido: '', telefono: '', mail: '',
    direccion: '', localidad: '', nombre_comercio: '',
    rubro: '', nombre_operador: '', respuesta_llamado: '',
    tiempo_llamado: '', siguio_redes: '',
    envio_whatsapp: null, completo_formulario: null, envio_listo: null,
};

function SectionBlock({ color, icon: Icon, title, children }: {
    color: typeof COLOR_BD; icon: any; title: string; children: React.ReactNode
}) {
    return (
        <div style={{
            border: `1px solid ${color.border}`,
            borderRadius: '16px',
            overflow: 'hidden',
            background: color.bg,
            marginBottom: '18px',
        }}>
            <div style={{
                padding: '10px 16px',
                borderBottom: `1px solid ${color.border}`,
                display: 'flex', alignItems: 'center', gap: '8px',
                background: `${color.bg}`,
            }}>
                <Icon size={14} style={{ color: color.text }} />
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: color.text, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                    {title}
                </span>
            </div>
            <div style={{ padding: '16px' }}>{children}</div>
        </div>
    );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
    return (
        <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '5px' }}>
                {label}{required && <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>}
            </label>
            {children}
        </div>
    );
}

const inputSt: React.CSSProperties = {
    width: '100%', padding: '9px 13px', borderRadius: '10px',
    border: '1px solid var(--border)', background: 'var(--bg-elevated)',
    color: 'var(--text)', fontSize: '0.9rem', outline: 'none',
    transition: 'border-color 0.2s', boxSizing: 'border-box',
};

function BoolField({ label, value, onChange }: { label: string; value: boolean | null; onChange: (v: boolean | null) => void }) {
    return (
        <Field label={label}>
            <div style={{ display: 'flex', gap: '8px' }}>
                {[{ v: true, l: 'Sí' }, { v: false, l: 'No' }, { v: null, l: 'Sin dato' }].map(opt => (
                    <button
                        key={String(opt.v)}
                        type="button"
                        onClick={() => onChange(opt.v)}
                        style={{
                            flex: 1, padding: '7px', borderRadius: '9px', border: '1px solid',
                            borderColor: value === opt.v ? (opt.v === true ? '#10b981' : opt.v === false ? '#ef4444' : '#94a3b8') : 'var(--border)',
                            background: value === opt.v ? (opt.v === true ? 'rgba(16,185,129,0.12)' : opt.v === false ? 'rgba(239,68,68,0.09)' : 'rgba(148,163,184,0.1)') : 'var(--bg-elevated)',
                            color: value === opt.v ? (opt.v === true ? '#10b981' : opt.v === false ? '#ef4444' : '#94a3b8') : 'var(--text-muted)',
                            fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                        }}
                    >
                        {opt.l}
                    </button>
                ))}
            </div>
        </Field>
    );
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    llamadaId: number | null;
    onSaved: () => void;
}

export function LlamadaModal({ isOpen, onClose, llamadaId, onSaved }: Props) {
    const { empresaActiva } = useAuth();
    const createMutation = useCreateLlamada();
    const updateMutation = useUpdateLlamada();
    const [form, setForm] = useState<Partial<Llamada>>(EMPTY_FORM);
    const [loading, setLoading] = useState(false);

    // Load existing llamada if editing
    useEffect(() => {
        if (!isOpen) return;
        if (!llamadaId) {
            setForm(EMPTY_FORM);
            return;
        }
        setLoading(true);
        (supabase as any)
            .from('llamadas')
            .select('*')
            .eq('id', llamadaId)
            .single()
            .then(({ data, error }: any) => {
                setLoading(false);
                if (error) { toast.error('Error al cargar la ficha'); return; }
                setForm(data || EMPTY_FORM);
            });
    }, [isOpen, llamadaId]);

    const set = (key: keyof Llamada, value: any) => setForm(prev => ({ ...prev, [key]: value }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!empresaActiva?.id) { toast.error('No hay empresa activa'); return; }

        const payload = { ...form, empresa_id: empresaActiva.id };

        if (llamadaId) {
            await updateMutation.mutateAsync({ id: llamadaId, data: payload });
        } else {
            await createMutation.mutateAsync(payload);
        }
        onSaved();
    };

    const isSaving = createMutation.isPending || updateMutation.isPending;

    if (!isOpen) return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="modal is-open"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onClick={onClose}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 10000,
                        background: 'rgba(0, 0, 0, 0.6)',
                        backdropFilter: 'blur(6px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '20px',
                    }}
                >
                    {/* Modal panel */}
                    <motion.div
                        className="modal-content"
                        onClick={e => e.stopPropagation()}
                        initial={{ opacity: 0, scale: 0.95, y: 15 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 15 }}
                        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                        style={{
                            width: '100%',
                            maxWidth: '680px',
                            background: 'var(--bg-card)',
                            borderRadius: '24px',
                            border: '1px solid var(--border)',
                            boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
                            maxHeight: '90vh',
                            display: 'flex',
                            flexDirection: 'column',
                            overflowY: 'auto',
                        }}
                    >
                        {/* Header */}
                        <div style={{
                            padding: '20px 24px', borderBottom: '1px solid var(--border)',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 2, borderRadius: '24px 24px 0 0',
                        }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--text)' }}>
                                    {llamadaId ? 'Editar Ficha de Llamada' : 'Nueva Ficha de Llamada'}
                                </h2>
                                <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                    Completá los datos de la llamada
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                id="btn-close-llamada-modal"
                                style={{
                                    width: 36, height: 36, borderRadius: '50%', border: '1px solid var(--border)',
                                    background: 'var(--bg-elevated)', color: 'var(--text)', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Leyenda de colores */}
                        <div style={{
                            padding: '12px 24px', background: 'var(--bg-elevated)',
                            display: 'flex', gap: '16px', flexWrap: 'wrap', borderBottom: '1px solid var(--border)',
                        }}>
                            {[
                                { color: COLOR_BD, label: 'Base de Datos' },
                                { color: COLOR_FORMS, label: 'Formulario' },
                                { color: COLOR_OP, label: 'Operador' },
                            ].map(({ color, label }) => (
                                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: color.dot, flexShrink: 0 }} />
                                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
                                </div>
                            ))}
                        </div>

                        {/* Form body */}
                        {loading ? (
                            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando...</div>
                        ) : (
                            <form onSubmit={handleSubmit} style={{ padding: '24px' }}>

                                {/* 🔵 BASE DE DATOS */}
                                <SectionBlock color={COLOR_BD} icon={Database} title="Base de Datos – Pre-cargado">
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
                                        <Field label="Nombre">
                                            <input id="llamada-nombre" style={inputSt} value={form.nombre || ''} onChange={e => set('nombre', e.target.value)} placeholder="Nombre..." />
                                        </Field>
                                        <Field label="Apellido">
                                            <input id="llamada-apellido" style={inputSt} value={form.apellido || ''} onChange={e => set('apellido', e.target.value)} placeholder="Apellido..." />
                                        </Field>
                                        <Field label="Teléfono">
                                            <input id="llamada-telefono" style={inputSt} value={form.telefono || ''} onChange={e => set('telefono', e.target.value)} placeholder="+54..." />
                                        </Field>
                                        <Field label="Mail">
                                            <input id="llamada-mail" style={inputSt} type="email" value={form.mail || ''} onChange={e => set('mail', e.target.value)} placeholder="correo@..." />
                                        </Field>
                                    </div>
                                </SectionBlock>

                                {/* 🟢 FORMULARIO */}
                                <SectionBlock color={COLOR_FORMS} icon={FileText} title="Formulario – Datos del Cliente">
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
                                        <Field label="Dirección">
                                            <input id="llamada-direccion" style={inputSt} value={form.direccion || ''} onChange={e => set('direccion', e.target.value)} placeholder="Calle y número..." />
                                        </Field>
                                        <Field label="Localidad">
                                            <input id="llamada-localidad" style={inputSt} value={form.localidad || ''} onChange={e => set('localidad', e.target.value)} placeholder="Ciudad..." />
                                        </Field>
                                    </div>
                                    <Field label="Nombre del Comercio">
                                        <input id="llamada-nombre-comercio" style={inputSt} value={form.nombre_comercio || ''} onChange={e => set('nombre_comercio', e.target.value)} placeholder="Nombre del comercio..." />
                                    </Field>
                                </SectionBlock>

                                {/* 🟠 OPERADOR */}
                                <SectionBlock color={COLOR_OP} icon={User} title="Operador – Datos de la Llamada">
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
                                        <Field label="Rubro">
                                            <select id="llamada-rubro" style={inputSt} value={form.rubro || ''} onChange={e => set('rubro', e.target.value)}>
                                                {RUBROS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                                            </select>
                                        </Field>
                                        <Field label="Nombre del Operador">
                                            <input id="llamada-operador" style={inputSt} value={form.nombre_operador || ''} onChange={e => set('nombre_operador', e.target.value)} placeholder="Nombre del operador..." />
                                        </Field>
                                        <Field label="Respuesta del Llamado">
                                            <select id="llamada-respuesta" style={inputSt} value={form.respuesta_llamado || ''} onChange={e => set('respuesta_llamado', e.target.value)}>
                                                {RESPUESTAS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                                            </select>
                                        </Field>
                                        <Field label="Tiempo del Llamado">
                                            <select id="llamada-tiempo" style={inputSt} value={form.tiempo_llamado || ''} onChange={e => set('tiempo_llamado', e.target.value)}>
                                                {TIEMPOS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                                            </select>
                                        </Field>
                                        <Field label="Nos siguió en redes">
                                            <select id="llamada-redes" style={inputSt} value={form.siguio_redes || ''} onChange={e => set('siguio_redes', e.target.value)}>
                                                {REDES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                                            </select>
                                        </Field>
                                    </div>

                                    {/* Booleanos */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 14px', marginTop: '4px' }}>
                                        <BoolField
                                            label="Envío de WhatsApp"
                                            value={form.envio_whatsapp ?? null}
                                            onChange={v => set('envio_whatsapp', v)}
                                        />
                                        <BoolField
                                            label='Completó el formulario'
                                            value={form.completo_formulario ?? null}
                                            onChange={v => set('completo_formulario', v)}
                                        />
                                        <BoolField
                                            label='Envió "Listo"'
                                            value={form.envio_listo ?? null}
                                            onChange={v => set('envio_listo', v)}
                                        />
                                    </div>
                                </SectionBlock>

                                {/* Footer */}
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        style={{
                                            padding: '10px 22px', borderRadius: '12px', border: '1px solid var(--border)',
                                            background: 'var(--bg-elevated)', color: 'var(--text)', fontSize: '0.9rem',
                                            fontWeight: 600, cursor: 'pointer',
                                        }}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        id="btn-save-llamada"
                                        type="submit"
                                        disabled={isSaving}
                                        style={{
                                            padding: '10px 28px', borderRadius: '12px',
                                            border: 'none', background: 'var(--accent)',
                                            color: 'white', fontSize: '0.9rem', fontWeight: 700,
                                            cursor: isSaving ? 'not-allowed' : 'pointer',
                                            opacity: isSaving ? 0.7 : 1,
                                        }}
                                    >
                                        {isSaving ? 'Guardando...' : llamadaId ? 'Actualizar' : 'Guardar'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
}
