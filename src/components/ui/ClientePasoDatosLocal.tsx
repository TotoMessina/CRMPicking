import React from 'react';
import { FieldError } from './FieldError';

interface Props {
    formData: any;
    errors: Record<string, string>;
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
}

const ERR_STYLE = { borderColor: '#ef4444', boxShadow: '0 0 0 2px rgba(239,68,68,0.18)' };

export const ClientePasoDatosLocal: React.FC<Props> = ({ formData, errors, handleChange }) => {
    const inp = (name: string, extra = {}) => ({
        name,
        value: formData[name] || '',
        onChange: handleChange,
        style: errors[name] ? ERR_STYLE : {},
        ...extra,
    });

    return (
        <div>
            <h3 style={{ marginBottom: '16px' }}>1. Datos del Local y Contacto</h3>
            <div className="grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="field">
                    <label>Nombre del Local *</label>
                    <input type="text" {...inp('nombre_local')} />
                    <FieldError msg={errors.nombre_local} />
                </div>
                <div className="field">
                    <label>Dirección *</label>
                    <input type="text" {...inp('direccion')} />
                    <FieldError msg={errors.direccion} />
                </div>
                <div className="field">
                    <label>Nombre del Contacto *</label>
                    <input type="text" {...inp('nombre')} />
                    <FieldError msg={errors.nombre} />
                </div>
                <div className="field">
                    <label>Teléfono *</label>
                    <input type="text" {...inp('telefono')} />
                    <FieldError msg={errors.telefono} />
                </div>
                <div className="field">
                    <label>Mail</label>
                    <input type="email" {...inp('mail')} />
                </div>
                <div className="field">
                    <label>CUIT</label>
                    <input type="text" {...inp('cuit', { placeholder: 'XX-XXXXXXXX-X' })} />
                </div>
                <div className="field">
                    <label>Horarios de Atención</label>
                    <input type="text" {...inp('horarios_atencion', { placeholder: 'Ej: Lun-Vie 9-18' })} />
                </div>
                <div className="field">
                    <label>Estilo de Contacto</label>
                    <select name="estilo_contacto" value={formData.estilo_contacto || 'Sin definir'} onChange={handleChange}>
                        <option value="Sin definir">Sin definir</option>
                        <option value="Dueño">Dueño</option>
                        <option value="Empleado">Empleado</option>
                        <option value="Cerrado">Cerrado</option>
                    </select>
                </div>
                <div className="field">
                    <label>Tipo de Contacto</label>
                    <select name="tipo_contacto" value={formData.tipo_contacto || 'Visita Presencial'} onChange={handleChange}>
                        <option value="Visita Presencial">Visita Presencial</option>
                        <option value="Llamada">Llamada</option>
                    </select>
                </div>
                <div className="field" style={{ gridColumn: '1 / -1' }}>
                    <label>Responsable</label>
                    <input
                        type="text"
                        name="responsable"
                        value={formData.responsable || ''}
                        onChange={handleChange}
                        placeholder="Nombre del responsable"
                        style={{ background: 'var(--bg-elevated)', fontWeight: 500 }}
                    />
                </div>
            </div>
        </div>
    );
};
