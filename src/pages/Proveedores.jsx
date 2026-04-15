import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Plus, Search, Calendar as CalendarIcon, Phone, Store, User, CheckCircle2, Flame, MapPin, Coffee, Rocket, Filter, Layers, Tag, GripVertical, Settings2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

import { ProveedorModal } from '../components/ui/ProveedorModal';
import { EventoProveedorModal } from '../components/ui/EventoProveedorModal';
import { SprintModal } from '../components/ui/SprintModal';

const TYPE_COLORS = {
    pedido: "#8b5cf6",
    idea: "#eab308",
    plazo: "#ef4444",
    otro: "#64748b"
};

const SPRINT_PALETTES = [
    { bg: 'rgba(99,102,241,0.07)', border: 'rgba(99,102,241,0.25)', text: '#6366f1', header: 'rgba(99,102,241,0.10)' },
    { bg: 'rgba(20,184,166,0.07)', border: 'rgba(20,184,166,0.25)', text: '#14b8a6', header: 'rgba(20,184,166,0.10)' },
    { bg: 'rgba(245,158,11,0.07)', border: 'rgba(245,158,11,0.25)', text: '#d97706', header: 'rgba(245,158,11,0.10)' },
    { bg: 'rgba(236,72,153,0.07)', border: 'rgba(236,72,153,0.25)', text: '#ec4899', header: 'rgba(236,72,153,0.10)' },
    { bg: 'rgba(59,130,246,0.07)', border: 'rgba(59,130,246,0.25)', text: '#3b82f6', header: 'rgba(59,130,246,0.10)' },
    { bg: 'rgba(139,92,246,0.07)', border: 'rgba(139,92,246,0.25)', text: '#8b5cf6', header: 'rgba(139,92,246,0.10)' },
];

export default function Proveedores() {
    const { empresaActiva } = useAuth();
    const [activeTab, setActiveTab] = useState('roadmap');

    // Data states
    const [proveedores, setProveedores] = useState([]);
    const [filteredProveedores, setFilteredProveedores] = useState([]);
    const [events, setEvents] = useState([]);
    const [sprints, setSprints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchProv, setSearchProv] = useState('');

    // Roadmap Filters
    const [roadmapPriorityFilter, setRoadmapPriorityFilter] = useState('');
    const [roadmapDependencyFilter, setRoadmapDependencyFilter] = useState('');
    const [roadmapGroupBy, setRoadmapGroupBy] = useState('sprint');

    // Modals
    const [modalProvOpen, setModalProvOpen] = useState(false);
    const [editingProvId, setEditingProvId] = useState(null);
    const [modalEventOpen, setModalEventOpen] = useState(false);
    const [editingEventId, setEditingEventId] = useState(null);
    const [modalSprintOpen, setModalSprintOpen] = useState(false);
    const [editingSprintId, setEditingSprintId] = useState(null);
    const [isIdea, setIsIdea] = useState(false);

    const calendarRef = useRef(null);

    const fetchData = async () => {
        if (!empresaActiva?.id) return;
        setLoading(true);

        const [provRes, sprintRes, eventRes] = await Promise.all([
            supabase.from('proveedores').select('*').eq('empresa_id', empresaActiva.id).eq('activo', true).order('nombre'),
            supabase.from('proveedor_sprints').select('*').eq('empresa_id', empresaActiva.id).order('orden', { ascending: true }),
            supabase.from('eventos_proveedores').select(`*, proveedores(nombre)`).eq('empresa_id', empresaActiva.id).order('created_at', { ascending: false })
        ]);

        if (provRes.error) toast.error("Error proveedores");
        if (sprintRes.error) console.error("Error sprints:", sprintRes.error);
        if (eventRes.error) toast.error("Error eventos");

        setProveedores(provRes.data || []);
        applySearchProv(searchProv, provRes.data || []);
        setSprints(sprintRes.data || []);
        setEvents(eventRes.data || []);

        setLoading(false);
    };

    useEffect(() => { fetchData(); }, [empresaActiva]);

    const applySearchProv = (term, list) => {
        const lower = term.toLowerCase();
        setFilteredProveedores(list.filter(p => p.nombre.toLowerCase().includes(lower)));
    };

    const handleSearchProvChange = (e) => {
        const term = e.target.value;
        setSearchProv(term);
        applySearchProv(term, proveedores);
    };

    // --- Calendar logic stays as-is (hidden for brevity in thought, but kept in code) ---
    const calendarEvents = events.filter(e => e.fecha_inicio).map(e => {
        let color = TYPE_COLORS[e.tipo] || "#64748b";
        const now = new Date();
        const end = e.fecha_fin ? new Date(e.fecha_fin) : null;
        let titlePrefix = "";
        if (e.estado === 'pendiente' && end && now > end) { color = "#b91c1c"; titlePrefix = "⚠️ "; }
        else if (e.fecha_real_cierre && end && new Date(e.fecha_real_cierre) > end) { color = "#7c3aed"; titlePrefix = "⏳ "; }
        else if (e.estado === 'completado') { color = "#22c55e"; titlePrefix = "✅ "; }
        if (e.tipo === 'idea') { titlePrefix = "🚀 Lanzamiento: "; color = "#f59e0b"; }
        return {
            id: e.id, title: `${titlePrefix}${e.proveedores?.nombre || "General"} - ${e.titulo}`,
            start: e.fecha_inicio, end: e.fecha_fin,
            backgroundColor: color, borderColor: color,
            allDay: e.tipo === 'idea' && !e.fecha_fin,
            extendedProps: { original: e }
        };
    });

    const handleEventDrop = async (info) => {
        const { error } = await supabase.from('eventos_proveedores').update({
            fecha_inicio: info.event.start.toISOString(),
            fecha_fin: info.event.end ? info.event.end.toISOString() : null
        }).eq('id', info.event.id);
        if (error) { toast.error("Error al mover fecha"); info.revert(); }
        else { toast.success("Hito actualizado"); fetchData(); }
    };

    // --- Roadmap logic ---
    const rawIdeas = events.filter(e => e.tipo === 'idea');
    const filteredIdeas = rawIdeas.filter(idea => {
        if (roadmapPriorityFilter && idea.prioridad !== roadmapPriorityFilter) return false;
        if (roadmapDependencyFilter) {
            const expectTrue = roadmapDependencyFilter === 'interna';
            if (idea.depende_de_nosotros !== expectTrue) return false;
        }
        return true;
    });

    const priorityCols = [
        { key: 'alta', label: 'Prioridad Alta', icon: <Flame size={17} />, ideas: filteredIdeas.filter(i => i.prioridad === 'alta'), bg: '#fef2f2', border: '#fecaca', color: '#ef4444' },
        { key: 'media', label: 'Prioridad Media', icon: <CheckCircle2 size={17} />, ideas: filteredIdeas.filter(i => i.prioridad === 'media' || !i.prioridad), bg: '#f0f9ff', border: '#bae6fd', color: '#3b82f6' },
        { key: 'baja', label: 'Backlog / Baja', icon: <Coffee size={17} />, ideas: filteredIdeas.filter(i => i.prioridad === 'baja'), bg: 'var(--bg-elevated)', border: 'var(--border)', color: 'var(--text-muted)' },
    ].filter(c => c.ideas.length > 0);

    const sprintBlocks = [
        ...sprints.map(s => ({ id: s.id, name: s.nombre, ideas: filteredIdeas.filter(i => i.sprint_id === s.id) })),
        { id: '__backlog__', name: 'Sin Sprint / Ideas Sueltas', ideas: filteredIdeas.filter(i => !i.sprint_id) }
    ].filter(b => b.id === '__backlog__' ? b.ideas.length > 0 : true);

    const onDragEnd = async (result) => {
        const { destination, source, draggableId, type } = result;
        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        if (type === 'SPRINT') {
            const items = Array.from(sprints);
            const [reorderedItem] = items.splice(source.index, 1);
            items.splice(destination.index, 0, reorderedItem);
            setSprints(items);
            const updates = items.map((item, index) => ({ id: item.id, empresa_id: empresaActiva.id, nombre: item.nombre, orden: index }));
            const { error } = await supabase.from('proveedor_sprints').upsert(updates);
            if (error) { toast.error("Error al guardar orden"); fetchData(); }
            else { toast.success("Fases reordenadas"); }
            return;
        }

        if (type === 'IDEA') {
            const ideaId = draggableId; // This is a string from DnD
            const newSprintId = destination.droppableId === '__backlog__' ? null : destination.droppableId;
            
            // UI optimistic update
            // Use String() for comparison just in case idea.id is numeric
            setEvents(prev => prev.map(e => String(e.id) === String(ideaId) ? { ...e, sprint_id: newSprintId } : e));

            const { error } = await supabase.from('eventos_proveedores').update({ sprint_id: newSprintId }).eq('id', ideaId);
            if (error) { toast.error("Error al mover idea"); fetchData(); }
            else { toast.success("Idea movida"); }
        }
    };

    const handleOpenSprintModal = (id = null) => { setEditingSprintId(id); setModalSprintOpen(true); };
    const handleDeleteSprint = async (id, name) => {
        if (!window.confirm(`¿Seguro que querés eliminar "${name}"?`)) return;
        const { error } = await supabase.from('proveedor_sprints').delete().eq('id', id);
        if (error) toast.error("Error al eliminar"); else { toast.success("Eliminado"); fetchData(); }
    };

    // --- Component Renderer for Idea Cards ---
    const IdeaCard = ({ idea, index, isDraggable = true }) => {
        const badge = { alta: ['🔥 Alta', '#ef4444', 'rgba(239,68,68,0.1)'], media: ['⭐ Media', '#3b82f6', 'rgba(59,130,246,0.1)'], baja: ['☕ Baja', '#64748b', 'rgba(100,116,139,0.1)'] }[idea.prioridad || 'media'];
        
        const content = (provided, snapshot) => (
            <div 
                ref={provided?.innerRef}
                {...(provided?.draggableProps || {})}
                {...(provided?.dragHandleProps || {})}
                onClick={() => { setIsIdea(true); setEditingEventId(idea.id); setModalEventOpen(true); }}
                style={{ 
                    ...(provided?.draggableProps?.style || {}),
                    background: snapshot?.isDragging ? 'var(--bg-active)' : 'var(--bg-body)', 
                    border: '1px solid var(--border)', 
                    borderRadius: '12px', 
                    padding: '14px', 
                    cursor: 'grab', 
                    transition: 'box-shadow 0.2s, transform 0.2s', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '8px',
                    boxShadow: snapshot?.isDragging ? '0 10px 25px rgba(0,0,0,0.2)' : 'none',
                    userSelect: 'none'
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem', color: idea.estado === 'completado' ? 'var(--text-muted)' : 'var(--text)', textDecoration: idea.estado === 'completado' ? 'line-through' : 'none', flex: 1 }}>
                        {idea.estado === 'completado' && '✅ '}{idea.titulo}
                    </div>
                    {idea.fecha_inicio && (
                        <div style={{ background: 'rgba(245,158,11,0.1)', color: '#d97706', padding: '3px 7px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap' }}>
                            <Rocket size={10} /> {new Date(idea.fecha_inicio).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                        </div>
                    )}
                </div>
                {idea.descripcion && (
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {idea.descripcion}
                    </div>
                )}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', background: badge[2], color: badge[1] }}>{badge[0]}</span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', background: idea.depende_de_nosotros ? 'rgba(59,130,246,0.1)' : 'rgba(139,92,246,0.1)', color: idea.depende_de_nosotros ? '#3b82f6' : '#8b5cf6' }}>
                        {idea.depende_de_nosotros ? '👨‍💻 Equipo' : `⏳ ${idea.proveedores?.nombre || 'Proveedor'}`}
                    </span>
                </div>
            </div>
        );

        if (!isDraggable) return content();

        return (
            <Draggable key={String(idea.id)} draggableId={String(idea.id)} index={index}>
                {(provided, snapshot) => content(provided, snapshot)}
            </Draggable>
        );
    };

    const tabBtnStyle = (isActive) => ({
        padding: '10px 20px', borderRadius: '12px',
        background: isActive ? 'var(--text)' : 'transparent',
        color: isActive ? 'var(--bg)' : 'var(--text-muted)',
        fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
        border: 'none', display: 'flex', alignItems: 'center', gap: '8px',
        whiteSpace: 'nowrap'
    });

    return (
        <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '40px' }}>
            {/* --- HEADER --- */}
            <header style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.02em', background: 'linear-gradient(135deg, var(--text) 0%, var(--text-muted) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Proveedores &amp; Despliegues
                    </h1>
                    <p className="muted" style={{ margin: 0, fontSize: '1.1rem' }}>Gestión de catálogo externo e hitos de planificación.</p>
                </div>
                <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '4px', overflowX: 'auto', scrollbarWidth: 'none' }}>
                    <button onClick={() => setActiveTab('roadmap')} style={tabBtnStyle(activeTab === 'roadmap')}><MapPin size={18} /> Roadmap de Ideas</button>
                    <button onClick={() => setActiveTab('calendario')} style={tabBtnStyle(activeTab === 'calendario')}><CalendarIcon size={18} /> Calendario Lógico</button>
                    <button onClick={() => setActiveTab('directorio')} style={tabBtnStyle(activeTab === 'directorio')}><Store size={18} /> Directorio Contactos</button>
                </div>
            </header>

            {/* --- ROADMAP --- */}
            {activeTab === 'roadmap' && (
                <div className="tab-pane-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--bg-elevated)', padding: '20px', borderRadius: '20px', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                            <div style={{ display: 'flex', background: 'var(--bg-body)', border: '1px solid var(--border)', borderRadius: '12px', padding: '4px', gap: '4px' }}>
                                <button onClick={() => setRoadmapGroupBy('sprint')} style={{ padding: '8px 16px', borderRadius: '9px', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s', background: roadmapGroupBy === 'sprint' ? 'var(--accent)' : 'transparent', color: roadmapGroupBy === 'sprint' ? '#fff' : 'var(--text-muted)' }}><Layers size={14} /> Sprints</button>
                                <button onClick={() => setRoadmapGroupBy('prioridad')} style={{ padding: '8px 16px', borderRadius: '9px', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s', background: roadmapGroupBy === 'prioridad' ? 'var(--accent)' : 'transparent', color: roadmapGroupBy === 'prioridad' ? '#fff' : 'var(--text-muted)' }}><Flame size={14} /> Prioridad</button>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <Button variant="secondary" onClick={() => handleOpenSprintModal()} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Settings2 size={16} /> Nuevo Sprint</Button>
                                <Button variant="primary" onClick={() => { setIsIdea(true); setEditingEventId(null); setModalEventOpen(true); }} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Plus size={18} /> Nueva Idea</Button>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 700 }}><Filter size={14} /> Filtrar por:</span>
                            <select className="input" style={{ width: 'auto', minWidth: '180px' }} value={roadmapPriorityFilter} onChange={e => setRoadmapPriorityFilter(e.target.value)}>
                                <option value="">Todas las Prioridades</option>
                                <option value="alta">🔥 Alta</option><option value="media">⭐ Media</option><option value="baja">☕ Baja</option>
                            </select>
                            <select className="input" style={{ width: 'auto', minWidth: '200px' }} value={roadmapDependencyFilter} onChange={e => setRoadmapDependencyFilter(e.target.value)}>
                                <option value="">Dependencia Global</option><option value="interna">Equipo PickUp</option><option value="externa">Esperando Proveedor</option>
                            </select>
                        </div>
                    </div>

                    {loading ? <div className="muted text-center" style={{ padding: '60px' }}>Cargando...</div> : (
                        roadmapGroupBy === 'prioridad' ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
                                {priorityCols.map(col => (
                                    <div key={col.key} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '4px 8px' }}>
                                            <span style={{ color: col.color }}>{col.icon}</span><span style={{ fontWeight: 800, fontSize: '1.1rem', color: col.color }}>{col.label}</span>
                                            <span style={{ fontSize: '0.85rem', fontWeight: 700, background: col.bg, color: col.color, padding: '4px 10px', borderRadius: '10px' }}>{col.ideas.length}</span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>{col.ideas.map((i, idx) => <IdeaCard key={i.id} idea={i} index={idx} isDraggable={false} />)}</div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <DragDropContext onDragEnd={onDragEnd}>
                                <Droppable droppableId="sprints-outer" type="SPRINT" direction="vertical">
                                    {(provided) => (
                                        <div {...provided.droppableProps} ref={provided.innerRef} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                            {sprintBlocks.map((block, index) => (
                                                <Draggable key={String(block.id)} draggableId={String(block.id)} index={index} isDragDisabled={block.id === '__backlog__'}>
                                                    {(provided, snapshot) => {
                                                        const p = SPRINT_PALETTES[index % SPRINT_PALETTES.length] || SPRINT_PALETTES[0];
                                                        const isBacklog = block.id === '__backlog__';
                                                        return (
                                                            <div 
                                                                ref={provided.innerRef} {...provided.draggableProps} 
                                                                style={{ 
                                                                    ...provided.draggableProps.style, 
                                                                    background: isBacklog ? 'var(--bg-elevated)' : (snapshot.isDragging ? 'var(--bg-body)' : p.bg),
                                                                    border: `1px solid ${isBacklog ? 'var(--border)' : p.border}`,
                                                                    borderRadius: '24px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px',
                                                                    boxShadow: snapshot.isDragging ? '0 10px 30px rgba(0,0,0,0.15)' : 'none'
                                                                }}
                                                            >
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                                    {!isBacklog && (
                                                                        <div {...provided.dragHandleProps} style={{ cursor: 'grab', color: p.text, display: 'flex', alignItems: 'center' }}><GripVertical size={20} /></div>
                                                                    )}
                                                                    <Tag size={18} style={{ color: isBacklog ? 'var(--text-muted)' : p.text }} />
                                                                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                                        <span style={{ fontWeight: 800, fontSize: '1.2rem', color: isBacklog ? 'var(--text-muted)' : p.text }}>{block.name}</span>
                                                                        <span style={{ fontSize: '0.85rem', fontWeight: 700, padding: '3px 10px', borderRadius: '10px', background: isBacklog ? 'var(--border)' : p.border, color: isBacklog ? 'var(--text-muted)' : p.text }}>{block.ideas.length}</span>
                                                                        {!isBacklog && <button onClick={() => handleOpenSprintModal(block.id)} style={{ background: 'transparent', border: 'none', color: p.text, opacity: 0.6, cursor: 'pointer' }}><Settings2 size={14} /></button>}
                                                                    </div>
                                                                    {!isBacklog && <button onClick={() => handleDeleteSprint(block.id, block.name)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><Trash2 size={16} /></button>}
                                                                </div>

                                                                <Droppable droppableId={String(block.id)} type="IDEA" direction="vertical">
                                                                    {(ideaProvided, ideaSnapshot) => (
                                                                        <div 
                                                                            ref={ideaProvided.innerRef} {...ideaProvided.droppableProps}
                                                                            style={{ 
                                                                                minHeight: '40px', background: ideaSnapshot.isDraggingOver ? 'rgba(0,0,0,0.03)' : 'transparent',
                                                                                borderRadius: '16px', padding: '10px', transition: 'background 0.2s'
                                                                            }}
                                                                        >
                                                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                                                                                {block.ideas.length === 0 && !ideaSnapshot.isDraggingOver ? (
                                                                                    <div style={{ gridColumn: '1/-1', padding: '20px', border: '1px dashed var(--border)', borderRadius: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Suelta ideas aquí.</div>
                                                                                ) : (
                                                                                    block.ideas.map((i, idx) => <IdeaCard key={i.id} idea={i} index={idx} />)
                                                                                )}
                                                                            </div>
                                                                            {ideaProvided.placeholder}
                                                                        </div>
                                                                    )}
                                                                </Droppable>
                                                            </div>
                                                        );
                                                    }}
                                                </Draggable>
                                            ))}
                                            {provided.placeholder}
                                        </div>
                                    )}
                                </Droppable>
                            </DragDropContext>
                        )
                    )}
                </div>
            )}

            {/* --- CALENDARIO & DIRECTORIO (Simplified in memory) --- */}
            {activeTab === 'calendario' && (
                <div className="tab-pane-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div style={{ background: 'var(--bg-elevated)', borderRadius: '24px', padding: '24px', border: '1px solid var(--border)', minHeight: '700px' }}>
                        <FullCalendar
                            ref={calendarRef} plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]} initialView="dayGridMonth" locale="es"
                            headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,listMonth' }}
                            events={calendarEvents} editable={true} eventDrop={handleEventDrop} height="auto"
                            eventClick={(info) => { setEditingEventId(info.event.id); setIsIdea(info.event.extendedProps.original.tipo === 'idea'); setModalEventOpen(true); }}
                        />
                    </div>
                </div>
            )}

            {activeTab === 'directorio' && (
                <div className="tab-pane-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                        {filteredProveedores.map(p => (
                            <div key={p.id} onClick={() => { setEditingProvId(p.id); setModalProvOpen(true); }} className="bento-card" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '20px', padding: '24px', cursor: 'pointer' }}>
                                <div style={{ fontWeight: 800, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '10px' }}><Store size={22} style={{ color: 'var(--accent)' }} />{p.nombre}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <ProveedorModal isOpen={modalProvOpen} onClose={() => setModalProvOpen(false)} proveedorId={editingProvId} onSaved={() => { setModalProvOpen(false); fetchData(); }} />
            <SprintModal isOpen={modalSprintOpen} onClose={() => setModalSprintOpen(false)} sprintId={editingSprintId} onSaved={() => { setModalSprintOpen(false); fetchData(); }} />
            <EventoProveedorModal isOpen={modalEventOpen} onClose={() => setModalEventOpen(false)} eventId={editingEventId} isIdea={isIdea} onSaved={() => { setModalEventOpen(false); fetchData(); }} proveedores={proveedores} sprints={sprints} />
        </div>
    );
}
