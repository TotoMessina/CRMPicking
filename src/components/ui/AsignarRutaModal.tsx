import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from './Button';
import { useCompanyUsersDetailed } from '../../hooks/useCompanyUsers';
import toast from 'react-hot-toast';
import { X, Calendar, User, Loader2 } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    clienteId: string | null;
    clienteNombre: string | null;
    onSaved?: () => void;
}

export const AsignarRutaModal: React.FC<Props> = ({ isOpen, onClose, clienteId, clienteNombre, onSaved }) => {
    const { empresaActiva } = useAuth();
    const { data: usuarios = [], isLoading: loadingUsers } = useCompanyUsersDetailed(empresaActiva?.id);
    
    const [selectedUser, setSelectedUser] = useState('');
    const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [isSaving, setIsSaving] = useState(false);

    if (!isOpen) return null;

    const handleSave = async () => {
        if (!clienteId || !selectedUser || !selectedDate || !empresaActiva?.id) {
            toast.error("Por favor completa todos los campos");
            return;
        }

        setIsSaving(true);
        try {
            // 1. Obtener el último orden para ese usuario y fecha
            const { data: existingVisitas, error: fetchError } = await supabase
                .from('visitas_diarias')
                .select('orden')
                .eq('empresa_id', empresaActiva.id)
                .eq('usuario_asignado_email', selectedUser)
                .eq('fecha_asignada', selectedDate)
                .order('orden', { ascending: false })
                .limit(1);

            if (fetchError) throw fetchError;

            const nextOrder = existingVisitas && existingVisitas.length > 0 ? existingVisitas[0].orden + 1 : 0;

            // 2. Insertar la nueva visita
            const { error: insertError } = await supabase
                .from('visitas_diarias')
                .insert([{
                    empresa_id: empresaActiva.id,
                    cliente_id: clienteId,
                    usuario_asignado_email: selectedUser,
                    fecha_asignada: selectedDate,
                    estado: 'Pendiente',
                    orden: nextOrder
                }]);

            if (insertError) throw insertError;

            toast.success(`Asignado a la ruta de ${usuarios.find(u => u.email === selectedUser)?.nombre}`);
            if (onSaved) onSaved();
            onClose();
        } catch (error: any) {
            console.error("Error al asignar ruta:", error);
            toast.error("Error al asignar la ruta");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className={`modal ${isOpen ? 'is-open' : ''}`} onClick={onClose}>
            <div className="modal-content" style={{ maxWidth: '440px' }} onClick={e => e.stopPropagation()}>
                <header className="modal-header">
                    <div>
                        <h3>Asignar a Ruta</h3>
                        <p className="muted" style={{ margin: '4px 0 0 0', fontSize: '0.9rem' }}>{clienteNombre}</p>
                    </div>
                    <button onClick={onClose} className="modal-close">
                        <X size={20} />
                    </button>
                </header>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            <User size={12} style={{ marginRight: '4px' }} /> Seleccionar Usuario
                        </label>
                        <select 
                            className="input" 
                            disabled={loadingUsers}
                            value={selectedUser}
                            onChange={e => setSelectedUser(e.target.value)}
                            style={{ padding: '12px', borderRadius: '12px', background: 'var(--bg-input)' }}
                        >
                            <option value="">— Elegir un vendedor/activador —</option>
                            {usuarios.map(u => (
                                <option key={u.email} value={u.email}>{u.nombre}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            <Calendar size={12} style={{ marginRight: '4px' }} /> Seleccionar Fecha
                        </label>
                        <input 
                            type="date"
                            className="input"
                            value={selectedDate}
                            onChange={e => setSelectedDate(e.target.value)}
                            style={{ padding: '12px', borderRadius: '12px', background: 'var(--bg-input)' }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                        <Button variant="secondary" onClick={onClose} style={{ flex: 1 }}>Cancelar</Button>
                        <Button 
                            variant="primary" 
                            disabled={isSaving || !selectedUser} 
                            onClick={handleSave} 
                            style={{ flex: 1 }}
                        >
                            {isSaving ? <Loader2 className="animate-spin" size={18} /> : "Asignar Visita"}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
