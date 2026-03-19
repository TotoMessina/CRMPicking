import React from 'react';
import { createPortal } from 'react-dom';
import { Button } from './Button';
import { X } from 'lucide-react';

import { useGuardarCliente, STEP_FIELDS } from '../../hooks/useGuardarCliente';
import { ClientePasoDatosLocal } from './ClientePasoDatosLocal';
import { ClientePasoClasificacion } from './ClientePasoClasificacion';
import { ClientePasoAgenda } from './ClientePasoAgenda';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    clienteId: string | null;
    initialLocation?: { lat: number; lng: number } | null;
    onSaved: () => void;
}

export const ClienteModal: React.FC<Props> = ({ isOpen, onClose, clienteId, initialLocation, onSaved }) => {
    const {
        step, loading, errors, formData,
        handleChange, setFormData, handleStepChange, handleNextPhase, handleFormKeyDown, handleSubmit
    } = useGuardarCliente({ isOpen, onClose, clienteId, initialLocation, onSaved });

    if (!isOpen) return null;

    return createPortal(
        <div className="modal active" onClick={(e) => (e.target as HTMLElement).classList.contains('modal') && onClose()}>
            <div className="modal-content" style={{ maxWidth: '600px', width: '90%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h2 style={{ margin: 0 }}>{clienteId ? 'Editar Cliente' : 'Nuevo Cliente'}</h2>
                    <Button variant="secondary" onClick={onClose} style={{ padding: '8px' }}>
                        <X size={20} />
                    </Button>
                </div>

                <div className="wizard-steps" style={{ marginBottom: '24px' }}>
                    {[1, 2, 3].map(s => (
                        <div
                            key={s}
                            className={`step-indicator ${step === s ? 'active' : ''} ${STEP_FIELDS[s]?.some((f: string) => errors[f]) ? 'error' : ''}`}
                            onClick={() => handleStepChange(s)}
                            style={{
                                cursor: 'pointer',
                                ...(STEP_FIELDS[s]?.some((f: string) => errors[f]) ? { background: '#ef4444', opacity: 1 } : {})
                            }}
                        />
                    ))}
                </div>

                <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown}>
                    {step === 1 && (
                        <ClientePasoDatosLocal formData={formData} errors={errors} handleChange={handleChange} />
                    )}

                    {step === 2 && (
                        <ClientePasoClasificacion formData={formData} errors={errors} handleChange={handleChange} setFormData={setFormData} />
                    )}

                    {step === 3 && (
                        <ClientePasoAgenda formData={formData} handleChange={handleChange} setFormData={setFormData} />
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
                        <Button variant="secondary" type="button" onClick={() => handleStepChange(step > 1 ? step - 1 : 1)} style={{ visibility: step === 1 ? 'hidden' : 'visible' }}>
                            Anterior
                        </Button>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <Button variant="secondary" type="button" onClick={onClose}>Cancelar</Button>
                            {step < 3 ? (
                                <Button key="siguiente" variant="primary" type="button" onClick={handleNextPhase}>Siguiente</Button>
                            ) : (
                                <Button key="guardar" variant="primary" type="submit" disabled={loading}>
                                    {loading ? 'Guardando...' : 'Guardar Cliente'}
                                </Button>
                            )}
                        </div>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};
