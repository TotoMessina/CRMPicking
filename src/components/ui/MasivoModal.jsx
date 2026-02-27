import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../lib/supabase';
import { Button } from './Button';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';

export function MasivoModal({ isOpen, onClose, usersCache, initialUsuario, onSaved }) {
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        usuario_email: '',
        desde: '',
        hasta: '',
        dias: [1, 2, 3, 4, 5], // default Mon-Fri
        horaInicio: '09:00',
        horaFin: '17:00',
        tipo: 'jornada',
        notas: ''
    });

    useEffect(() => {
        if (isOpen) {
            const today = new Date();
            const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

            const pad = (n) => String(n).padStart(2, '0');
            const formatD = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

            setFormData(prev => ({
                ...prev,
                usuario_email: initialUsuario || '',
                desde: formatD(today),
                hasta: formatD(lastDay),
                dias: [1, 2, 3, 4, 5],
                horaInicio: '09:00',
                horaFin: '17:00',
                tipo: 'jornada',
                notas: ''
            }));
        }
    }, [isOpen, initialUsuario]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;

        if (type === 'checkbox' && name === 'dias') {
            const valNum = parseInt(value);
            const newDias = checked
                ? [...formData.dias, valNum]
                : formData.dias.filter(d => d !== valNum);
            setFormData(prev => ({ ...prev, dias: newDias }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const checkCollision = (start, end, list) => {
        return list.some(t => {
            const tStart = new Date(t.start_time);
            const tEnd = new Date(t.end_time);
            return (start < tEnd && end > tStart);
        });
    };

    const dateOnlyISO = (d) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.desde || !formData.hasta || formData.dias.length === 0) {
            return toast.error("Por favor completa las fechas y selecciona al menos un día.");
        }

        setLoading(true);

        try {
            const currentStartIso = new Date(formData.desde).toISOString();
            const endObj = new Date(formData.hasta);
            endObj.setDate(endObj.getDate() + 1);
            const currentEndIso = endObj.toISOString();

            const { data: existingTurnos, error: fetchErr } = await supabase
                .from("turnos")
                .select("start_time, end_time")
                .eq("usuario_email", formData.usuario_email)
                .lt("start_time", currentEndIso)
                .gt("end_time", currentStartIso);

            if (fetchErr) throw fetchErr;

            const payloadBatch = [];
            const currentDate = new Date(formData.desde + "T00:00:00");
            const finalDate = new Date(formData.hasta + "T00:00:00");

            let skippedCount = 0;
            const mysession = await supabase.auth.getSession();
            const creatorName = mysession.data?.session?.user?.user_metadata?.nombre || "Masivo";

            while (currentDate <= finalDate) {
                const dayOfWeek = currentDate.getDay();

                if (formData.dias.includes(dayOfWeek)) {
                    const dateStr = dateOnlyISO(currentDate);
                    const isoStart = `${dateStr}T${formData.horaInicio}:00`;
                    let isoEnd = `${dateStr}T${formData.horaFin}:00`;

                    if (formData.horaFin < formData.horaInicio) {
                        const nextDay = new Date(currentDate);
                        nextDay.setDate(nextDay.getDate() + 1);
                        isoEnd = `${dateOnlyISO(nextDay)}T${formData.horaFin}:00`;
                    }

                    const objStart = new Date(isoStart);
                    const objEnd = new Date(isoEnd);

                    if (checkCollision(objStart, objEnd, existingTurnos) || checkCollision(objStart, objEnd, payloadBatch)) {
                        skippedCount++;
                    } else {
                        payloadBatch.push({
                            usuario_email: formData.usuario_email,
                            tipo: formData.tipo,
                            start_time: objStart.toISOString(),
                            end_time: objEnd.toISOString(),
                            notas: formData.notas ? `${formData.notas} (Masivo)` : '(Masivo)',
                            creado_por: creatorName
                        });
                    }
                }
                currentDate.setDate(currentDate.getDate() + 1);
            }

            if (payloadBatch.length === 0) {
                setLoading(false);
                if (skippedCount > 0) {
                    return toast.error(`No se generaron turnos porque todos estarían superpuestos (${skippedCount} omitidos).`);
                } else {
                    return toast.error("No se generaron turnos. Verifica el rango y los días seleccionados.");
                }
            }

            let msg = `¿Generar ${payloadBatch.length} turnos para ${formData.usuario_email}?`;
            if (skippedCount > 0) msg += `\n(Se omitirán ${skippedCount} por superposición)`;

            if (!window.confirm(msg)) {
                setLoading(false);
                return;
            }

            const { error: insError } = await supabase.from("turnos").insert(payloadBatch);
            if (insError) throw insError;

            toast.success(`¡Éxito! Se crearon ${payloadBatch.length} turnos.`);
            onSaved();
            onClose();

        } catch (error) {
            console.error(error);
            toast.error("Error al generar: " + error.message);
        } finally {
            setLoading(false);
        }
    };


    if (!isOpen) return null;

    return createPortal(
        <div className="modal is-open">
            <div className="modal-content" style={{ maxWidth: '500px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0 }}>⚡ Carga Masiva de Horarios</h3>
                    <button className="modal-close" type="button" onClick={onClose}><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit}>
                    <p className="muted" style={{ marginBottom: '16px', fontSize: '0.9rem' }}>Genera múltiples turnos repetitivos en un rango de fechas.</p>

                    <label className="field">
                        <span className="field-label">Empleado</span>
                        <select name="usuario_email" className="input" value={formData.usuario_email} onChange={handleChange} required>
                            <option value="">Seleccionar...</option>
                            {usersCache.map(u => (
                                <option key={u.email} value={u.email}>{u.nombre || u.email}</option>
                            ))}
                        </select>
                    </label>

                    <div className="form-row-2">
                        <label className="field">
                            <span className="field-label">Desde Fecha</span>
                            <input name="desde" type="date" className="input" value={formData.desde} onChange={handleChange} required />
                        </label>
                        <label className="field">
                            <span className="field-label">Hasta Fecha</span>
                            <input name="hasta" type="date" className="input" value={formData.hasta} onChange={handleChange} required />
                        </label>
                    </div>

                    <div className="field">
                        <span className="field-label">Días de la semana</span>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '4px', background: 'var(--bg-elevated)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                            {[
                                { val: 1, label: 'Lun' }, { val: 2, label: 'Mar' }, { val: 3, label: 'Mié' },
                                { val: 4, label: 'Jue' }, { val: 5, label: 'Vie' }, { val: 6, label: 'Sáb' }, { val: 0, label: 'Dom' }
                            ].map(d => (
                                <label key={d.val} style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.9rem' }}>
                                    <input type="checkbox" name="dias" value={d.val} checked={formData.dias.includes(d.val)} onChange={handleChange} />
                                    {d.label}
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="form-row-2">
                        <label className="field">
                            <span className="field-label">Hora Inicio</span>
                            <input name="horaInicio" type="time" className="input" value={formData.horaInicio} onChange={handleChange} required />
                        </label>
                        <label className="field">
                            <span className="field-label">Hora Fin</span>
                            <input name="horaFin" type="time" className="input" value={formData.horaFin} onChange={handleChange} required />
                        </label>
                    </div>

                    <label className="field">
                        <span className="field-label">Tipo</span>
                        <select name="tipo" className="input" value={formData.tipo} onChange={handleChange}>
                            <option value="jornada">Jornada Laboral</option>
                            <option value="extra">Horas Extra</option>
                            <option value="vacaciones">Vacaciones / Ausencia</option>
                            <option value="estudio">Día de Estudio</option>
                        </select>
                    </label>

                    <label className="field">
                        <span className="field-label">Notas (para todos)</span>
                        <input name="notas" type="text" className="input" value={formData.notas} onChange={handleChange} />
                    </label>

                    <div className="modal-actions" style={{ marginTop: '24px' }}>
                        <Button variant="secondary" type="button" onClick={onClose} disabled={loading}>Cancelar</Button>
                        <Button variant="primary" type="submit" disabled={loading}>{loading ? 'Generando...' : 'Generar Turnos'}</Button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
