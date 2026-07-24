import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { Button } from '../components/ui/Button';
import { Plus, Search, Calendar as CalendarIcon, Phone, Store, User, CheckCircle2, Flame, MapPin, Coffee, Rocket, Filter, Layers, Tag, GripVertical, Settings2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

import { ProveedorModal } from '../components/ui/ProveedorModal';
import { EventoProveedorModal } from '../components/ui/EventoProveedorModal';
import { SprintModal } from '../components/ui/SprintModal';
import '../styles/proveedores.css';

const TYPE_COLORS: Record<string, string> = {
    pedido: "#0c0c0c",
    idea: "#eab308",
    plazo: "#ef4444",
    otro: "#64748b"
};

const SPRINT_PALETTES = [
    { bg: 'rgba(0,0,0,0.07)', border: 'rgba(0,0,0,0.25)', text: '#0c0c0c', header: 'rgba(0,0,0,0.10)' },
    { bg: 'rgba(20,184,166,0.07)', border: 'rgba(20,184,166,0.25)', text: '#14b8a6', header: 'rgba(20,184,166,0.10)' },
    { bg: 'rgba(245,158,11,0.07)', border: 'rgba(245,158,11,0.25)', text: '#d97706', header: 'rgba(245,158,11,0.10)' },
    { bg: 'rgba(236,72,153,0.07)', border: 'rgba(236,72,153,0.25)', text: '#ec4899', header: 'rgba(236,72,153,0.10)' },
    { bg: 'rgba(59,130,246,0.07)', border: 'rgba(59,130,246,0.25)', text: '#3b82f6', header: 'rgba(59,130,246,0.10)' },
    { bg: 'rgba(0,0,0,0.05)', border: 'rgba(0,0,0,0.2)', text: '#0c0c0c', header: 'rgba(0,0,0,0.1)' },
];

interface Proveedor {
    id: number;
    nombre: string;
    rubro?: string;
    contacto?: string;
    telefono?: string;
    notes?: string;
    notas?: string;
    activo: boolean;
    empresa_id: string;
}

interface Sprint {
    id: string;
    nombre: string;
    orden: number;
    empresa_id: string;
}

interface EventoProveedor {
    id: number;
    proveedor_id?: number | null;
    tipo: string;
    sprint_id?: string | null;
    seccion?: string | null;
    titulo: string;
    fecha_inicio?: string | null;
    fecha_fin?: string | null;
    fecha_real_cierre?: string | null;
    estado: string;
    descripcion?: string | null;
    prioridad?: string;
    depende_de_nosotros?: boolean;
    empresa_id: string;
    proveedores?: {
        nombre: string;
    } | null;
}

export default function Proveedores() {
    const { t } = useTranslation();
    const { empresaActiva, isDemoMode } = useAuth();
    const askConfirm = useConfirm();
    const [activeTab, setActiveTab] = useState('roadmap');

    // Data states
    const [proveedores, setProveedores] = useState<Proveedor[]>([]);
    const [filteredProveedores, setFilteredProveedores] = useState<Proveedor[]>([]);
    const [events, setEvents] = useState<EventoProveedor[]>([]);
    const [sprints, setSprints] = useState<Sprint[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchProv, setSearchProv] = useState('');

    // Roadmap Filters
    const [roadmapPriorityFilter, setRoadmapPriorityFilter] = useState('');
    const [roadmapDependencyFilter, setRoadmapDependencyFilter] = useState('');
    const [roadmapTypeFilter, setRoadmapTypeFilter] = useState('');
    const [roadmapGroupBy, setRoadmapGroupBy] = useState('sprint');

    // Modals
    const [modalProvOpen, setModalProvOpen] = useState(false);
    const [editingProvId, setEditingProvId] = useState<number | null>(null);
    const [modalEventOpen, setModalEventOpen] = useState(false);
    const [editingEventId, setEditingEventId] = useState<number | null>(null);
    const [modalSprintOpen, setModalSprintOpen] = useState(false);
    const [editingSprintId, setEditingSprintId] = useState<string | null>(null);
    const [isIdea, setIsIdea] = useState(false);

    const calendarRef = useRef(null);

    const fetchData = async () => {
        if (!empresaActiva?.id) return;
        setLoading(true);

        const [provRes, sprintRes, eventRes] = await Promise.all([
            supabase.from('proveedores').select('*').eq('empresa_id', empresaActiva.id).eq('activo', true).order('nombre'),
            supabase.from('proveedor_sprints').select('*').eq('empresa_id', empresaActiva.id).order('orden', { ascending: true }),
            supabase.from('eventos_proveedores').select(`*, proveedores(nombre)`).eq('empresa_id', empresaActiva.id).order('orden', { ascending: true })
        ]);

        if (provRes.error) toast.error(t('providers.toast.load_error'));
        if (sprintRes.error) console.error("Error sprints:", sprintRes.error);
        if (eventRes.error) toast.error(t('providers.toast.events_error'));

        setProveedores((provRes.data as unknown as Proveedor[]) || []);
        applySearchProv(searchProv, (provRes.data as unknown as Proveedor[]) || []);
        setSprints((sprintRes.data as unknown as Sprint[]) || []);
        setEvents((eventRes.data as unknown as EventoProveedor[]) || []);

        setLoading(false);
    };

    useEffect(() => { fetchData(); }, [empresaActiva]);

    const applySearchProv = (term: string, list: Proveedor[]) => {
        const lower = term.toLowerCase();
        setFilteredProveedores(list.filter(p => p.nombre.toLowerCase().includes(lower)));
    };

    const handleSearchProvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const term = e.target.value;
        setSearchProv(term);
        applySearchProv(term, proveedores);
    };

    // --- Calendar logic ---
    const calendarEvents = events.filter(e => e.fecha_inicio).map(e => {
        let color = TYPE_COLORS[e.tipo] || "#64748b";
        const now = new Date();
        const end = e.fecha_fin ? new Date(e.fecha_fin) : null;
        let titlePrefix = "";
        if (e.estado === 'pendiente' && end && now > end) { color = "#b91c1c"; titlePrefix = "⚠️ "; }
        else if (e.fecha_real_cierre && end && new Date(e.fecha_real_cierre) > end) { color = "#0c0c0c"; titlePrefix = "⏳ "; }
        else if (e.estado === 'completado') { color = "#22c55e"; titlePrefix = "✅ "; }
        if (e.tipo === 'idea') { titlePrefix = "🚀 Lanzamiento: "; color = "#f59e0b"; }
        return {
            id: String(e.id), title: `${titlePrefix}${e.proveedores?.nombre || "General"} - ${e.titulo}`,
            start: e.fecha_inicio as string, end: e.fecha_fin as string,
            backgroundColor: color, borderColor: color,
            allDay: e.tipo === 'idea' && !e.fecha_fin,
            extendedProps: { original: e }
        };
    });

    const handleEventDrop = async (info: any) => {
        const { error } = await supabase.from('eventos_proveedores').update({
            fecha_inicio: info.event.start.toISOString(),
            fecha_fin: info.event.end ? info.event.end.toISOString() : null
        }).eq('id', info.event.id);
        if (error) { toast.error(t('providers.toast.move_date_error')); info.revert(); }
        else { toast.success(t('providers.toast.milestone_updated')); fetchData(); }
    };

    // --- Roadmap logic ---
    const filteredEvents = events.filter(item => {
        if (roadmapTypeFilter && item.tipo !== roadmapTypeFilter) return false;
        if (roadmapPriorityFilter && item.prioridad !== roadmapPriorityFilter) return false;
        if (roadmapDependencyFilter) {
            const expectTrue = roadmapDependencyFilter === 'interna';
            if (item.depende_de_nosotros !== expectTrue) return false;
        }
        return true;
    });

    const priorityCols = [
        { key: 'alta', label: t('providers.priority_high'), icon: <Flame size={17} />, ideas: filteredEvents.filter(i => i.prioridad === 'alta'), bg: '#fef2f2', border: '#fecaca', color: '#ef4444' },
        { key: 'media', label: t('providers.priority_medium'), icon: <CheckCircle2 size={17} />, ideas: filteredEvents.filter(i => i.prioridad === 'media' || !i.prioridad), bg: '#f0f9ff', border: '#bae6fd', color: '#3b82f6' },
        { key: 'baja', label: t('providers.priority_low'), icon: <Coffee size={17} />, ideas: filteredEvents.filter(i => i.prioridad === 'baja'), bg: 'var(--bg-elevated)', border: 'var(--border)', color: 'var(--text-muted)' },
    ].filter(c => c.ideas.length > 0);

    const sprintBlocks = [
        ...sprints.map(s => ({ id: s.id, name: s.nombre, ideas: filteredEvents.filter(i => String(i.sprint_id) === String(s.id)) })),
        { id: '__backlog__', name: 'Sin Sprint / Sueltos', ideas: filteredEvents.filter(i => !i.sprint_id) }
    ].filter(b => b.id === '__backlog__' ? b.ideas.length > 0 : true);

    const onDragEnd = async (result: DropResult) => {
        const { destination, source, draggableId, type } = result;
        if (!destination || !empresaActiva?.id) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        // --- REORDER SPRINTS ---
        if (type === 'SPRINT') {
            const items = Array.from(sprints);
            const [reorderedItem] = items.splice(source.index, 1);
            items.splice(destination.index, 0, reorderedItem);
            setSprints(items);
            const updates = items.map((item, index) => ({ id: item.id, empresa_id: empresaActiva.id, nombre: item.nombre, orden: index }));
            const { error } = await supabase.from('proveedor_sprints').upsert(updates);
            if (error) { toast.error(t('providers.toast.save_order_error')); fetchData(); }
            else { toast.success(t('providers.toast.order_saved')); }
            return;
        }

        // --- MOVE / REORDER IDEAS ---
        if (type === 'IDEA') {
            const ideaId = draggableId;
            const sourceSprintId = source.droppableId;
            const destSprintId = destination.droppableId;
            
            // Get ideas for relevant sprints
            const sourceSprintIdeas = sprintBlocks.find(b => String(b.id) === String(sourceSprintId))?.ideas || [];
            const destSprintIdeas = sourceSprintId === destSprintId 
                ? sourceSprintIdeas 
                : (sprintBlocks.find(b => String(b.id) === String(destSprintId))?.ideas || []);

            // Perform movement
            const newSourceIdeas = Array.from(sourceSprintIdeas);
            const [movedIdea] = newSourceIdeas.splice(source.index, 1);
            
            let finalDestIdeas: EventoProveedor[];
            if (sourceSprintId === destSprintId) {
                newSourceIdeas.splice(destination.index, 0, movedIdea);
                finalDestIdeas = newSourceIdeas;
            } else {
                const newDestIdeas = Array.from(destSprintIdeas);
                newDestIdeas.splice(destination.index, 0, { ...movedIdea, sprint_id: destSprintId === '__backlog__' ? null : destSprintId });
                finalDestIdeas = newDestIdeas;
            }

            // Optimistic update
            setEvents(prev => {
                return prev.map(e => {
                    if (String(e.id) === String(ideaId)) {
                        return { ...e, sprint_id: destSprintId === '__backlog__' ? null : destSprintId };
                    }
                    return e;
                });
            });

            // Persist to Supabase
            // We MUST remove joined objects (proveedores) before upserting, 
            // otherwise Supabase returns a 400 error thinking "proveedores" is a column.
            const cleanUpdates = finalDestIdeas.map((idea, index) => {
                const { proveedores, ...cleanIdea } = idea;
                return {
                    ...cleanIdea,
                    orden: index,
                    sprint_id: destSprintId === '__backlog__' ? null : destSprintId
                };
            });

            const { error } = await supabase.from('eventos_proveedores').upsert(cleanUpdates);

            if (error) { toast.error("Error al mover idea"); fetchData(); }
            else { toast.success("Idea reordenada"); fetchData(); }
        }
    };

    const handleOpenSprintModal = (id: string | null = null) => { setEditingSprintId(id); setModalSprintOpen(true); };
    
    const handleDeleteSprint = async (id: string, name: string) => {
        const confirmed = await askConfirm({
            title: t('providers.delete_sprint_title', { defaultValue: 'Eliminar Sprint' }),
            message: t('providers.confirm_delete_sprint', { name }),
            confirmText: t('common.actions.delete', { defaultValue: 'Eliminar' }),
            cancelText: t('common.actions.cancel', { defaultValue: 'Cancelar' }),
            variant: 'danger'
        });
        if (!confirmed) return;

        const { error } = await supabase.from('proveedor_sprints').delete().eq('id', id);
        if (error) toast.error(t('providers.toast.delete_error')); else { toast.success(t('providers.toast.delete_success')); fetchData(); }
    };

    // --- Component Renderer for Idea Cards ---
    // --- Component Renderer for Idea Cards ---
    const IdeaCard = ({ idea, index, isDraggable = true }: { idea: EventoProveedor; index: number; isDraggable?: boolean }) => {
        const badge = { 
            alta: ['🔥 Alta', '#ef4444', 'rgba(239,68,68,0.1)'], 
            media: ['⭐ Media', '#3b82f6', 'rgba(59,130,246,0.1)'], 
            baja: ['☕ Baja', '#64748b', 'rgba(100,116,139,0.1)'] 
        }[idea.prioridad || 'media'] || ['⭐ Media', '#3b82f6', 'rgba(59,130,246,0.1)'];

        const typeBadge = {
            pedido: ['📦 Pedido', '#0c0c0c', 'rgba(0,0,0,0.08)'],
            idea: ['💡 Idea', '#d97706', 'rgba(245,158,11,0.12)'],
            plazo: ['⏰ Plazo', '#ef4444', 'rgba(239,68,68,0.1)'],
            otro: ['📌 Otro', '#64748b', 'rgba(100,116,139,0.1)']
        }[idea.tipo] || ['📦 Pedido', '#0c0c0c', 'rgba(0,0,0,0.08)'];

        const content = (provided?: any, snapshot?: any) => (
            <div 
                ref={provided?.innerRef}
                {...(provided?.draggableProps || {})}
                {...(provided?.dragHandleProps || {})}
                onClick={() => { setIsIdea(idea.tipo === 'idea'); setEditingEventId(idea.id); setModalEventOpen(true); }}
                className="proveedores-idea-card"
                style={{ 
                    ...(provided?.draggableProps?.style || {}),
                    background: snapshot?.isDragging ? 'var(--bg-active)' : 'var(--bg-body)', 
                    boxShadow: snapshot?.isDragging ? '0 10px 25px rgba(0,0,0,0.2)' : 'none'
                }}
            >
                <div className="proveedores-idea-card-header">
                    <div className="proveedores-idea-card-title" style={{ color: idea.estado === 'completado' ? 'var(--text-muted)' : 'var(--text)', textDecoration: idea.estado === 'completado' ? 'line-through' : 'none' }}>
                        {idea.estado === 'completado' && '✅ '}{idea.titulo}
                    </div>
                </div>
                {idea.descripcion && (
                    <div className="proveedores-idea-card-desc">
                        {idea.descripcion}
                    </div>
                )}
                <div className="proveedores-idea-card-badges">
                    <span className="proveedores-idea-card-badge" style={{ background: typeBadge[2], color: typeBadge[1], fontWeight: 600 }}>{typeBadge[0]}</span>
                    {idea.tipo === 'idea' && (
                        <span className="proveedores-idea-card-badge" style={{ background: badge[2], color: badge[1] }}>{badge[0]}</span>
                    )}
                    <span className="proveedores-idea-card-badge" style={{ background: idea.depende_de_nosotros ? 'var(--accent-soft)' : 'rgba(0,0,0,0.05)', color: idea.depende_de_nosotros ? 'var(--accent)' : '#0c0c0c' }}>
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

    return (
        <div className="container proveedores-container">
            {/* Header stays same */}
            <header className="proveedores-header">
                <div>
                    <h1 className="proveedores-title">
                        {t('providers.title')}
                    </h1>
                    <p className="muted proveedores-subtitle">{t('providers.subtitle')}</p>
                </div>
                <div className="proveedores-tabs-header">
                    <button onClick={() => setActiveTab('roadmap')} className={`proveedores-roadmap-group-btn ${activeTab === 'roadmap' ? 'active' : ''}`} style={{ padding: '10px 20px', borderRadius: '12px' }}><MapPin size={18} /> {t('providers.roadmap')}</button>
                    <button onClick={() => setActiveTab('calendario')} className={`proveedores-roadmap-group-btn ${activeTab === 'calendario' ? 'active' : ''}`} style={{ padding: '10px 20px', borderRadius: '12px' }}><CalendarIcon size={18} /> {t('providers.calendar')}</button>
                    <button onClick={() => setActiveTab('directorio')} className={`proveedores-roadmap-group-btn ${activeTab === 'directorio' ? 'active' : ''}`} style={{ padding: '10px 20px', borderRadius: '12px' }}><Store size={18} /> {t('providers.directory')}</button>
                </div>
            </header>

            {activeTab === 'roadmap' && (
                <div className="tab-pane-fade-in proveedores-tab-pane-roadmap">
                    {/* Toolbar stays same */}
                    <div className="proveedores-roadmap-header">
                        <div className="proveedores-roadmap-selectors">
                            <div className="proveedores-roadmap-group-box">
                                <button onClick={() => setRoadmapGroupBy('sprint')} className={`proveedores-roadmap-group-btn ${roadmapGroupBy === 'sprint' ? 'active' : ''}`}><Layers size={14} /> {t('providers.sprints')}</button>
                                <button onClick={() => setRoadmapGroupBy('prioridad')} className={`proveedores-roadmap-group-btn ${roadmapGroupBy === 'prioridad' ? 'active' : ''}`}><Flame size={14} /> {t('providers.priority')}</button>
                            </div>
                            <div className="proveedores-roadmap-buttons">
                                <Button variant="secondary" onClick={() => handleOpenSprintModal()} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Settings2 size={16} /> {t('providers.new_sprint')}</Button>
                                <Button variant="primary" onClick={() => { setIsIdea(true); setEditingEventId(null); setModalEventOpen(true); }} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Plus size={18} /> {t('providers.new_idea')}</Button>
                            </div>
                        </div>
                        <div className="proveedores-roadmap-filters">
                            <span className="proveedores-roadmap-filter-label"><Filter size={14} /> {t('providers.filter_by')}</span>
                            <select className="input" style={{ width: 'auto', minWidth: '150px' }} value={roadmapTypeFilter} onChange={e => setRoadmapTypeFilter(e.target.value)}>
                                <option value="">Todos los tipos</option>
                                <option value="pedido">📦 Pedidos</option>
                                <option value="idea">💡 Ideas</option>
                                <option value="plazo">⏰ Plazos</option>
                                <option value="otro">📌 Otros</option>
                            </select>
                            <select className="input" style={{ width: 'auto', minWidth: '180px' }} value={roadmapPriorityFilter} onChange={e => setRoadmapPriorityFilter(e.target.value)}>
                                <option value="">{t('providers.all_priorities')}</option>
                                <option value="alta">{t('providers.priority_high')}</option><option value="media">{t('providers.priority_medium')}</option><option value="baja">{t('providers.priority_low')}</option>
                            </select>
                            <select className="input" style={{ width: 'auto', minWidth: '200px' }} value={roadmapDependencyFilter} onChange={e => setRoadmapDependencyFilter(e.target.value)}>
                                <option value="">{t('providers.dep_global')}</option><option value="interna">{t('providers.dep_internal')}</option><option value="externa">{t('providers.dep_external')}</option>
                            </select>
                        </div>
                    </div>

                    {loading ? <div className="muted text-center" style={{ padding: '60px' }}>{t('common.loading')}</div> : (
                        roadmapGroupBy === 'prioridad' ? (
                            <div className="proveedores-roadmap-board">
                                {priorityCols.map(col => (
                                    <div key={col.key} className="proveedores-roadmap-column">
                                        <div className="proveedores-roadmap-column-header">
                                            <span style={{ color: col.color }} className="proveedores-roadmap-column-icon">{col.icon}</span>
                                            <span className="proveedores-roadmap-column-title" style={{ color: col.color }}>{col.label}</span>
                                            <span className="proveedores-roadmap-column-badge" style={{ background: col.bg, color: col.color }}>{col.ideas.length}</span>
                                        </div>
                                        <div className="proveedores-roadmap-column-ideas">{col.ideas.map((i, idx) => <IdeaCard key={i.id} idea={i} index={idx} isDraggable={false} />)}</div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <DragDropContext onDragEnd={onDragEnd}>
                                <Droppable droppableId="sprints-outer" type="SPRINT" direction="vertical">
                                    {(provided) => (
                                        <div {...provided.droppableProps} ref={provided.innerRef} className="proveedores-sprints-list">
                                            {sprintBlocks.map((block, index) => (
                                                <Draggable key={String(block.id)} draggableId={String(block.id)} index={index} isDragDisabled={block.id === '__backlog__'}>
                                                    {(provided, snapshot) => {
                                                        const p = SPRINT_PALETTES[index % SPRINT_PALETTES.length] || SPRINT_PALETTES[0];
                                                        const isBacklog = block.id === '__backlog__';
                                                        return (
                                                            <div 
                                                                ref={provided.innerRef} {...provided.draggableProps} 
                                                                className="proveedores-sprint-card"
                                                                style={{ 
                                                                    ...provided.draggableProps.style, 
                                                                    background: isBacklog ? 'var(--bg-elevated)' : (snapshot.isDragging ? 'var(--bg-body)' : p.bg),
                                                                    borderColor: isBacklog ? 'var(--border)' : p.border,
                                                                    boxShadow: snapshot.isDragging ? '0 10px 30px rgba(0,0,0,0.15)' : 'none'
                                                                }}
                                                            >
                                                                <div className="proveedores-sprint-header">
                                                                    {!isBacklog && (
                                                                        <div {...provided.dragHandleProps} className="proveedores-sprint-drag-handle" style={{ color: p.text }}><GripVertical size={20} /></div>
                                                                    )}
                                                                    <Tag size={18} className="proveedores-sprint-icon" style={{ color: isBacklog ? 'var(--text-muted)' : p.text }} />
                                                                    <div className="proveedores-sprint-title-box">
                                                                        <span className="proveedores-sprint-title" style={{ color: isBacklog ? 'var(--text-muted)' : p.text }}>{block.name}</span>
                                                                        <span className="proveedores-sprint-badge" style={{ background: isBacklog ? 'var(--border)' : p.border, color: isBacklog ? 'var(--text-muted)' : p.text }}>{block.ideas.length}</span>
                                                                        {!isBacklog && <button onClick={() => handleOpenSprintModal(block.id)} className="proveedores-sprint-settings-btn" style={{ color: p.text }}><Settings2 size={14} /></button>}
                                                                    </div>
                                                                    {!isBacklog && <button onClick={() => handleDeleteSprint(block.id, block.name)} className="proveedores-sprint-delete-btn"><Trash2 size={16} /></button>}
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
                                                                            <div className="proveedores-sprint-body">
                                                                                {block.ideas.length === 0 && !ideaSnapshot.isDraggingOver ? (
                                                                                    <div className="proveedores-sprint-empty">{t('providers.drop_ideas_here')}</div>
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
            {activeTab === 'calendario' && (
                <div className="tab-pane-fade-in card-premium proveedores-tab-pane-mantenimiento">
                    <FullCalendar
                        ref={calendarRef}
                        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
                        initialView="dayGridMonth"
                        headerToolbar={{
                            left: 'prev,next today',
                            center: 'title',
                            right: 'dayGridMonth,timeGridWeek,listWeek'
                        }}
                        events={calendarEvents}
                        editable={true}
                        selectable={true}
                        eventClick={(info) => {
                            setEditingEventId(Number(info.event.id));
                            setIsIdea(info.event.extendedProps.original.tipo === 'idea');
                            setModalEventOpen(true);
                        }}
                        eventDrop={handleEventDrop}
                        height="auto"
                        locale={t('common.language_code') || 'es'}
                    />
                </div>
            )}

            {activeTab === 'directorio' && (
                <div className="tab-pane-fade-in proveedores-tab-pane-list">
                    <div className="proveedores-list-header">
                        <div className="proveedores-list-search-wrapper">
                            <Search size={18} className="proveedores-list-search-icon" />
                            <input
                                type="text"
                                className="input proveedores-list-search-input"
                                placeholder="Buscar proveedor por nombre..."
                                value={searchProv}
                                onChange={handleSearchProvChange}
                                style={{ width: '100%', height: '46px', borderRadius: '14px' }}
                            />
                        </div>
                        <Button variant="primary" onClick={() => { setEditingProvId(null); setModalProvOpen(true); }} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Plus size={18} /> {t('providers.new_provider')}
                        </Button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
                        {filteredProveedores.length === 0 ? (
                            <div className="muted" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px' }}>
                                {t('providers.no_providers')}
                            </div>
                        ) : (
                            filteredProveedores.map(prov => (
                                <div key={prov.id} className="card-premium" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '20px', position: 'relative' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <h3 style={{ margin: '0 0 4px 0', fontSize: '1.15rem', color: 'var(--text)' }}>{prov.nombre}</h3>
                                            <span style={{ fontSize: '0.8rem', fontWeight: 700, padding: '3px 10px', borderRadius: '8px', background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>{prov.rubro || t('providers.no_rubro')}</span>
                                        </div>
                                        <button onClick={() => { setEditingProvId(prov.id); setModalProvOpen(true); }} className="btn-icon" style={{ background: 'var(--bg-body)', border: '1px solid var(--border)', padding: '8px', borderRadius: '10px', color: 'var(--text-muted)' }}>
                                            <Settings2 size={16} />
                                        </button>
                                    </div>
                                    
                                    <div style={{ display: 'grid', gap: '8px', marginTop: '4px' }}>
                                        {prov.contacto && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                                <User size={15} /> {prov.contacto}
                                            </div>
                                        )}
                                        {prov.telefono && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', color: 'var(--accent)', fontWeight: 600 }}>
                                                <Phone size={15} /> {prov.telefono}
                                            </div>
                                        )}
                                    </div>

                                    {prov.notas && (
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', background: 'var(--bg-body)', padding: '12px', borderRadius: '12px', marginTop: '4px', border: '1px solid var(--border)' }}>
                                            {prov.notas}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            <ProveedorModal isOpen={modalProvOpen} onClose={() => setModalProvOpen(false)} proveedorId={editingProvId} onSaved={() => { setModalProvOpen(false); fetchData(); }} />
            <SprintModal isOpen={modalSprintOpen} onClose={() => setModalSprintOpen(false)} sprintId={editingSprintId} onSaved={() => { setModalSprintOpen(false); fetchData(); }} />
            <EventoProveedorModal isOpen={modalEventOpen} onClose={() => setModalEventOpen(false)} eventId={editingEventId} isIdea={isIdea} onSaved={() => { setModalEventOpen(false); fetchData(); }} proveedores={proveedores} sprints={sprints} />
        </div>
    );
}
