import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from './Button';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';

export function SprintModal({ isOpen, onClose, sprintId, onSaved }) {
    const { empresaActiva } = useAuth();
    const [loading, setLoading] = useState(false);
    const [nombre, setNombre] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (sprintId) {
                loadSprint(sprintId);
            } else {
                setNombre('');
            }
        }
    }, [isOpen, sprintId]);

    const loadSprint = async (id) => {
        setLoading(true);
        const { data, error } = await supabase
            .from('proveedor_sprints')
            .select('nombre')
            .eq('id', id)
            .single();
        
        if (!error && data) {
            setNombre(data.nombre);
        }
        setLoading(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!nombre.trim()) return toast.error("El nombre es obligatorio");
        if (!empresaActiva?.id) return;

        setLoading(true);

        if (sprintId) {
            // Update
            const { error } = await supabase
                .from('proveedor_sprints')
                .update({ nombre: nombre.trim() })
                .eq('id', sprintId);

            if (error) toast.error(error.message);
            else {
                toast.success('Sprint actualizado');
                onSaved();
            }
        } else {
            // Create
            // Get max order
            const { data: maxData } = await supabase
                .from('proveedor_sprints')
                .select('orden')
                .eq('empresa_id', empresaActiva.id)
                .order('orden', { ascending: false })
                .limit(1);
            
            const nextOrder = (maxData?.[0]?.orden ?? -1) + 1;

            const { error } = await supabase
                .from('proveedor_sprints')
                .insert([{
                    empresa_id: empresaActiva.id,
                    nombre: nombre.trim(),
                    orden: nextOrder
                }]);

            if (error) toast.error(error.message);
            else {
                toast.success('Sprint creado');
                onSaved();
            }
        }
        setLoading(false);
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="modal is-open">
            <div className="modal-content" style={{ maxWidth: '450px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0 }}>{sprintId ? 'Editar Sprint' : 'Nuevo Sprint'}</h3>
                    <button className="modal-close" type="button" onClick={onClose}><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div className="field">
                        <label className="field-label">Nombre del Sprint / Fase</label>
                        <input 
                            className="input" 
                            placeholder="Ej: Sprint 1 - Core Features" 
                            value={nombre} 
                            onChange={(e) => setNombre(e.target.value)}
                            autoFocus
                            required
                        />
                        <p className="muted" style={{ fontSize: '0.8rem', marginTop: '6px' }}>
                            Este nombre aparecerá como cabecera en tu Roadmap vertical.
                        </p>
                    </div>

                    <div className="modal-actions" style={{ marginTop: '10px' }}>
                        <Button variant="secondary" type="button" onClick={onClose}>Cancelar</Button>
                        <Button variant="primary" type="submit" disabled={loading}>
                            {loading ? 'Guardando...' : (sprintId ? 'Guardar Cambios' : 'Crear Sprint')}
                        </Button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
