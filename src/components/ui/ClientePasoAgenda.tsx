import React from 'react';

interface Props {
    formData: any;
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
    setFormData: React.Dispatch<React.SetStateAction<any>>;
}

export const ClientePasoAgenda: React.FC<Props> = ({ formData, handleChange, setFormData }) => {
    return (
        <div>
            <h3 style={{ marginBottom: '16px' }}>3. Agenda y Notas</h3>
            <div className="grid" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="field">
                    <label>Próxima Visita</label>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input type="date" name="fecha_proximo_contacto" value={formData.fecha_proximo_contacto || ''} onChange={handleChange} style={{ flex: 1 }} />
                        {formData.fecha_proximo_contacto && (
                            <button type="button"
                                onClick={() => setFormData((prev: any) => ({ ...prev, fecha_proximo_contacto: '' }))}
                                style={{ padding: '8px 14px', borderRadius: '8px', background: 'rgba(239,68,68,0.08)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.3)', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                            >✕ Sin fecha</button>
                        )}
                    </div>
                </div>
                <div className="field">
                    <label>Notas</label>
                    <textarea name="notas" rows={3} value={formData.notas || ''} onChange={handleChange}></textarea>
                </div>
            </div>
        </div>
    );
};
