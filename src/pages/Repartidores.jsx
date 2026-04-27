import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Plus, ChevronLeft, ChevronRight, Download, Upload, Search, MapPin, Phone, Mail, Calendar, Clock, Store, Tag, User, Hash, Filter, Activity as ActivityIcon, Edit2, Trash2, Building, MessageSquare, MoreVertical, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { RepartidorModal } from '../components/ui/RepartidorModal';
import { ActividadRepartidorModal } from '../components/ui/ActividadRepartidorModal';
import { importarRepartidoresExcel, descargarModeloRepartidores, exportarRepartidoresExcel } from '../lib/excelExport';
import { motion, AnimatePresence } from 'framer-motion';
import { RepartidorFilters } from '../components/repartidores/RepartidorFilters';

export default function Repartidores() {
    const { empresaActiva, isDemoMode } = useAuth();
    const [repartidores, setRepartidores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);

    // Filters
    const [fSearch, setFSearch] = useState('');
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
    const [actionsOpen, setActionsOpen] = useState(false);

    const fetchRepartidores = async () => {
        if (!empresaActiva?.id) return;
        console.log("Repartidores: Fetching for company:", empresaActiva.id);
        setLoading(true);
        let request = supabase
            .from('repartidores')
            .select('*', { count: 'exact' })
            .eq('empresa_id', empresaActiva.id)
            .order('created_at', { ascending: false })
            .range((page - 1) * pageSize, page * pageSize - 1);

        if (fEstado !== 'Todos') request = request.eq('estado', fEstado);
        if (fResponsable) request = request.eq('responsable', fResponsable);
        
        if (fSearch) {
            const term = `%${fSearch}%`;
            request = request.or(`nombre.ilike.${term},telefono.ilike.${term},localidad.ilike.${term},estado.ilike.${term},responsable.ilike.${term},direccion.ilike.${term}`);
        }

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
                    .eq('empresa_id', empresaActiva.id)
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
    }, [page, pageSize, fSearch, fEstado, fResponsable, empresaActiva]);

    const handleImportExcel = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        await importarRepartidoresExcel(file, empresaActiva, () => fetchRepartidores());
        e.target.value = '';
    };

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
        <div className="page-container" style={{ padding: '0', maxWidth: '100%', margin: '0 auto', position: 'relative' }}>

            {/* 1. HERO HEADER */}
            <header style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', gap: '16px' }}>
                <div>
                    <h1 style={{ fontSize: '2.2rem', fontWeight: 800, margin: '0 0 8px 0', letterSpacing: '-0.02em', background: 'linear-gradient(135deg, var(--text) 0%, var(--text-muted) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Repartidores
                    </h1>
                    <p className="muted" style={{ margin: 0, fontSize: '1.1rem' }}>
                        Gestión de flota y estados.
                    </p>
                </div>

                {/* SECONDARY ACTIONS DROPDOWN */}
                <div style={{ position: 'relative' }}>
                    <Button 
                        variant="secondary" 
                        onClick={() => setActionsOpen(!actionsOpen)} 
                        style={{ borderRadius: '14px', height: '44px', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-glass)', backdropFilter: 'blur(10px)', border: '1px solid var(--border)' }}
                    >
                        <MoreVertical size={18} />
                        <span className="hide-mobile">Acciones</span>
                    </Button>

                    <AnimatePresence>
                        {actionsOpen && (
                            <>
                                <div 
                                    style={{ position: 'fixed', inset: 0, zIndex: 998 }} 
                                    onClick={() => setActionsOpen(false)} 
                                />
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    style={{
                                        position: 'absolute', top: '50px', right: 0, zIndex: 999,
                                        minWidth: '220px', background: 'var(--bg-card)', border: '1px solid var(--border)',
                                        borderRadius: '16px', boxShadow: 'var(--shadow-xl)', padding: '8px',
                                        backdropFilter: 'blur(16px)'
                                    }}
                                >
                                    <button 
                                        className="dropdown-item" 
                                        onClick={() => { descargarModeloRepartidores(); setActionsOpen(false); }}
                                        style={{ width: '100%', padding: '10px 14px', textAlign: 'left', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', color: 'var(--text)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                                    >
                                        <FileText size={16} style={{ color: 'var(--accent)' }} /> Descargar Modelo Excel
                                    </button>
                                    <button 
                                        className="dropdown-item" 
                                        onClick={() => { exportarRepartidoresExcel(empresaActiva, { search: fSearch, estado: fEstado, responsable: fResponsable }); setActionsOpen(false); }}
                                        style={{ width: '100%', padding: '10px 14px', textAlign: 'left', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', color: 'var(--text)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                                    >
                                        <Download size={16} style={{ color: 'var(--accent)' }} /> Exportar Repartidores
                                    </button>
                                    {!isDemoMode && (
                                        <label 
                                            className="dropdown-item" 
                                            style={{ width: '100%', padding: '10px 14px', textAlign: 'left', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', color: 'var(--text)', cursor: 'pointer' }}
                                        >
                                            <Upload size={16} style={{ color: 'var(--accent)' }} /> Importar Excel
                                            <input type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={(e) => { handleImportExcel(e); setActionsOpen(false); }} />
                                        </label>
                                    )}
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </div>
            </header>

            {/* 2. FILTERS bar */}
            <RepartidorFilters
                fSearch={fSearch} setFSearch={setFSearch}
                fEstado={fEstado} setFEstado={setFEstado}
                fResponsable={fResponsable} setFResponsable={setFResponsable}
                setPage={setPage}
            />

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
                                        {!isDemoMode && (
                                            <button onClick={() => handleDelete(r.id)} className="" style={{ padding: '8px', borderRadius: '10px', border: '1px solid var(--border)', background: 'rgba(239, 68, 68, 0.05)', color: 'var(--danger)', cursor: 'pointer' }} title="Eliminar">
                                                <Trash2 size={16} />
                                            </button>
                                        )}
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

            {/* GLOBAL FLOATING ACTION BUTTON (FAB) - PORTAL */}
            {createPortal(
                <div style={{ position: 'fixed', bottom: '30px', right: '30px', zIndex: 9999 }}>
                    <motion.button
                        whileHover={{ scale: 1.1, translateY: -5 }}
                        whileTap={{ scale: 0.9 }}
                        animate={{ 
                            boxShadow: [
                                '0 8px 20px -6px rgba(0, 0, 0, 0.3)',
                                '0 8px 35px 5px rgba(0, 0, 0, 0.15)',
                                '0 8px 20px -6px rgba(0, 0, 0, 0.3)'
                            ]
                        }}
                        transition={{ 
                            boxShadow: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                        }}
                        onClick={handleCreate}
                        style={{
                            pointerEvents: 'auto',
                            width: '64px', height: '64px', borderRadius: '32px',
                            background: 'linear-gradient(135deg, var(--accent) 0%, #1a1a1a 100%)',
                            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: '2px solid rgba(255,255,255,0.2)', cursor: 'pointer',
                            boxShadow: '0 8px 20px -6px rgba(0, 0, 0, 0.3)'
                        }}
                        title="Nuevo Repartidor"
                    >
                        <Plus size={32} />
                    </motion.button>
                </div>,
                document.body
            )}

            <style tabIndex={-1}>{`
                .dropdown-item:hover { background: var(--bg-elevated); color: var(--accent) !important; }
            `}</style>
        </div>
    );
}
