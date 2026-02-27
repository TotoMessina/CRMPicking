import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { Plus, Search, Calendar as CalendarIcon, Package, Phone, User, Store } from 'lucide-react';
import toast from 'react-hot-toast';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';

import { ProveedorModal } from '../components/ui/ProveedorModal';
import { EventoProveedorModal } from '../components/ui/EventoProveedorModal';

const TYPE_COLORS = {
    pedido: "#3b82f6", // Blue
    idea: "#eab308",   // Yellow
    plazo: "#ef4444",  // Red
    otro: "#64748b"    // Slate
};

export default function Proveedores() {
    const [proveedores, setProveedores] = useState([]);
    const [filteredProveedores, setFilteredProveedores] = useState([]);
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const [modalProvOpen, setModalProvOpen] = useState(false);
    const [editingProvId, setEditingProvId] = useState(null);

    const [modalEventOpen, setModalEventOpen] = useState(false);
    const [editingEventId, setEditingEventId] = useState(null);
    const [isIdea, setIsIdea] = useState(false);

    const calendarRef = useRef(null);

    const fetchData = async () => {
        setLoading(true);
        // Load suppliers
        const { data: provData, error: provErr } = await supabase
            .from('proveedores')
            .select('*')
            .eq('activo', true)
            .order('nombre');

        if (provErr) {
            toast.error("Error cargando proveedores");
            setLoading(false);
            return;
        }

        setProveedores(provData || []);
        applySearch(search, provData || []);

        // Load events
        const { data: eventData, error: eventErr } = await supabase
            .from('eventos_proveedores')
            .select(`*, proveedores(nombre)`);

        if (eventErr) {
            toast.error("Error cargando eventos");
        } else {
            setEvents(eventData || []);
        }

        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const applySearch = (term, list) => {
        const lower = term.toLowerCase();
        setFilteredProveedores(list.filter(p => p.nombre.toLowerCase().includes(lower)));
    };

    const handleSearchChange = (e) => {
        const term = e.target.value;
        setSearch(term);
        applySearch(term, proveedores);
    };

    // Calendar mapping
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

        const provName = e.proveedores?.nombre || "Sin Prov.";

        return {
            id: e.id,
            title: `${titlePrefix}${provName}: ${e.titulo}`,
            start: e.fecha_inicio,
            end: e.fecha_fin,
            backgroundColor: color,
            borderColor: color,
            extendedProps: { original: e }
        };
    });

    // Ideas Board
    const ideas = events.filter(e => !e.fecha_inicio);
    const groupedIdeas = {};
    ideas.forEach(e => {
        const sec = e.seccion || "General";
        if (!groupedIdeas[sec]) groupedIdeas[sec] = [];
        groupedIdeas[sec].push(e);
    });
    const sortedSections = Object.keys(groupedIdeas).sort();

    // Unique sections for Datalist
    const allSections = [...new Set(events.map(e => e.seccion).filter(s => !!s))].sort();

    const handleEventDrop = async (info) => {
        const evId = info.event.id;
        const newStart = info.event.start;
        const newEnd = info.event.end || newStart;

        const { error } = await supabase.from('eventos_proveedores').update({
            fecha_inicio: newStart.toISOString(),
            fecha_fin: newEnd ? newEnd.toISOString() : null
        }).eq('id', evId);

        if (error) {
            toast.error("Error al mover evento");
            info.revert();
        } else {
            toast.success("Evento actualizado");
            fetchData();
        }
    };

    return (
        <div className="container" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            <header style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', gap: '16px', flexShrink: 0 }}>
                <div>
                    <h1 style={{ fontSize: '2.2rem', fontWeight: 800, margin: '0 0 8px 0', letterSpacing: '-0.02em', background: 'linear-gradient(135deg, var(--text) 0%, var(--text-muted) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Gestión de Proveedores
                    </h1>
                    <p className="muted" style={{ margin: 0, fontSize: '1.1rem' }}>
                        Seguimiento de pedidos, plazos e ideas del circuito de compras.
                    </p>
                </div>
            </header>

            <div className="proveedores-layout">

                {/* SIDEBAR: Lista Proveedores */}
                <aside className="proveedores-sidebar" style={{ background: 'var(--bg-elevated)', borderRadius: '24px', padding: '20px', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 4px 24px -10px rgba(0, 0, 0, 0.08)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Directorio</h3>
                        <button className="btn-mini btn-primario" onClick={() => { setEditingProvId(null); setModalProvOpen(true); }} style={{ borderRadius: '50%', width: '32px', height: '32px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus size={16} /></button>
                    </div>

                    <div style={{ position: 'relative', marginBottom: '16px' }}>
                        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            className="input"
                            placeholder="Buscar proveedor..."
                            value={search}
                            onChange={handleSearchChange}
                            style={{
                                paddingLeft: '36px',
                                background: 'var(--bg)',
                                border: '1px solid var(--border)',
                                borderRadius: '12px'
                            }}
                        />
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }}>
                        {loading && proveedores.length === 0 ? <div className="muted text-center" style={{ padding: '20px' }}>Cargando...</div> :
                            filteredProveedores.length === 0 ? <div className="muted text-center" style={{ padding: '20px' }}>No hay proveedores.</div> :
                                filteredProveedores.map(p => (
                                    <div key={p.id} className="prov-item bento-card" onClick={() => { setEditingProvId(p.id); setModalProvOpen(true); }} style={{ background: 'var(--bg)', padding: '16px', borderRadius: '12px', cursor: 'pointer', border: '1px solid transparent', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Store size={14} style={{ color: 'var(--text-muted)' }} />
                                            {p.nombre}
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            {p.contacto && <div className="muted" style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}><User size={12} /> {p.contacto}</div>}
                                            {p.telefono && <div className="muted" style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}><Phone size={12} /> {p.telefono}</div>}
                                        </div>
                                    </div>
                                ))}
                    </div>
                </aside>

                {/* CENTER: CALENDAR */}
                <section className="proveedores-center">
                    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', alignItems: 'center' }}>
                            <Button variant="secondary" onClick={() => { setIsIdea(false); setEditingEventId(null); setModalEventOpen(true); }} className="btn-text-hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '12px' }}>
                                <CalendarIcon size={16} /> <span>Agregar Pedido / Evento</span>
                            </Button>
                            <div className="muted" style={{ fontSize: '0.85rem', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-elevated)', padding: '6px 12px', borderRadius: '100px', border: '1px solid var(--border)' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ width: 10, height: 10, background: '#3b82f6', borderRadius: '50%' }}></span> Pedido
                                </span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ width: 10, height: 10, background: '#ef4444', borderRadius: '50%' }}></span> Plazo / Límite
                                </span>
                            </div>
                        </div>

                        <div style={{ flex: 1, background: 'var(--bg-elevated)', borderRadius: '24px', padding: '24px', border: '1px solid var(--border)', overflow: 'auto', boxShadow: '0 4px 24px -10px rgba(0, 0, 0, 0.08)' }}>
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
                </section>

                {/* RIGHT: IDEAS BOARD */}
                <aside className="proveedores-right" style={{ background: 'var(--bg-elevated)', borderRadius: '24px', padding: '20px', border: '1px solid var(--border)', boxShadow: '0 4px 24px -10px rgba(0, 0, 0, 0.08)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', height: '38px' }}>
                        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>Ideas / Pendientes</h3>
                        <button className="btn-mini btn-primario" onClick={() => { setIsIdea(true); setEditingEventId(null); setModalEventOpen(true); }} style={{ borderRadius: '50%', width: '32px', height: '32px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus size={16} /></button>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingRight: '4px' }}>
                        {loading ? <div className="muted text-center" style={{ padding: '20px' }}>Cargando ideas...</div> :
                            ideas.length === 0 ? <div className="muted text-center" style={{ padding: '20px', fontStyle: 'italic' }}>No hay ideas pendientes.</div> :
                                sortedSections.map(sectionTitle => (
                                    <div key={sectionTitle} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, paddingBottom: '4px', borderBottom: '1px solid var(--border)', marginTop: '8px' }}>
                                            {sectionTitle}
                                        </div>
                                        {groupedIdeas[sectionTitle].map(idea => {
                                            const color = TYPE_COLORS[idea.tipo] || "#eab308";
                                            return (
                                                <div key={idea.id} className="bento-card" onClick={() => { setIsIdea(true); setEditingEventId(idea.id); setModalEventOpen(true); }} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', cursor: 'pointer', transition: 'all 0.15s ease', display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative', overflow: 'hidden' }}>
                                                    <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '4px', background: color, opacity: 0.8 }} />
                                                    <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text)', paddingLeft: '4px' }}>
                                                        {idea.estado === 'completado' && '✅ '}
                                                        {idea.estado === 'cancelado' && '❌ '}
                                                        {idea.titulo}
                                                    </div>
                                                    {idea.proveedores?.nombre && (
                                                        <div className="muted" style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', paddingLeft: '4px' }}>
                                                            <Store size={12} /> {idea.proveedores.nombre}
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                ))}
                    </div>
                </aside>
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
                secciones={allSections}
            />
        </div >
    );
}
