import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Plus, Search, Calendar as CalendarIcon, Phone, Store, User, CheckCircle2, Flame, MapPin, Coffee, Rocket, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';

import { ProveedorModal } from '../components/ui/ProveedorModal';
import { EventoProveedorModal } from '../components/ui/EventoProveedorModal';

const TYPE_COLORS = {
    pedido: "#8b5cf6", // Violet
    idea: "#eab308",   // Yellow
    plazo: "#ef4444",  // Red
    otro: "#64748b"    // Slate
};

export default function Proveedores() {
    const { empresaActiva } = useAuth();
    const [activeTab, setActiveTab] = useState('roadmap'); // 'directorio' | 'roadmap' | 'calendario'
    
    // Data State
    const [proveedores, setProveedores] = useState([]);
    const [filteredProveedores, setFilteredProveedores] = useState([]);
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchProv, setSearchProv] = useState('');
    
    // Roadmap Filtering State
    const [roadmapPriorityFilter, setRoadmapPriorityFilter] = useState('');
    const [roadmapDependencyFilter, setRoadmapDependencyFilter] = useState('');

    // Modals
    const [modalProvOpen, setModalProvOpen] = useState(false);
    const [editingProvId, setEditingProvId] = useState(null);

    const [modalEventOpen, setModalEventOpen] = useState(false);
    const [editingEventId, setEditingEventId] = useState(null);
    const [isIdea, setIsIdea] = useState(false);

    const calendarRef = useRef(null);

    const fetchData = async () => {
        if (!empresaActiva?.id) return;
        setLoading(true);
        // Load suppliers
        const { data: provData, error: provErr } = await supabase
            .from('proveedores')
            .select('*')
            .eq('empresa_id', empresaActiva.id)
            .eq('activo', true)
            .order('nombre');

        if (provErr) {
            toast.error("Error cargando proveedores");
            setLoading(false);
            return;
        }

        setProveedores(provData || []);
        applySearchProv(searchProv, provData || []);

        // Load events (including ideas with priorities and dependencies)
        const { data: eventData, error: eventErr } = await supabase
            .from('eventos_proveedores')
            .select(`*, proveedores(nombre)`)
            .eq('empresa_id', empresaActiva.id)
            .order('created_at', { ascending: false });

        if (eventErr) {
            toast.error("Error cargando eventos");
        } else {
            setEvents(eventData || []);
        }

        setLoading(false);
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [empresaActiva]);

    const applySearchProv = (term, list) => {
        const lower = term.toLowerCase();
        setFilteredProveedores(list.filter(p => p.nombre.toLowerCase().includes(lower)));
    };

    const handleSearchProvChange = (e) => {
        const term = e.target.value;
        setSearchProv(term);
        applySearchProv(term, proveedores);
    };

    // Calendar mapping
    // Un evento/idea va al calendario SIEMPRE Y CUANDO tenga `fecha_inicio` designada.
    const calendarEvents = events.filter(e => e.fecha_inicio).map(e => {
        let color = TYPE_COLORS[e.tipo] || "#64748b";
        const now = new Date();
        const end = e.fecha_fin ? new Date(e.fecha_fin) : null;
        let titlePrefix = "";

        if (e.estado === 'pendiente' && end && now > end) {
            color = "#b91c1c"; // Overdue
            titlePrefix = "⚠️ ";
        } else if (e.fecha_real_cierre && end && new Date(e.fecha_real_cierre) > end) {
            color = "#7c3aed"; // Was Delayed
            titlePrefix = "⏳ ";
        } else if (e.estado === 'completado') {
            color = "#22c55e"; // Done
            titlePrefix = "✅ ";
        }
        
        if (e.tipo === 'idea') {
            titlePrefix = "🚀 Lanzamiento: ";
            color = "#f59e0b"; // Naranja brillante para diferenciar de ideas en la lista
        }

        const provName = e.proveedores?.nombre || "General";

        return {
            id: e.id,
            title: `${titlePrefix}${provName} - ${e.titulo}`,
            start: e.fecha_inicio,
            end: e.fecha_fin,
            backgroundColor: color,
            borderColor: color,
            allDay: e.tipo === 'idea' && !e.fecha_fin, // Ideas suelen ser hitos de todo el día si no tienen fin explícito
            extendedProps: { original: e }
        };
    });

    const handleEventDrop = async (info) => {
        const evId = info.event.id;
        const newStart = info.event.start;
        const newEnd = info.event.end || newStart;

        const { error } = await supabase.from('eventos_proveedores').update({
            fecha_inicio: newStart.toISOString(),
            fecha_fin: newEnd ? newEnd.toISOString() : null
        }).eq('id', evId);

        if (error) {
            toast.error("Error al mover fecha");
            info.revert();
        } else {
            toast.success("Hito actualizado en el calendario");
            fetchData();
        }
    };

    // Data Processing for Roadmap
    const rawIdeas = events.filter(e => e.tipo === 'idea');
    
    // Apply Filters to Roadmap
    const filteredIdeas = rawIdeas.filter(idea => {
        let pMatch = true;
        let dMatch = true;
        if (roadmapPriorityFilter) {
            pMatch = idea.prioridad === roadmapPriorityFilter;
        }
        if (roadmapDependencyFilter) {
            const expectTrue = roadmapDependencyFilter === 'interna';
            dMatch = idea.depende_de_nosotros === expectTrue;
        }
        return pMatch && dMatch;
    });

    // Grouping for Roadmap by priority for natural display
    const highIdeas = filteredIdeas.filter(i => i.prioridad === 'alta');
    const medIdeas = filteredIdeas.filter(i => i.prioridad === 'media' || !i.prioridad);
    const lowIdeas = filteredIdeas.filter(i => i.prioridad === 'baja');

    const renderIdeaCard = (idea) => {
        const hasDate = !!idea.fecha_inicio;
        return (
            <div 
                key={idea.id} 
                className="roadmap-card" 
                onClick={() => { setIsIdea(true); setEditingEventId(idea.id); setModalEventOpen(true); }}
                style={{ background: 'var(--bg-body)', border: '1px solid var(--border)', borderRadius: '14px', padding: '16px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', gap: '10px' }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ fontWeight: 600, fontSize: '1rem', color: idea.estado === 'completado' ? 'var(--text-muted)' : 'var(--text)', textDecoration: idea.estado === 'completado' ? 'line-through' : 'none' }}>
                        {idea.estado === 'completado' && '✅ '}
                        {idea.titulo}
                    </div>
                    {hasDate && (
                        <div style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#d97706', padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Rocket size={12} /> {new Date(idea.fecha_inicio).toLocaleDateString()}
                        </div>
                    )}
                </div>

                {idea.descripcion && (
                    <div className="muted" style={{ fontSize: '0.85rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {idea.descripcion}
                    </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: idea.depende_de_nosotros ? '#3b82f6' : '#8b5cf6', background: idea.depende_de_nosotros ? 'rgba(59, 130, 246, 0.1)' : 'rgba(139, 92, 246, 0.1)', padding: '4px 8px', borderRadius: '8px', fontWeight: 600 }}>
                        {idea.depende_de_nosotros ? (
                            <>Resp: Nuestro Equipo</>
                        ) : (
                            <>Espera a: {idea.proveedores?.nombre || 'Proveedor Cero'}</>
                        )}
                    </div>
                    {idea.estado === 'completado' && <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--success)' }}>Completado</span>}
                </div>
            </div>
        );
    };

    return (
        <div className="container" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            {/* HEADER & TABS */}
            <header style={{ flexShrink: 0, paddingBottom: '16px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', gap: '16px' }}>
                    <div>
                        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, margin: '0 0 8px 0', letterSpacing: '-0.02em', background: 'linear-gradient(135deg, var(--text) 0%, var(--text-muted) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            Proveedores & Despliegues
                        </h1>
                        <p className="muted" style={{ margin: 0, fontSize: '1.1rem' }}>
                            Gestión de catálogo externo, mapa de rutas e hitos de lanzamiento.
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '12px', overflowX: 'auto' }}>
                    <button 
                        onClick={() => setActiveTab('roadmap')} 
                        style={{ padding: '10px 20px', borderRadius: '12px', background: activeTab === 'roadmap' ? 'var(--text)' : 'transparent', color: activeTab === 'roadmap' ? 'var(--bg)' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', border: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <MapPin size={18} /> Roadmap de Ideas
                    </button>
                    <button 
                        onClick={() => setActiveTab('calendario')} 
                        style={{ padding: '10px 20px', borderRadius: '12px', background: activeTab === 'calendario' ? 'var(--text)' : 'transparent', color: activeTab === 'calendario' ? 'var(--bg)' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', border: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <CalendarIcon size={18} /> Calendario Lógico
                    </button>
                    <button 
                        onClick={() => setActiveTab('directorio')} 
                        style={{ padding: '10px 20px', borderRadius: '12px', background: activeTab === 'directorio' ? 'var(--text)' : 'transparent', color: activeTab === 'directorio' ? 'var(--bg)' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', border: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <Store size={18} /> Directorio Contactos
                    </button>
                </div>
            </header>

            {/* TAB CONTENT */}
            <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '24px' }}>
                
                {/* ---------- ROADMAP TAB ---------- */}
                {activeTab === 'roadmap' && (
                    <div className="tab-pane-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', background: 'var(--bg-elevated)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border)', alignItems: 'center' }}>
                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600 }}>
                                    <Filter size={16} /> Filtros:
                                </div>
                                <select className="input premium-input" style={{ width: 'auto', minWidth: '160px', padding: '8px 12px' }} value={roadmapPriorityFilter} onChange={(e) => setRoadmapPriorityFilter(e.target.value)}>
                                    <option value="">Todas las Prioridades</option>
                                    <option value="alta">🔥 Solo Alta</option>
                                    <option value="media">⭐ Solo Media</option>
                                    <option value="baja">☕ Solo Baja</option>
                                </select>
                                <select className="input premium-input" style={{ width: 'auto', minWidth: '180px', padding: '8px 12px' }} value={roadmapDependencyFilter} onChange={(e) => setRoadmapDependencyFilter(e.target.value)}>
                                    <option value="">Dependencia Global</option>
                                    <option value="interna">Depende de Nosotros</option>
                                    <option value="externa">Esperando a Proveedor</option>
                                </select>
                            </div>
                            <Button variant="primary" onClick={() => { setIsIdea(true); setEditingEventId(null); setModalEventOpen(true); }} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Plus size={16} /> Registrar Idea / Hito
                            </Button>
                        </div>

                        {loading ? (
                            <div className="muted text-center" style={{ padding: '40px' }}>Indagando matriz de Roadmap...</div>
                        ) : filteredIdeas.length === 0 ? (
                            <div className="muted text-center" style={{ padding: '60px', background: 'var(--bg-elevated)', borderRadius: '24px', border: '1px dashed var(--border)' }}>
                                <Rocket size={48} style={{ opacity: 0.2, margin: '0 auto 16px' }} />
                                <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>No hay ideas o proyectos vigentes</div>
                                <div style={{ fontSize: '0.9rem', marginTop: '6px' }}>Crea tu primer hito para organizar la ruta corporativa.</div>
                            </div>
                        ) : (
                            <div className="roadmap-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px', alignItems: 'start' }}>
                                
                                {highIdeas.length > 0 && (
                                    <div style={{ background: '#fef2f2', border: '1px solid currentColor', color: '#ef4444', borderRadius: '24px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }} className="dark:bg-red-950 dark:border-red-900">
                                        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}><Flame size={20} /> Prioridad Alta</h3>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            {highIdeas.map(renderIdeaCard)}
                                        </div>
                                    </div>
                                )}
                                
                                {medIdeas.length > 0 && (
                                    <div style={{ background: '#f0f9ff', border: '1px solid currentColor', color: '#3b82f6', borderRadius: '24px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }} className="dark:bg-blue-950 dark:border-blue-900">
                                        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}><CheckCircle2 size={20} /> Prioridad Media</h3>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            {medIdeas.map(renderIdeaCard)}
                                        </div>
                                    </div>
                                )}

                                {lowIdeas.length > 0 && (
                                    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '24px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', color: 'var(--text-muted)' }}><Coffee size={20} /> Prioridad Baja / Backlog</h3>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            {lowIdeas.map(renderIdeaCard)}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* ---------- CALENDARIO TAB ---------- */}
                {activeTab === 'calendario' && (
                    <div className="tab-pane-fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', background: 'var(--bg-elevated)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border)' }}>
                            <Button variant="secondary" onClick={() => { setIsIdea(false); setEditingEventId(null); setModalEventOpen(true); }} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Plus size={16} /> Tarea o Fecha Límite Convencional
                            </Button>
                            <div className="muted" style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: 10, height: 10, background: '#f59e0b', borderRadius: '2px' }}></span> Lanzamiento</span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: 10, height: 10, background: '#8b5cf6', borderRadius: '50%' }}></span> Operativo</span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: 10, height: 10, background: '#ef4444', borderRadius: '50%' }}></span> Deadline Límite</span>
                            </div>
                        </div>

                        <div style={{ flex: 1, background: 'var(--bg-elevated)', borderRadius: '24px', padding: '24px', border: '1px solid var(--border)', minHeight: '600px' }}>
                            <FullCalendar
                                ref={calendarRef}
                                plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
                                initialView="dayGridMonth"
                                locale="es"
                                headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,listMonth' }}
                                events={calendarEvents}
                                editable={true}
                                eventClick={(info) => {
                                    setEditingEventId(info.event.id);
                                    setIsIdea(info.event.extendedProps.original.tipo === 'idea');
                                    setModalEventOpen(true);
                                }}
                                eventDrop={handleEventDrop}
                                height="100%"
                            />
                        </div>
                    </div>
                )}

                {/* ---------- DIRECTORIO TAB ---------- */}
                {activeTab === 'directorio' && (
                    <div className="tab-pane-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-elevated)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border)' }}>
                            <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
                                <Search size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input
                                    type="text"
                                    className="input premium-input"
                                    placeholder="Buscar empresa proveedora..."
                                    value={searchProv}
                                    onChange={handleSearchProvChange}
                                    style={{ paddingLeft: '44px', width: '100%' }}
                                />
                            </div>
                            <Button variant="primary" onClick={() => { setEditingProvId(null); setModalProvOpen(true); }} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Plus size={16} /> Empadronar Cuenta
                            </Button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                            {loading ? <div className="muted" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px' }}>Cargando catálogo...</div> :
                                filteredProveedores.length === 0 ? <div className="muted" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px' }}>No se hallaron resultados.</div> :
                                    filteredProveedores.map(p => (
                                        <div key={p.id} className="bento-card" onClick={() => { setEditingProvId(p.id); setModalProvOpen(true); }} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            <div style={{ fontWeight: 600, fontSize: '1.1rem', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <Store size={18} style={{ color: 'var(--accent)' }} />
                                                {p.nombre}
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                                                {p.contacto && <div className="muted" style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}><User size={14} /> {p.contacto}</div>}
                                                {p.telefono && <div className="muted" style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}><Phone size={14} /> {p.telefono}</div>}
                                            </div>
                                        </div>
                                    ))
                            }
                        </div>
                    </div>
                )}

            </div>

            <ProveedorModal
                isOpen={modalProvOpen}
                onClose={() => setModalProvOpen(false)}
                proveedorId={editingProvId}
                onSaved={() => { setModalProvOpen(false); fetchData(); }}
            />

            <EventoProveedorModal
                isOpen={modalEventOpen}
                onClose={() => setModalEventOpen(false)}
                eventId={editingEventId}
                isIdea={isIdea}
                onSaved={() => { setModalEventOpen(false); fetchData(); }}
                proveedores={proveedores}
                secciones={[]}
            />
        </div>
    );
}
