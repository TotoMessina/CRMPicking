import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../lib/supabase';
import { Button } from './Button';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';

const formatToLocalDateString = (dateVal) => {
    if (!dateVal) return '';
    if (typeof dateVal === 'string' && dateVal.length === 10) {
        return dateVal;
    }
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const formatToLocalDatetime = (dateVal, defaultTime = '09:00') => {
    if (!dateVal) return '';
    if (typeof dateVal === 'string' && dateVal.length === 10) {
        return `${dateVal}T${defaultTime}`;
    }
    if (typeof dateVal === 'string' && dateVal.length === 16 && !dateVal.endsWith('Z') && !dateVal.includes('+')) {
        return dateVal;
    }
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export function TurnoModal({ isOpen, onClose, turnoId, usersCache, initialData, onSaved, empresaActiva }) {
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        usuario_email: '',
        tipo: 'jornada',
        inicio: '',
        fin: '',
        notas: ''
    });

    useEffect(() => {
        if (isOpen) {
            const initialTipo = initialData?.tipo || 'jornada';
            const startVal = initialData?.inicio || initialData?.start_time;
            const endVal = initialData?.fin || initialData?.end_time;

            let inicioFormatted = formatToLocalDatetime(startVal, initialTipo === 'estudio' ? '00:00' : '09:00');
            let finFormatted = formatToLocalDatetime(endVal, initialTipo === 'estudio' ? '23:59' : '17:00');

            if (initialTipo === 'estudio' && startVal) {
                const dateStr = formatToLocalDateString(startVal);
                inicioFormatted = `${dateStr}T00:00`;
                finFormatted = `${dateStr}T23:59`;
            }

            setFormData({
                usuario_email: initialData?.usuario_email || '',
                tipo: initialTipo,
                inicio: inicioFormatted,
                fin: finFormatted,
                notas: initialData?.notas || ''
            });
        }
    }, [isOpen, initialData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const updated = { ...prev, [name]: value };
            if (name === 'tipo' && value === 'estudio') {
                const currentDateStr = prev.inicio ? prev.inicio.substring(0, 10) : formatToLocalDateString(new Date());
                updated.inicio = `${currentDateStr}T00:00`;
                updated.fin = `${currentDateStr}T23:59`;
            }
            return updated;
        });
    };

    const checkOverlap = async (email, startIso, endIso, excludeId = null) => {
        let query = supabase.from("turnos")
            .select("id")
            .eq("usuario_email", email)
            .neq("tipo", "estudio") // Exclude study days from overlap checks
            .lt("start_time", endIso)
            .gt("end_time", startIso);

        if (excludeId) query = query.neq("id", excludeId);

        const { data, error } = await query;
        if (error) {
            console.error("Overlap check error", error);
            return false;
        }
        return data && data.length > 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const startIso = new Date(formData.inicio).toISOString();
        const endIso = new Date(formData.fin).toISOString();

        if (new Date(endIso) <= new Date(startIso)) {
            return toast.error("La fecha de fin debe ser posterior a la de inicio.");
        }

        setLoading(true);

        const isOverlap = formData.tipo !== 'estudio' && await checkOverlap(formData.usuario_email, startIso, endIso, turnoId);
        if (isOverlap) {
            setLoading(false);
            return toast.error("⚠️ El horario se superpone con otro turno existente para este usuario.");
        }

        const payload = {
            usuario_email: formData.usuario_email,
            tipo: formData.tipo,
            start_time: startIso,
            end_time: endIso,
            notas: formData.notas,
            empresa_id: empresaActiva?.id
        };

        try {
            if (turnoId) {
                const { error } = await supabase.from("turnos").update(payload).eq("id", turnoId);
                if (error) throw error;
                toast.success("Turno actualizado");
            } else {
                const mysession = await supabase.auth.getSession();
                payload.creado_por = mysession.data?.session?.user?.user_metadata?.nombre || "System";

                const { error } = await supabase.from("turnos").insert(payload);
                if (error) throw error;
                toast.success("Turno creado");
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
        if (!turnoId) return;
        if (!window.confirm("¿Eliminar este turno?")) return;

        setLoading(true);
        const { error } = await supabase.from("turnos").delete().eq("id", turnoId);
        if (error) {
            toast.error("No se pudo eliminar: " + error.message);
        } else {
            toast.success("Turno eliminado");
            onSaved();
            onClose();
        }
        setLoading(false);
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="modal is-open" onClick={onClose}>
            <div className="modal-content" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0 }}>{turnoId ? 'Editar Turno' : 'Cargar Turno'}</h3>
                    <button className="modal-close" type="button" onClick={onClose}><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit}>
                    <label className="field">
                        <span className="field-label">Empleado / Usuario</span>
                        <select name="usuario_email" className="input" value={formData.usuario_email} onChange={handleChange} required>
                            <option value="">Seleccionar...</option>
                            {usersCache.map(u => (
                                <option key={u.email} value={u.email}>{u.nombre || u.email} ({u.role || 'User'})</option>
                            ))}
                        </select>
                    </label>

                    <label className="field">
                        <span className="field-label">Tipo de Registro</span>
                        <select name="tipo" className="input" value={formData.tipo} onChange={handleChange} required>
                            <option value="jornada">Jornada Laboral</option>
                            <option value="extra">Horas Extra</option>
                            <option value="vacaciones">Vacaciones / Ausencia</option>
                            <option value="estudio">Día de Estudio</option>
                        </select>
                    </label>

                    <div className="form-row-2">
                        <label className="field">
                            <span className="field-label">Inicio</span>
                            {formData.tipo === 'estudio' ? (
                                <input
                                    name="inicio"
                                    type="date"
                                    className="input"
                                    value={formData.inicio ? formData.inicio.substring(0, 10) : ''}
                                    onChange={(e) => {
                                        const dateStr = e.target.value;
                                        setFormData(prev => ({
                                            ...prev,
                                            inicio: dateStr ? `${dateStr}T00:00` : '',
                                            fin: dateStr ? `${dateStr}T23:59` : ''
                                        }));
                                    }}
                                    required
                                />
                            ) : (
                                <input name="inicio" type="datetime-local" className="input" value={formData.inicio} onChange={handleChange} required />
                            )}
                        </label>

                        {formData.tipo !== 'estudio' && (
                            <label className="field">
                                <span className="field-label">Fin</span>
                                <input name="fin" type="datetime-local" className="input" value={formData.fin} onChange={handleChange} required />
                            </label>
                        )}
                    </div>

                    <label className="field">
                        <span className="field-label">Notas</span>
                        <textarea name="notas" className="input" rows="3" placeholder="Detalles opcionales..." value={formData.notas} onChange={handleChange}></textarea>
                    </label>

                    <div className="modal-actions" style={{ marginTop: '24px' }}>
                        {turnoId && (
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
