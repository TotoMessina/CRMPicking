import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Search, User, Calendar, RefreshCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { ClienteModal } from '../components/ui/ClienteModal';
import { Edit2 } from 'lucide-react';

const COLUMNS = [
    { id: '1 - Cliente relevado', label: 'Relevado', color: '#64748b' },
    { id: '2 - Local Visitado No Activo', label: 'Visitado (No Act)', color: '#ef4444' },
    { id: '3 - Primer Ingreso', label: 'Primer Ingreso', color: '#f59e0b' },
    { id: '4 - Local Creado', label: 'Creado', color: '#3b82f6' },
    { id: '5 - Local Visitado Activo', label: 'Visitado (Activo)', color: '#10b981' },
    { id: '6 - Local No Interesado', label: 'No Interesado', color: '#ef4444' }
];

export default function Pipeline() {
    const { user, userName, empresaActiva } = useAuth();
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const fetchPipeline = async () => {
        if (!empresaActiva?.id) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('empresa_cliente')
            .select('*, clientes(*)')
            .eq('empresa_id', empresaActiva.id)
            .eq('activo', true)
            .order('updated_at', { ascending: false });

        if (error) {
            toast.error('Error cargando pipeline');
            console.error(error);
        } else {
            // Flatten the results for easier rendering
            const mapped = (data || []).map(row => ({
                ...row.clientes,
                ...row,
                id: row.clientes?.id // We use the real client id for dragging/activities mapping
            }));
            console.log(`Pipeline: Clientes cargados: ${mapped.length}`, new Date().toISOString());
            setClients(mapped);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchPipeline();
    }, [empresaActiva]);

    const onDragEnd = async (result) => {
        const { destination, source, draggableId } = result;

        // Dropped outside or no movement
        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;
        if (!empresaActiva?.id) return;

        const newStatus = destination.droppableId;
        const clientId = Number(draggableId);

        // Optimistic UI update
        const previousClients = [...clients];
        const updatedClients = clients.map(c =>
            c.id === clientId ? { ...c, estado: newStatus } : c
        );
        setClients(updatedClients);

        // API Call to empresa_cliente instead of clientes
        const { error } = await supabase
            .from('empresa_cliente')
            .update({
                estado: newStatus,
                ...((newStatus.startsWith('4') || newStatus.startsWith('5')) ? { activador_cierre: userName || user?.email || null } : {})
            })
            .eq('cliente_id', clientId)
            .eq('empresa_id', empresaActiva.id);

        if (error) {
            toast.error('Error al mover el cliente');
            setClients(previousClients); // rollback
        } else {
            // Log the transition in activities
            const oldStatus = source.droppableId;
            const transitionDesc = `🔄 Cambio de estado (Pipeline): ${oldStatus} ➔ ${newStatus}`;

            await supabase.from('actividades').insert([{
                cliente_id: clientId,
                descripcion: transitionDesc,
                usuario: userName || user?.email || 'Sistema',
                empresa_id: empresaActiva.id,
                fecha: new Date().toISOString()
            }]);
        }
    };

    // Filter and group
    const filteredClients = clients.filter(c => {
        if (!search) return true;
        const term = search.toLowerCase();
        return (c.nombre_local?.toLowerCase().includes(term) ||
            c.nombre?.toLowerCase().includes(term) ||
            c.direccion?.toLowerCase().includes(term) ||
            c.responsable?.toLowerCase().includes(term));
    });

    const getColumnClients = (colId) => {
        return filteredClients.filter(c => {
            if (colId === '1 - Cliente relevado' && !c.estado) return true; // Fallback
            return c.estado === colId;
        });
    };

    return (
        <div className="container" style={{ display: 'flex', flexDirection: 'column', height: '100%', maxWidth: '100%', overflowX: 'hidden' }}>
            <header style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', gap: '16px', flexShrink: 0 }}>
                <div>
                    <h1 style={{ fontSize: '2.2rem', fontWeight: 800, margin: '0 0 8px 0', letterSpacing: '-0.02em', background: 'linear-gradient(135deg, var(--text) 0%, var(--text-muted) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Pipeline de Ventas
                    </h1>
                    <p className="muted" style={{ margin: 0, fontSize: '1.1rem' }}>
                        Visualiza el estado de tus locales en {empresaActiva?.nombre || 'la empresa'}
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div className="input-with-icon" style={{ width: '300px' }}>
                        <Search size={18} className="icon" />
                        <input
                            type="text"
                            className="input"
                            placeholder="Buscar local, responsable o dirección..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <button onClick={fetchPipeline} className="icon-button" style={{ padding: '10px' }} title="Recargar">
                        <RefreshCcw size={20} className={loading ? 'spin' : ''} />
                    </button>
                </div>
            </header>

            <div style={{ flex: 1, overflowX: 'auto', paddingBottom: '20px', minHeight: '600px' }}>
                <DragDropContext onDragEnd={onDragEnd}>
                    <div style={{ display: 'flex', gap: '20px', height: '100%', minWidth: 'max-content' }}>
                        {COLUMNS.map(column => (
                            <div key={column.id} style={{ width: '320px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px' }}>
                                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: column.color }}></span>
                                        {column.label}
                                    </h3>
                                    <span style={{ fontSize: '0.8rem', fontWeight: 600, padding: '2px 8px', borderRadius: '6px', background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                                        {getColumnClients(column.id).length}
                                    </span>
                                </div>

                                <Droppable droppableId={column.id}>
                                    {(provided, snapshot) => (
                                        <div
                                            {...provided.droppableProps}
                                            ref={provided.innerRef}
                                            style={{
                                                flex: 1,
                                                background: snapshot.isDraggingOver ? 'var(--bg-card)' : 'rgba(255,255,255,0.02)',
                                                borderRadius: '16px',
                                                padding: '12px',
                                                border: '1px solid var(--border)',
                                                transition: 'all 0.2s ease',
                                                minHeight: '200px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '12px'
                                            }}
                                        >
                                            {getColumnClients(column.id).map((client, index) => (
                                                <Draggable key={client.id} draggableId={String(client.id)} index={index}>
                                                    {(provided, snapshot) => (
                                                        <div
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            {...provided.dragHandleProps}
                                                            style={{
                                                                ...provided.draggableProps.style,
                                                                background: snapshot.isDragging ? 'var(--bg-elevated)' : 'var(--bg-card)',
                                                                border: '1px solid var(--border)',
                                                                borderRadius: '14px',
                                                                padding: '16px',
                                                                boxShadow: snapshot.isDragging ? '0 10px 25px rgba(0,0,0,0.2)' : '0 1px 3px rgba(0,0,0,0.1)',
                                                                cursor: 'grab',
                                                                transition: 'box-shadow 0.2s ease, transform 0.2s ease',
                                                                opacity: snapshot.isDragging ? 0.9 : 1
                                                            }}
                                                        >
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', gap: '8px' }}>
                                                                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)', lineHeight: 1.2 }}>
                                                                    {client.nombre_local || client.nombre || 'Local sin nombre'}
                                                                </div>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setEditingId(client.id);
                                                                        setModalOpen(true);
                                                                    }}
                                                                    style={{ padding: '4px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', borderRadius: '4px' }}
                                                                    className="hover-bg"
                                                                    title="Editar"
                                                                >
                                                                    <Edit2 size={16} />
                                                                </button>
                                                            </div>

                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                                {client.responsable && (
                                                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                        <User size={14} /> {client.responsable}
                                                                    </div>
                                                                )}
                                                                {client.fecha_proximo_contacto && (
                                                                    <div style={{ fontSize: '0.85rem', color: 'var(--accent)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                        <Calendar size={14} /> {new Date(client.fecha_proximo_contacto).toLocaleDateString()}
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {(client.interes === 'Alto' || client.venta_digital || client.notas) && (
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                                        {client.interes === 'Alto' && (
                                                                            <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', textTransform: 'uppercase' }}>🔥 Caliente</span>
                                                                        )}
                                                                        {client.venta_digital && (
                                                                            <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', textTransform: 'uppercase' }}>🌐 Digital</span>
                                                                        )}
                                                                    </div>
                                                                    {client.notas && (
                                                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', background: 'rgba(0,0,0,0.02)', padding: '6px', borderRadius: '6px', borderLeft: '2px solid var(--border)' }}>
                                                                            "{client.notas.length > 60 ? client.notas.substring(0, 57) + '...' : client.notas}"
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </Draggable>
                                            ))}
                                            {provided.placeholder}
                                        </div>
                                    )}
                                </Droppable>
                            </div>
                        ))}
                    </div>
                </DragDropContext>
            </div>

            <ClienteModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                clienteId={editingId}
                onSaved={() => {
                    setModalOpen(false);
                    setTimeout(() => fetchPipeline(), 300);
                }}
            />
        </div>
    );
}
