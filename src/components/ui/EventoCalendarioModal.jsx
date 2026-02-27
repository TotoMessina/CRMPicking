import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../lib/supabase';
import { Button } from './Button';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';

const EVENT_COLORS = {
    interno: "#FF2BD6",
    reunion: "#3b82f6",
    virtual: "#8b5cf6",
    contacto: "#f97316",
    empresa: "#ec4899",
    activacion: "#10b981",
    capacitacion: "#14b8a6",
    feriado: "#ef4444",
};

export function EventoCalendarioModal({ isOpen, onClose, eventoId, clienteId, initialData, isContacto, onSaved }) {
    const [loading, setLoading] = useState(false);
    const [usuariosList, setUsuariosList] = useState([]);
    const [historialContacto, setHistorialContacto] = useState("");

    // Form state
    const [formData, setFormData] = useState({
        titulo: '',
        descripcion: '',
        tipo: 'interno',
        color: '#FF2BD6',
        inicio: '',
        fin: '',
        allDay: false,
        usuarios: []
    });

    useEffect(() => {
        if (isOpen) {
            fetchUsuarios();
            if (isContacto && clienteId) {
                fetchHistorialContacto(clienteId);
            }
            if (eventoId || isContacto) {
                // Populate from initialData
                setFormData(prev => ({
                    ...prev,
                    titulo: initialData?.titulo || '',
                    descripcion: initialData?.descripcion || '',
                    tipo: initialData?.tipo || 'interno',
                    color: initialData?.color || '#FF2BD6',
                    inicio: initialData?.inicio || '',
                    fin: initialData?.fin || '',
                    allDay: !!initialData?.allDay,
                    usuarios: initialData?.usuarios || []
                }));
            } else {
                // New Event
                setFormData({
                    titulo: '',
                    descripcion: '',
                    tipo: 'interno',
                    color: '#FF2BD6',
                    inicio: initialData?.inicio || '',
                    fin: initialData?.fin || '',
                    allDay: false,
                    usuarios: initialData?.usuarios || []
                });
            }
        }
    }, [isOpen, eventoId, clienteId, isContacto, initialData]);

    const fetchUsuarios = async () => {
        const set = new Set();

        try {
            const { data: usrs } = await supabase.from('usuarios').select('nombre, email');
            if (usrs) usrs.forEach(u => {
                const label = (u.nombre || u.email || "").toString().trim();
                if (label) set.add(label);
            });

            const { data: cls } = await supabase.from('clientes').select('responsable').not('responsable', 'is', null);
            if (cls) cls.forEach(c => {
                const v = (c.responsable || "").toString().trim();
                if (v) set.add(v);
            });

            const mysession = await supabase.auth.getSession();
            if (mysession.data?.session?.user) {
                const n = mysession.data.session.user.user_metadata?.nombre || mysession.data.session.user.email?.split('@')[0];
                if (n) set.add(n);
            }

            setUsuariosList(Array.from(set).sort((a, b) => a.localeCompare(b)));
        } catch (e) {
            console.error(e);
        }
    };

    const fetchHistorialContacto = async (cId) => {
        setHistorialContacto("Cargando historial...");
        const { data, error } = await supabase.from("actividades").select("fecha, descripcion, usuario").eq("cliente_id", cId).order("fecha", { ascending: false }).limit(30);

        if (error) {
            setHistorialContacto("No se pudo cargar el historial.");
            return;
        }

        if (!data || data.length === 0) {
            setHistorialContacto("No hay actividades registradas.");
            return;
        }

        const lines = data.map(a => {
            const f = a.fecha ? new Date(a.fecha) : null;
            const fechaTxt = f && !Number.isNaN(f.getTime()) ? f.toLocaleString("es-AR") : "(sin fecha)";
            const userTxt = a.usuario ? ` · ${a.usuario}` : "";
            return `• ${fechaTxt}${userTxt}\n  ${a.descripcion || ""}`.trimEnd();
        });
        setHistorialContacto(lines.join("\n\n"));
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;

        if (name === 'tipo') {
            const newColor = EVENT_COLORS[value];
            setFormData(prev => ({ ...prev, [name]: value, color: newColor || prev.color }));
        } else if (type === 'checkbox' && name !== 'allDay') {
            // Checkbox group for users
            const updatedUsers = checked
                ? [...formData.usuarios, value]
                : formData.usuarios.filter(u => u !== value);
            setFormData(prev => ({ ...prev, usuarios: updatedUsers }));
        } else {
            setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
        }
    };

    const handleSelectAllUsers = () => {
        setFormData(prev => ({ ...prev, usuarios: [...usuariosList] }));
    };

    const handleClearAllUsers = () => {
        setFormData(prev => ({ ...prev, usuarios: [] }));
    };

    const setEventUsers = async (evId, users) => {
        const { error: delErr } = await supabase.from("eventos_usuarios").delete().eq("evento_id", evId);
        if (delErr) throw delErr;

        if (users && users.length > 0) {
            const payload = users.map(u => ({ evento_id: evId, usuario: u }));
            const { error: insErr } = await supabase.from("eventos_usuarios").insert(payload);
            if (insErr) throw insErr;
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.inicio) return toast.error("Completá inicio.");

        setLoading(true);

        const inicioIso = new Date(formData.inicio).toISOString();
        const finIso = formData.fin ? new Date(formData.fin).toISOString() : null;

        try {
            if (isContacto) {
                // Solo mueve fecha/hora en clientes
                const dateOnly = inicioIso.split("T")[0];
                const timeOnly = `${String(new Date(formData.inicio).getHours()).padStart(2, "0")}:${String(new Date(formData.inicio).getMinutes()).padStart(2, "0")}:00`;

                const { error } = await supabase.from("clientes").update({
                    fecha_proximo_contacto: dateOnly,
                    hora_proximo_contacto: timeOnly
                }).eq('id', clienteId);

                if (error) throw error;
                toast.success('Contacto actualizado');
            } else {
                if (!formData.titulo) {
                    setLoading(false);
                    return toast.error("Completá el título.");
                }

                const payload = {
                    titulo: formData.titulo.trim(),
                    descripcion: formData.descripcion.trim() || null,
                    tipo: formData.tipo,
                    all_day: formData.allDay,
                    fecha_inicio: inicioIso,
                    fecha_fin: finIso,
                    color: formData.color.trim() || null
                };

                let savedEventId = eventoId;
                if (eventoId) {
                    const { error } = await supabase.from("eventos").update(payload).eq("id", eventoId);
                    if (error) throw error;
                } else {
                    const { data, error } = await supabase.from("eventos").insert(payload).select("id").single();
                    if (error) throw error;
                    savedEventId = data.id;
                }

                await setEventUsers(savedEventId, formData.usuarios);
                toast.success(eventoId ? 'Evento actualizado' : 'Evento creado');
            }

            onSaved();
            onClose();
        } catch (error) {
            console.error(error);
            toast.error("Error al guardar: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!eventoId || isContacto) return;
        if (!window.confirm("¿Eliminar este evento?")) return;

        setLoading(true);
        const { error } = await supabase.from("eventos").delete().eq("id", eventoId);
        if (error) {
            toast.error("No se pudo eliminar: " + error.message);
        } else {
            toast.success("Evento eliminado");
            onSaved();
            onClose();
        }
        setLoading(false);
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="modal is-open">
            <div className="modal-content" style={{ maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0 }}>{isContacto ? 'Editar Contacto' : (eventoId ? 'Editar Evento' : 'Nuevo Evento')}</h3>
                    <button className="modal-close" type="button" onClick={onClose}><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit}>
                    <label className="field">
                        <span className="field-label">Título</span>
                        <input name="titulo" type="text" className="input" value={formData.titulo} onChange={handleChange} required={!isContacto} disabled={isContacto} />
                    </label>

                    <label className="field">
                        <span className="field-label">{isContacto ? 'Historial del cliente (últimas actividades)' : 'Descripción'}</span>
                        <textarea name="descripcion" className="input" rows="8" value={isContacto ? historialContacto : formData.descripcion} onChange={handleChange} disabled={isContacto}></textarea>
                    </label>

                    {!isContacto && (
                        <div className="form-row-2">
                            <label className="field">
                                <span className="field-label">Tipo</span>
                                <select name="tipo" className="input" value={formData.tipo} onChange={handleChange}>
                                    <option value="interno">General</option>
                                    <option value="reunion">Reunión Prensencial</option>
                                    <option value="virtual">Reunión Virtual</option>
                                    <option value="contacto">Contacto / Visita</option>
                                    <option value="empresa">Evento Empresa</option>
                                    <option value="activacion">Activación</option>
                                    <option value="capacitacion">Capacitación</option>
                                    <option value="feriado">Feriado</option>
                                </select>
                            </label>

                            <label className="field">
                                <span class="field-label">Color</span>
                                <input name="color" type="color" className="input" value={formData.color} onChange={handleChange} style={{ padding: '0 4px', height: '42px' }} />
                            </label>
                        </div>
                    )}

                    {!isContacto && (
                        <div className="field">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <span className="field-label" style={{ margin: 0 }}>Usuarios que lo ven</span>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button type="button" onClick={handleSelectAllUsers} style={{ fontSize: '0.8rem', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-elevated)', cursor: 'pointer', color: 'var(--text)' }}>Seleccionar todos</button>
                                    <button type="button" onClick={handleClearAllUsers} style={{ fontSize: '0.8rem', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-elevated)', cursor: 'pointer', color: 'var(--text)' }}>Limpiar</button>
                                </div>
                            </div>
                            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', maxHeight: '150px', overflowY: 'auto', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                {usuariosList.map(u => (
                                    <label key={u} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', cursor: 'pointer' }}>
                                        <input type="checkbox" name="usuarios" value={u} checked={formData.usuarios.includes(u)} onChange={handleChange} />
                                        <span>{u}</span>
                                    </label>
                                ))}
                            </div>
                            <small className="muted" style={{ fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>Tip: si no seleccionás ninguno, el evento queda "general" (visible solo si filtrás en "Todos").</small>
                        </div>
                    )}

                    <div className="form-row-2" style={{ marginTop: '16px' }}>
                        <label className="field">
                            <span className="field-label">Inicio</span>
                            <input name="inicio" type="datetime-local" className="input" value={formData.inicio} onChange={handleChange} required />
                        </label>

                        <label className="field">
                            <span className="field-label">Fin</span>
                            <input name="fin" type="datetime-local" className="input" value={formData.fin} onChange={handleChange} />
                        </label>
                    </div>

                    {!isContacto && (
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px', cursor: 'pointer' }}>
                            <input name="allDay" type="checkbox" checked={formData.allDay} onChange={handleChange} />
                            <span>Todo el día</span>
                        </label>
                    )}

                    <div className="modal-actions" style={{ marginTop: '24px' }}>
                        {!isContacto && eventoId && (
                            <button type="button" onClick={handleDelete} disabled={loading} style={{ padding: '8px 16px', background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}>
                                Eliminar
                            </button>
                        )}
                        <div style={{ flex: 1 }}></div>
                        <Button variant="secondary" type="button" onClick={onClose} disabled={loading}>Cancelar</Button>
                        <Button variant="primary" type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</Button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
