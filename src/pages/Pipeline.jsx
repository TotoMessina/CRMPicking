import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Search, User, Calendar, RefreshCcw } from 'lucide-react';
import toast from 'react-hot-toast';

const COLUMNS = [
    { id: '1 - Cliente relevado', label: 'Relevado', color: '#64748b' },
    { id: '2 - Local Visitado No Activo', label: 'Visitado (No Act)', color: '#ef4444' },
    { id: '3 - Primer Ingreso', label: 'Primer Ingreso', color: '#f59e0b' },
    { id: '4 - Local Creado', label: 'Creado', color: '#3b82f6' },
    { id: '5 - Local Visitado Activo', label: 'Visitado (Activo)', color: '#10b981' },
    { id: '6 - Local No Interesado', label: 'No Interesado', color: '#ef4444' }
];

export default function Pipeline() {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const fetchPipeline = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('clientes')
            .select('*')
            .eq('activo', true)
            .order('updated_at', { ascending: false });

        if (error) {
            toast.error('Error cargando pipeline');
            console.error(error);
        } else {
            setClients(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchPipeline();
    }, []);

    const onDragEnd = async (result) => {
        const { destination, source, draggableId } = result;

        // Dropped outside or no movement
        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        const newStatus = destination.droppableId;
        const clientId = Number(draggableId);

        // Optimistic UI update
        const previousClients = [...clients];
        const updatedClients = clients.map(c =>
            c.id === clientId ? { ...c, estado: newStatus } : c
        );
        setClients(updatedClients);

        // API Call
        const { error } = await supabase
            .from('clientes')
            .update({ estado: newStatus })
            .eq('id', clientId);

        if (error) {
            toast.error('Error al mover el cliente');
            setClients(previousClients); // rollback
        }
    };

    // Filter and group
    const filteredClients = clients.filter(c => {
        if (!search) return true;
        const term = search.toLowerCase();
        return (c.nombre_fantasia?.toLowerCase().includes(term) ||
            c.nombre?.toLowerCase().includes(term) ||
            c.razon_social?.toLowerCase().includes(term) ||
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
                        Gestiona el flujo de tus prospectos arrastrando las tarjetas.
                    </p>
                </div>

                {/* Glassmorphic Controls */}
                <div style={{
                    display: 'flex', gap: '12px', background: 'var(--bg-elevated)', padding: '8px 16px',
                    borderRadius: '16px', border: '1px solid var(--border)',
                    boxShadow: '0 4px 20px -10px rgba(0,0,0,0.1)', backdropFilter: 'blur(20px)'
                }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            placeholder="Buscar cliente..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{
                                padding: '10px 16px 10px 36px',
                                borderRadius: '8px',
                                border: '1px solid var(--border)',
                                background: 'var(--bg)',
                                color: 'var(--text)',
                                width: '250px',
                                outline: 'none',
                                transition: 'all 0.2s ease',
                            }}
                            onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                            onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                        />
                    </div>
                    <button className="btn-secundario" onClick={fetchPipeline} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <RefreshCcw size={16} />
                        Actualizar
                    </button>
                </div>
            </header>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '64px', color: 'var(--text-muted)' }}>Cargando pipeline...</div>
            ) : (
                <DragDropContext onDragEnd={onDragEnd}>
                    <div className="kanban-board" style={{ display: 'flex', gap: '16px', overflowX: 'auto', flex: 1, paddingBottom: '16px' }}>
                        {COLUMNS.map(col => {
                            const allColumnClients = getColumnClients(col.id);
                            const columnClients = allColumnClients.slice(0, 10);
                            const totalCount = allColumnClients.length;

                            return (
                                <Droppable key={col.id} droppableId={col.id}>
                                    {(provided, snapshot) => (
                                        <div
                                            className={`kanban-column ${snapshot.isDraggingOver ? 'kanban-drop-zone' : ''}`}
                                            ref={provided.innerRef}
                                            {...provided.droppableProps}
                                            style={{
                                                flex: '0 0 300px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                background: 'var(--bg-elevated)',
                                                borderRadius: '12px',
                                                padding: '16px',
                                                border: snapshot.isDraggingOver ? `2px dashed ${col.color}` : '2px solid transparent',
                                                transition: 'background-color 0.2s ease, border 0.2s ease'
                                            }}
                                        >
                                            <div style={{ borderBottom: `2px solid ${col.color}`, paddingBottom: '12px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <h2 style={{ fontSize: '1rem', fontWeigth: 600, color: 'var(--text)', margin: 0 }}>{col.label}</h2>
                                                <span className="kanban-count" style={{
                                                    background: `${col.color}20`,
                                                    color: col.color,
                                                    padding: '2px 10px',
                                                    borderRadius: '100px',
                                                    fontSize: '0.8rem',
                                                    fontWeight: 600,
                                                    border: `1px solid ${col.color}40`
                                                }}>
                                                    {totalCount > 10 ? `10 / ${totalCount}` : totalCount}
                                                </span>
                                            </div>

                                            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '4px' }}>
                                                {columnClients.map((client, index) => (
                                                    <Draggable key={String(client.id)} draggableId={String(client.id)} index={index}>
                                                        {(provided, snapshot) => (
                                                            <div
                                                                ref={provided.innerRef}
                                                                {...provided.draggableProps}
                                                                {...provided.dragHandleProps}
                                                                className="kanban-card bento-card"
                                                                style={{
                                                                    padding: '16px',
                                                                    cursor: 'grab',
                                                                    position: 'relative',
                                                                    display: 'flex',
                                                                    flexDirection: 'column',
                                                                    gap: '12px',
                                                                    background: 'var(--card)',
                                                                    borderRadius: '12px',
                                                                    border: '1px solid var(--border)',
                                                                    boxShadow: snapshot.isDragging ? '0 12px 32px rgba(0,0,0,0.15)' : '0 2px 8px rgba(0,0,0,0.04)',
                                                                    transform: snapshot.isDragging ? 'rotate(3deg) scale(1.04)' : 'none',
                                                                    transition: 'transform 0.15s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.15s ease',
                                                                    ...provided.draggableProps.style
                                                                }}
                                                            >
                                                                {/* Accent border top based on column color */}
                                                                <div style={{
                                                                    position: 'absolute', top: 0, left: 0, right: 0, height: '4px',
                                                                    background: col.color, opacity: 0.8, borderRadius: '12px 12px 0 0'
                                                                }} />

                                                                <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text)', paddingTop: '4px' }}>
                                                                    {client.nombre_fantasia || client.nombre || client.razon_social || 'Sin Nombre'}
                                                                </div>

                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                        <User size={14} /> {client.responsable || 'Sin Asignar'}
                                                                    </span>
                                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                        <Calendar size={14} /> {client.updated_at ? new Date(client.updated_at).toLocaleDateString('es-AR') : '-'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </Draggable>
                                                ))}
                                                {provided.placeholder}
                                            </div>
                                        </div>
                                    )}
                                </Droppable>
                            );
                        })}
                    </div>
                </DragDropContext>
            )}
        </div>
    );
}
