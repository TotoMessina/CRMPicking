import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Search, User, Calendar, RefreshCcw, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { ClienteModal } from '../components/ui/ClienteModal';
import { Edit2 } from 'lucide-react';
import { formatToLocal } from '../utils/dateUtils';
import {
    ESTADO_RELEVADO, ESTADO_VISITADO_NO_ACTIVO, ESTADO_PRIMER_INGRESO,
    ESTADO_LOCAL_CREADO, ESTADO_ACTIVO, ESTADO_NO_INTERESADO,
    esEstadoFinal
} from '../constants/estados';

const COLUMNS = [
    { id: ESTADO_RELEVADO,          label: 'Relevado',          color: '#64748b' },
    { id: ESTADO_VISITADO_NO_ACTIVO, label: 'Visitado (No Act)', color: '#ef4444' },
    { id: ESTADO_PRIMER_INGRESO,    label: 'Primer Ingreso',    color: '#f59e0b' },
    { id: ESTADO_LOCAL_CREADO,      label: 'Creado',            color: '#8b5cf6' },
    { id: ESTADO_ACTIVO,            label: 'Visitado (Activo)', color: '#10b981' },
    { id: ESTADO_NO_INTERESADO,     label: 'No Interesado',     color: '#ef4444' }
];

export default function Pipeline() {
    const { user, userName, empresaActiva } = useAuth();
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);

    // Responsive State
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);
    const [activeTab, setActiveTab] = useState(ESTADO_RELEVADO);
    const [collapsedCols, setCollapsedCols] = useState(new Set());

    const toggleCollapse = (id) => {
        const newSet = new Set(collapsedCols);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setCollapsedCols(newSet);
    };

    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const isMobile = windowWidth < 768;

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
            const mapped = (data || []).map(row => ({
                ...row.clientes,
                ...row,
                id: row.clientes?.id
            }));
            setClients(mapped);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchPipeline();
    }, [empresaActiva]);

    const onDragEnd = async (result) => {
        const { destination, source, draggableId } = result;
        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;
        if (!empresaActiva?.id) return;

        const newStatus = destination.droppableId;
        const clientId = Number(draggableId);

        const previousClients = [...clients];
        const updatedClients = clients.map(c =>
            c.id === clientId ? { ...c, estado: newStatus } : c
        );
        setClients(updatedClients);

        const { error } = await supabase
            .from('empresa_cliente')
            .update({
                estado: newStatus,
                ...( esEstadoFinal(newStatus) ? { activador_cierre: userName || user?.email || null } : {})
            })
            .eq('cliente_id', clientId)
            .eq('empresa_id', empresaActiva.id);

        if (error) {
            toast.error('Error al mover el cliente');
            setClients(previousClients);
        } else {
            const oldStatus = source.droppableId;
            await supabase.from('actividades').insert([{
                cliente_id: clientId,
                descripcion: `🔄 Cambio de estado (Pipeline): ${oldStatus} ➔ ${newStatus}`,
                usuario: userName || user?.email || 'Sistema',
                empresa_id: empresaActiva.id,
                fecha: new Date().toISOString()
            }]);
        }
    };

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
            if (colId === ESTADO_RELEVADO && !c.estado) return true;
            return c.estado === colId;
        });
    };

    const renderCard = (client, index, provided = null, snapshot = null) => {
        const cardStyle = {
            ...(provided?.draggableProps?.style || {}),
            background: snapshot?.isDragging ? 'var(--bg-elevated)' : 'var(--bg-card)',
            border: snapshot?.isDragging ? '2px solid var(--accent)' : '1px solid var(--border)',
            borderRadius: '16px',
            padding: '16px',
            boxShadow: snapshot?.isDragging ? '0 15px 35px rgba(0,0,0,0.25)' : 'var(--shadow-sm)',
            cursor: 'grab',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            opacity: snapshot?.isDragging ? 0.95 : 1,
            position: 'relative',
            backdropFilter: 'blur(10px)',
            marginBottom: '12px'
        };

        return (
            <div
                ref={provided?.innerRef}
                {...(provided?.draggableProps || {})}
                {...(provided?.dragHandleProps || {})}
                style={cardStyle}
                className="kanban-card-premium"
                onClick={() => {
                    if (isMobile) {
                        setEditingId(client.id);
                        setModalOpen(true);
                    }
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px', gap: '8px' }}>
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text)', lineHeight: 1.25 }}>
                        {client.nombre_local || client.nombre || 'Local sin nombre'}
                    </div>
                    {!isMobile && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setEditingId(client.id);
                                setModalOpen(true);
                            }}
                            style={{ padding: '6px', background: 'rgba(0,0,0,0.03)', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', borderRadius: '8px', display: 'flex' }}
                        >
                            <Edit2 size={14} />
                        </button>
                    )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {client.responsable && (
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ padding: '4px', background: 'var(--bg-body)', borderRadius: '6px' }}><User size={13} /></div>
                            {client.responsable}
                        </div>
                    )}
                    {client.fecha_proximo_contacto && (
                        <div style={{ fontSize: '0.85rem', color: 'var(--accent)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ padding: '4px', background: 'var(--accent-soft)', borderRadius: '6px' }}><Calendar size={13} /></div>
                            {formatToLocal(client.fecha_proximo_contacto)}
                        </div>
                    )}
                </div>

                {(client.interes === 'Alto' || client.venta_digital || client.notas) && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '14px', paddingTop: '12px', borderTop: '1px dashed var(--border)' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {client.interes === 'Alto' && (
                                <span style={{ fontSize: '0.65rem', fontWeight: 900, padding: '3px 10px', borderRadius: '20px', background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em', boxShadow: '0 4px 10px rgba(239, 68, 68, 0.2)' }}>🔥 HOT</span>
                            )}
                            {client.venta_digital && (
                                <span style={{ fontSize: '0.65rem', fontWeight: 900, padding: '3px 10px', borderRadius: '20px', background: 'linear-gradient(135deg, var(--accent) 0%, #7c3aed 100%)', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em', boxShadow: '0 4px 10px rgba(139, 92, 246, 0.2)' }}>🌐 Digital</span>
                            )}
                        </div>
                        {client.notas && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '10px', borderRadius: '12px', background: 'var(--bg-body)', border: '1px solid var(--border)', lineHeight: 1.4 }}>
                                {client.notas.length > (isMobile ? 120 : 80) ? client.notas.substring(0, isMobile ? 117 : 77) + '...' : client.notas}
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="container" style={{ display: 'flex', flexDirection: 'column', height: '100%', maxWidth: '1400px', width: '100%', margin: isMobile ? '0' : '24px auto', borderRadius: isMobile ? '0' : '24px', overflow: 'hidden', minHeight: '100vh', background: 'transparent', boxShadow: 'none', border: 'none' }}>
            <header style={{ padding: isMobile ? '20px' : '0 0 32px 0', background: isMobile ? 'var(--bg-elevated)' : 'transparent', borderBottom: isMobile ? '1px solid var(--border)' : 'none' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <h1 style={{ fontSize: isMobile ? '1.75rem' : '2.8rem', fontWeight: 900, margin: '0 0 8px 0', letterSpacing: '-0.03em', color: 'var(--text)' }}>
                            Pipeline <span style={{ color: 'var(--accent)' }}>PickUp</span>
                        </h1>
                        <p className="muted" style={{ margin: 0, fontSize: '1.1rem', fontWeight: 500 }}>
                            Gestión comercial de locales.
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div style={{ position: 'relative', flex: 1, maxWidth: isMobile ? '100%' : '400px' }}>
                            <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="text"
                                className="input"
                                placeholder={isMobile ? "Buscar..." : "Buscar local, responsable..."}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                style={{ paddingLeft: '48px', height: '48px', borderRadius: '16px', background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
                            />
                        </div>
                        <button onClick={fetchPipeline} className="btn-icon" style={{ height: '48px', width: '48px', borderRadius: '16px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', display: 'grid', placeItems: 'center', cursor: 'pointer', transition: 'all 0.2s' }}>
                            <RefreshCcw size={20} className={loading ? 'spin' : ''} />
                        </button>
                    </div>
                </div>

                {isMobile && (
                    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', padding: '16px 0 4px 0', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                        {COLUMNS.map(col => (
                            <button
                                key={col.id}
                                onClick={() => setActiveTab(col.id)}
                                style={{
                                    whiteSpace: 'nowrap',
                                    padding: '8px 16px',
                                    borderRadius: '12px',
                                    fontSize: '0.85rem',
                                    fontWeight: 700,
                                    border: '1px solid',
                                    borderColor: activeTab === col.id ? col.color : 'var(--border)',
                                    background: activeTab === col.id ? col.color : 'transparent',
                                    color: activeTab === col.id ? '#fff' : 'var(--text-muted)',
                                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                                }}
                            >
                                {col.label.split(' ')[0]} 
                                <span style={{ marginLeft: '6px', opacity: 0.8, fontSize: '0.75rem' }}>({getColumnClients(col.id).length})</span>
                            </button>
                        ))}
                    </div>
                )}
            </header>

            <div style={{ flex: 1, padding: isMobile ? '20px' : '0', overflowX: isMobile ? 'hidden' : 'auto', paddingBottom: '40px' }}>
                {isMobile ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <div style={{ width: '4px', height: '16px', borderRadius: '2px', background: COLUMNS.find(c => c.id === activeTab)?.color }}></div>
                            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>{COLUMNS.find(c => c.id === activeTab)?.label}</h2>
                        </div>
                        {getColumnClients(activeTab).length === 0 ? (
                            <div className="muted" style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--bg-elevated)', borderRadius: '24px', border: '1px dashed var(--border)' }}>
                                No hay clientes en este estado.
                            </div>
                        ) : (
                            getColumnClients(activeTab).map((client, idx) => (
                                <div key={client.id}>{renderCard(client, idx)}</div>
                            ))
                        )}
                    </div>
                ) : (
                    <DragDropContext onDragEnd={onDragEnd}>
                        <div style={{ display: 'flex', gap: '16px', height: '100%', width: '100%', padding: '4px' }}>
                            {COLUMNS.map(column => {
                                const isCollapsed = collapsedCols.has(column.id);
                                return (
                                    <div 
                                        key={column.id} 
                                        style={{ 
                                            width: isCollapsed ? '60px' : '310px',
                                            flexShrink: 0,
                                            display: 'flex', 
                                            flexDirection: 'column', 
                                            gap: '20px',
                                            transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                            overflow: 'hidden'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'space-between', padding: '0 8px', flexDirection: isCollapsed ? 'column' : 'row', gap: isCollapsed ? '20px' : '0' }}>
                                            {!isCollapsed ? (
                                                <>
                                                    <h3 style={{ fontSize: '0.9rem', fontWeight: 800, margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <div style={{ width: '12px', height: '12px', borderRadius: '4px', background: column.color, boxShadow: `0 0 10px ${column.color}44` }}></div>
                                                        {column.label}
                                                    </h3>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '4px 10px', borderRadius: '10px', background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                                                            {getColumnClients(column.id).length}
                                                        </span>
                                                        <button 
                                                            onClick={() => toggleCollapse(column.id)}
                                                            className="btn-icon"
                                                            style={{ padding: '4px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', opacity: 0.6 }}
                                                        >
                                                            <ChevronLeft size={18} />
                                                        </button>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <button 
                                                        onClick={() => toggleCollapse(column.id)}
                                                        className="btn-icon"
                                                        style={{ padding: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--accent)', cursor: 'pointer', marginBottom: '10px' }}
                                                    >
                                                        <Maximize2 size={16} />
                                                    </button>
                                                    <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                                        {column.label}
                                                    </div>
                                                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>
                                                        {getColumnClients(column.id).length}
                                                    </span>
                                                </>
                                            )}
                                        </div>

                                        {!isCollapsed && (
                                            <Droppable droppableId={column.id}>
                                                {(provided, snapshot) => (
                                                    <div
                                                        {...provided.droppableProps}
                                                        ref={provided.innerRef}
                                                        style={{
                                                            flex: 1,
                                                            background: snapshot.isDraggingOver ? 'var(--bg-elevated)' : 'rgba(0,0,0,0.015)',
                                                            borderRadius: '24px',
                                                            padding: '16px',
                                                            border: '1px solid var(--border)',
                                                            transition: 'all 0.3s ease',
                                                            minHeight: '400px',
                                                            display: 'flex', 
                                                            flexDirection: 'column',
                                                            gap: '4px',
                                                            opacity: 1
                                                        }}
                                                    >
                                                        {getColumnClients(column.id).map((client, index) => (
                                                            <Draggable key={client.id} draggableId={String(client.id)} index={index}>
                                                                {(provided, snapshot) => renderCard(client, index, provided, snapshot)}
                                                            </Draggable>
                                                        ))}
                                                        {provided.placeholder}
                                                    </div>
                                                )}
                                            </Droppable>
                                        )}
                                        {isCollapsed && (
                                            <Droppable droppableId={column.id}>
                                                {(provided, snapshot) => (
                                                    <div
                                                        {...provided.droppableProps}
                                                        ref={provided.innerRef}
                                                        style={{
                                                            flex: 1,
                                                            background: snapshot.isDraggingOver ? 'var(--accent-soft)' : 'transparent',
                                                            border: snapshot.isDraggingOver ? '2px dashed var(--accent)' : 'none',
                                                            borderRadius: '16px',
                                                            margin: '4px'
                                                        }}
                                                    >
                                                        {provided.placeholder}
                                                    </div>
                                                )}
                                            </Droppable>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </DragDropContext>
                )}
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
