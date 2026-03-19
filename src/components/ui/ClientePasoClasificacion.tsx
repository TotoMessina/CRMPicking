import React, { useState, useEffect } from 'react';
import { FieldError } from './FieldError';
import { supabase } from '../../lib/supabase';

interface Props {
    formData: any;
    errors: Record<string, string>;
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
    setFormData: React.Dispatch<React.SetStateAction<any>>;
}

const ERR_STYLE = { borderColor: '#ef4444', boxShadow: '0 0 0 2px rgba(239,68,68,0.18)' };

export const ClientePasoClasificacion: React.FC<Props> = ({ formData, errors, handleChange, setFormData }) => {
    const inp = (name: string, extra = {}) => ({
        name,
        value: formData[name] || '',
        onChange: handleChange,
        style: errors[name] ? ERR_STYLE : {},
        ...extra,
    });

    const [rubrosList, setRubrosList] = useState<string[]>([]);

    useEffect(() => {
        let isMounted = true;
        const fetchRubros = async () => {
            const { data } = await (supabase as any).from('rubros').select('nombre').order('nombre');
            if (isMounted && data) {
                setRubrosList(data.map((r: any) => r.nombre));
            }
        };
        fetchRubros();
        return () => { isMounted = false; };
    }, []);

    const isEstadoFinal = formData.estado?.startsWith('4') || formData.estado?.startsWith('5');

    return (
        <div>
            <h3 style={{ marginBottom: '16px' }}>2. Clasificación del Cliente</h3>
            <div className="grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="field">
                    <label>Rubro *</label>
                    <select {...inp('rubro')}>
                        <option value="">Seleccionar rubro...</option>
                        {rubrosList.map(r => (
                            <option key={r} value={r}>{r}</option>
                        ))}
                    </select>
                    <FieldError msg={errors.rubro} />
                </div>
                <div className="field">
                    <label>Estado</label>
                    <select name="estado" value={formData.estado || ''} onChange={handleChange}>
                        <option value="1 - Cliente relevado">1 - Cliente relevado</option>
                        <option value="2 - Local Visitado No Activo">2 - Local Visitado No Activo</option>
                        <option value="3 - Primer Ingreso">3 - Primer Ingreso</option>
                        <option value="4 - Local Creado">4 - Local Creado</option>
                        <option value="5 - Local Visitado Activo">5 - Local Visitado Activo</option>
                        <option value="6 - Local No Interesado">6 - Local No Interesado</option>
                    </select>
                </div>

                <div className="field" style={{ gridColumn: '1 / -1' }}>
                    <label>Interés</label>
                    {(() => {
                        const levels = [
                            { value: 'Bajo', color: '#94a3b8', label: 'Bajo' },
                            { value: 'Medio', color: '#f59e0b', label: 'Medio' },
                            { value: 'Alto', color: '#10b981', label: 'Alto' },
                        ];
                        const activeIdx = levels.findIndex(l => l.value === (formData.interes || 'Bajo'));
                        const activeColor = levels[activeIdx]?.color || '#94a3b8';
                        return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <div style={{ display: 'flex', gap: '4px', height: '10px' }}>
                                    {levels.map((l, i) => (
                                        <div key={l.value} onClick={() => setFormData((prev: any) => ({ ...prev, interes: l.value }))}
                                            style={{ flex: 1, borderRadius: '99px', cursor: 'pointer', background: i <= activeIdx ? activeColor : 'var(--border)', transition: 'background 0.25s ease', opacity: i <= activeIdx ? 1 : 0.4 }} />
                                    ))}
                                </div>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                    {levels.map((l, i) => (
                                        <button key={l.value} type="button" onClick={() => setFormData((prev: any) => ({ ...prev, interes: l.value }))}
                                            style={{ flex: 1, padding: '6px 4px', fontSize: '0.78rem', fontWeight: 600, borderRadius: '8px', cursor: 'pointer', border: '1px solid', background: i <= activeIdx ? `${activeColor}18` : 'var(--bg)', color: i <= activeIdx ? activeColor : 'var(--text-muted)', borderColor: i <= activeIdx ? `${activeColor}60` : 'var(--border)', transition: 'all 0.2s ease' }}>
                                            {l.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        );
                    })()}
                </div>

                <div className="field" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label>¿Venta Digital?</label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.95rem', cursor: 'pointer', fontWeight: 500 }}>
                        <input type="checkbox" name="venta_digital" checked={formData.venta_digital === 'true'} onChange={handleChange}
                            style={{ width: '18px', height: '18px', accentColor: 'var(--accent)', cursor: 'pointer' }} />
                        {formData.venta_digital === 'true' ? 'Sí, tiene venta digital' : 'No tiene venta digital'}
                    </label>
                    {formData.venta_digital === 'true' && (
                        <input type="text" name="venta_digital_cual" placeholder="¿Cuál? Ej: Pedidos Ya, Rappi..." value={formData.venta_digital_cual || ''} onChange={handleChange} style={{ marginTop: '4px' }} />
                    )}
                </div>
            </div>

            {isEstadoFinal && (
                <div className="grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', marginTop: '16px' }}>
                    <div className="field">
                        <label>Situación *</label>
                        <select name="situacion" value={formData.situacion || 'sin comunicacion nueva'} onChange={handleChange}>
                            <option value="sin comunicacion nueva">Sin comunicación nueva</option>
                            <option value="en proceso">En proceso</option>
                            <option value="en funcionamiento">En funcionamiento</option>
                        </select>
                    </div>
                </div>
            )}
        </div>
    );
};
