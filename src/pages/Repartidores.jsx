import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { Plus, ChevronLeft, ChevronRight, Download, Upload, Search, MapPin, Phone, Mail, Calendar, Clock, Store, Tag, User, Hash, Filter, Activity as ActivityIcon, Edit2, Trash2, Building, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { RepartidorModal } from '../components/ui/RepartidorModal';
import { ActividadRepartidorModal } from '../components/ui/ActividadRepartidorModal';

export default function Repartidores() {
    const [repartidores, setRepartidores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);

    // Filters
    const [fNombre, setFNombre] = useState('');
    const [fTelefono, setFTelefono] = useState('');
    const [fLocalidad, setFLocalidad] = useState('');
    const [fEstado, setFEstado] = useState('Todos');
    const [fResponsable, setFResponsable] = useState('');

    // Modals
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const [actModalOpen, setActModalOpen] = useState(false);
    const [actTargetId, setActTargetId] = useState(null);
    const [actTargetName, setActTargetName] = useState('');

    // Activities
    const [activities, setActivities] = useState({});
    const [expandedActivities, setExpandedActivities] = useState({});

    const fetchRepartidores = async () => {
        setLoading(true);
        let request = supabase
            .from('repartidores')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range((page - 1) * pageSize, page * pageSize - 1);

        if (fEstado !== 'Todos') request = request.eq('estado', fEstado);
        if (fNombre) request = request.ilike('nombre', `%${fNombre}%`);
        if (fTelefono) request = request.ilike('telefono', `%${fTelefono}%`);
        if (fLocalidad) request = request.ilike('localidad', `%${fLocalidad}%`);
        if (fResponsable) request = request.eq('responsable', fResponsable);

        const { data, count, error } = await request;

        if (error) {
            toast.error('Error al cargar repartidores');
            console.error(error);
        } else {
            setRepartidores(data || []);
            setTotal(count || 0);

            if (data?.length > 0) {
                const ids = data.map(r => r.id);
                const { data: acts, error: actError } = await supabase
                    .from('actividades_repartidores')
                    .select('*')
                    .in('repartidor_id', ids)
                    .order('fecha_accion', { ascending: false });

                if (!actError && acts) {
                    const actsObj = {};
                    acts.forEach(a => {
                        if (!actsObj[a.repartidor_id]) actsObj[a.repartidor_id] = [];
                        actsObj[a.repartidor_id].push(a);
                    });
                    setActivities(actsObj);
                }
            }
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchRepartidores();
    }, [page, pageSize, fNombre, fTelefono, fLocalidad, fEstado, fResponsable]);

    const handleCreate = () => {
        setEditingId(null);
        setModalOpen(true);
    };

    const handleEdit = (id) => {
        setEditingId(id);
        setModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("¿Seguro que querés eliminar a este repartidor?")) return;
        const { error } = await supabase.from("repartidores").delete().eq("id", id);
        if (error) {
            toast.error("Error al eliminar.");
        } else {
            toast.success("Repartidor eliminado.");
            fetchRepartidores();
        }
    };

    const handleOpenActivity = (id, nombre) => {
        setActTargetId(id);
        setActTargetName(nombre || 'Sin nombre');
        setActModalOpen(true);
    };

    const toggleHistory = (id) => {
        setExpandedActivities(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return (
        <div className="page-container" style={{ padding: '0', maxWidth: '100%', margin: '0 auto', animation: 'page-enter 0.5s ease-out forwards' }}>

            {/* 1. HERO HEADER */}
            <header style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', gap: '16px' }}>
                <div>
                    <h1 style={{ fontSize: '2.2rem', fontWeight: 800, margin: '0 0 8px 0', letterSpacing: '-0.02em', background: 'linear-gradient(135deg, var(--text) 0%, var(--text-muted) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Repartidores
                    </h1>
                    <p className="muted" style={{ margin: 0, fontSize: '1.1rem' }}>
                        Gestión de flota, documentación y estados.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <Button variant="secondary" style={{ borderRadius: '99px', fontSize: '0.95rem' }} title="Descargar Modelo Excel">
                        Descargar Modelo
                    </Button>
                    <div style={{ display: 'flex', background: 'var(--bg-elevated)', borderRadius: '99px', border: '1px solid var(--border)', padding: '4px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
                        <Button variant="secondary" style={{ borderRadius: '99px', border: 'none', background: 'transparent' }} title="Exportar a Excel">
                            <Download size={18} />
                        </Button>
                        <label className="" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', borderRadius: '99px', border: 'none', background: 'transparent', padding: '8px 16px', color: 'var(--text-muted)' }} title="Importar desde Excel">
                            <Upload size={18} />
                            <input type="file" accept=".xlsx,.xls" style={{ display: 'none' }} />
                        </label>
                    </div>

                    <Button variant="primary" onClick={handleCreate} className="btn-text-hide-mobile" style={{ padding: '10px 24px', fontSize: '1.05rem', fontWeight: 600, borderRadius: '99px', boxShadow: '0 8px 20px -6px rgba(37, 99, 235, 0.5)' }}>
                        <Plus size={20} /> <span>Nuevo repartidor</span>
                    </Button>
                </div>
            </header>

            {/* 2. GLASSMORPHIC FILTERS */}
            <section style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: '24px',
                padding: '24px',
                marginBottom: '32px',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                boxShadow: '0 4px 24px -10px rgba(0, 0, 0, 0.08)',
                position: 'relative',
                overflow: 'hidden'
            }}>
                <div style={{ position: 'absolute', top: 0, left: '10%', right: '10%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)', opacity: 0.5 }}></div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text)', fontWeight: 700, fontSize: '1.1rem' }}>
                    <Filter size={18} style={{ color: 'var(--accent)' }} /> Filtros de Búsqueda
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input className="input" placeholder="Nombre..." value={fNombre} onChange={e => { setFNombre(e.target.value); setPage(1); }} style={{ width: '100%', paddingLeft: '40px', borderRadius: '12px' }} />
                    </div>
                    <div style={{ position: 'relative' }}>
                        <Phone size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input className="input" placeholder="Teléfono..." value={fTelefono} onChange={e => { setFTelefono(e.target.value); setPage(1); }} style={{ width: '100%', paddingLeft: '40px', borderRadius: '12px' }} />
                    </div>
                    <div style={{ position: 'relative' }}>
                        <MapPin size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input className="input" placeholder="Localidad..." value={fLocalidad} onChange={e => { setFLocalidad(e.target.value); setPage(1); }} style={{ width: '100%', paddingLeft: '40px', borderRadius: '12px' }} />
                    </div>

                    <div style={{ position: 'relative' }}>
                        <ActivityIcon size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                        <select className="input" value={fEstado} onChange={e => { setFEstado(e.target.value); setPage(1); }} style={{ width: '100%', paddingLeft: '40px', borderRadius: '12px' }}>
                            <option value="Todos">Todos los estados</option>
                            <option value="Documentación sin gestionar">Documentación sin gestionar</option>
                            <option value="Cuenta aun no confirmada">Cuenta aun no confirmada</option>
                            <option value="Cuenta confirmada y repartiendo">Cuenta confirmada y repartiendo</option>
                        </select>
                    </div>

                    <div style={{ position: 'relative' }}>
                        <User size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                        <select className="input" value={fResponsable} onChange={e => { setFResponsable(e.target.value); setPage(1); }} style={{ width: '100%', paddingLeft: '40px', borderRadius: '12px' }}>
                            <option value="">Cualquier responsable</option>
                            <option value="Toto">Toto</option>
                            <option value="Ruben">Ruben</option>
                            <option value="Tincho(B)">Tincho(B)</option>
                            <option value="Fran">Fran</option>
                            <option value="Ari">Ari</option>
                            <option value="Nati">Nati</option>
                            <option value="Dani">Dani</option>
                            <option value="Otro">Otro</option>
                        </select>
                    </div>
                </div>
            </section>

            <section style={{ marginBottom: '32px' }}>
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
                        Listado <span className="muted" style={{ fontWeight: 500, fontSize: '1.2rem' }}>({total})</span>
                    </h2>
                </header>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
                    {loading ? (
                        Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="bento-card" style={{ padding: '24px', minHeight: '220px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div className="skeleton-line medium" style={{ marginBottom: '8px' }}></div>
                                <div className="skeleton-line short"></div>
                                <div className="skeleton-line short"></div>
                            </div>
                        ))
                    ) : repartidores.length === 0 ? (
                        <div style={{ gridColumn: '1 / -1', background: 'var(--bg-elevated)', border: '1px dashed var(--border)', borderRadius: '20px', padding: '40px', textAlign: 'center' }}>
                            <p className="muted" style={{ fontSize: '1.1rem' }}>No se encontraron repartidores con esos filtros.</p>
                        </div>
                    ) : repartidores.map(r => {
                        const acts = activities[r.id] || [];
                        const isExpanded = expandedActivities[r.id];

                        const hasPhone = Boolean(r.telefono);
                        const hasEmail = Boolean(r.email || r.mail);
                        const hasAddress = Boolean(r.localidad);

                        return (
                            <div key={r.id} className="bento-card" style={{ padding: '24px', position: 'relative', display: 'flex', flexDirection: 'column', gap: '16px', overflow: 'hidden' }}>
                                {/* Accent line for positive status */}
                                {['Cuenta confirmada y repartiendo'].includes(r.estado) && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'var(--success)' }}></div>}

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div style={{ flex: 1, paddingRight: '12px' }}>
                                        <h3 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text)' }}>
                                            {r.nombre || "(Sin nombre)"}
                                        </h3>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                                            {hasAddress && <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={15} /> {r.localidad}</div>}
                                            {r.direccion && <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Store size={15} /> {r.direccion}</div>}
                                            {hasPhone && <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Phone size={15} /> {r.telefono}</div>}
                                            {hasEmail && <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Mail size={15} /> {r.email || r.mail}</div>}
                                        </div>
                                    </div>

                                    {/* Quick actions top right */}
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        <button onClick={() => handleEdit(r.id)} className="" style={{ padding: '8px', borderRadius: '10px', background: 'var(--bg)', color: 'var(--text-muted)', border: '1px solid var(--border)', cursor: 'pointer' }} title="Editar">
                                            <Edit2 size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(r.id)} className="" style={{ padding: '8px', borderRadius: '10px', border: '1px solid var(--border)', background: 'rgba(239, 68, 68, 0.05)', color: 'var(--danger)', cursor: 'pointer' }} title="Eliminar">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                {/* Badges row */}
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {r.estado && (
                                        <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '4px 10px', borderRadius: '99px', background: 'rgba(99, 102, 241, 0.1)', color: '#4f46e5', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                                            {r.estado}
                                        </span>
                                    )}
                                    {r.responsable && (
                                        <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '4px 10px', borderRadius: '99px', background: 'var(--bg-elevated)', color: 'var(--text)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <User size={12} /> {r.responsable}
                                        </span>
                                    )}
                                </div>

                                {r.notas && (
                                    <div style={{ fontSize: '0.9rem', background: 'var(--bg-elevated)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                                        <strong>Notas:</strong> {r.notas}
                                    </div>
                                )}

                                {/* Card Footer Actions */}
                                <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '16px', borderTop: '1px dashed var(--border)' }}>
                                    <Button variant="primary" style={{ flex: 1, padding: '8px' }} onClick={() => handleOpenActivity(r.id, r.nombre)}>
                                        <Plus size={16} /> Actividad
                                    </Button>
                                    <Button variant="secondary" style={{ flex: 1, padding: '8px' }} onClick={() => toggleHistory(r.id)}>
                                        <MessageSquare size={16} /> {isExpanded ? 'Ocultar' : `Historial (${acts.length})`}
                                    </Button>
                                </div>

                                {/* Accordion History */}
                                <div style={{
                                    maxHeight: isExpanded ? '400px' : '0',
                                    opacity: isExpanded ? 1 : 0,
                                    overflowY: 'auto',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    marginTop: isExpanded ? '12px' : '0',
                                }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '4px' }}>
                                        {acts.length > 0 ? acts.map(a => (
                                            <div key={a.id} style={{
                                                borderLeft: '3px solid var(--accent)',
                                                paddingLeft: '12px',
                                                background: 'var(--bg-elevated)',
                                                padding: '12px',
                                                borderRadius: '0 12px 12px 0',
                                                fontSize: '0.9rem'
                                            }}>
                                                <div style={{ color: 'var(--text)', marginBottom: '4px', lineHeight: 1.4 }}>{a.detalle}</div>
                                                <div className="muted" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}>
                                                    <Clock size={12} /> {new Date(a.fecha_accion).toLocaleString('es-AR')}
                                                    {a.usuario && <><User size={12} style={{ marginLeft: '6px' }} /> {a.usuario}</>}
                                                </div>
                                            </div>
                                        )) : (
                                            <div className="muted" style={{ textAlign: 'center', padding: '16px', background: 'var(--bg-elevated)', borderRadius: '12px' }}>
                                                Sin movimientos.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {!loading && total > 0 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '24px' }}>
                    <Button variant="secondary" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft size={16} /></Button>
                    <span className="muted">Página {page} de {totalPages}</span>
                    <Button variant="secondary" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}><ChevronRight size={16} /></Button>
                    <select
                        className="input"
                        value={pageSize}
                        onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                        style={{ width: '80px' }}
                    >
                        <option value="25">25</option>
                        <option value="50">50</option>
                    </select>
                </div>
            )}

            <RepartidorModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                repartidorId={editingId}
                onSaved={() => { setModalOpen(false); fetchRepartidores(); }}
            />

            <ActividadRepartidorModal
                isOpen={actModalOpen}
                onClose={() => setActModalOpen(false)}
                repartidorId={actTargetId}
                repartidorNombre={actTargetName}
                onSaved={() => { setActModalOpen(false); fetchRepartidores(); }}
            />
        </div>
    );
}
