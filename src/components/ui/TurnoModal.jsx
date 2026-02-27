import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../lib/supabase';
import { Button } from './Button';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';

export function TurnoModal({ isOpen, onClose, turnoId, usersCache, initialData, onSaved }) {
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
            setFormData({
                usuario_email: initialData?.usuario_email || '',
                tipo: initialData?.tipo || 'jornada',
                inicio: initialData?.inicio || '',
                fin: initialData?.fin || '',
                notas: initialData?.notas || ''
            });
        }
    }, [isOpen, initialData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const checkOverlap = async (email, startIso, endIso, excludeId = null) => {
        let query = supabase.from("turnos")
            .select("id")
            .eq("usuario_email", email)
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

        const isOverlap = await checkOverlap(formData.usuario_email, startIso, endIso, turnoId);
        if (isOverlap) {
            setLoading(false);
            return toast.error("⚠️ El horario se superpone con otro turno existente para este usuario.");
        }

        const payload = {
            usuario_email: formData.usuario_email,
            tipo: formData.tipo,
            start_time: formData.inicio, // store original timezone string if needed, or ISO? original used input.value
            end_time: formData.fin,
            notas: formData.notas
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
        <div className="modal is-open">
            <div className="modal-content" style={{ maxWidth: '500px' }}>
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
                            <input name="inicio" type="datetime-local" className="input" value={formData.inicio} onChange={handleChange} required />
                        </label>

                        <label className="field">
                            <span className="field-label">Fin</span>
                            <input name="fin" type="datetime-local" className="input" value={formData.fin} onChange={handleChange} required />
                        </label>
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
