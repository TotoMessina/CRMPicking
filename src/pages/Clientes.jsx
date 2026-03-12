import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { Plus, ChevronLeft, ChevronRight, Download, Upload, Search, MapPin, Phone, Mail, Calendar, Clock, Store, Tag, User, Hash, Filter, Activity as ActivityIcon, Edit2, Trash2, Building } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { ClienteModal } from '../components/ui/ClienteModal';
import { ActividadClienteModal } from '../components/ui/ActividadClienteModal';
import { useClientes, useDeleteCliente, useQuickDateCliente, useRegistrarVisitaCliente } from '../hooks/useClientes';
import { descargarModeloClientes, importarClientesExcel, exportarClientesExcel } from '../lib/excelExport';
import { ClienteCard } from '../components/ui/ClienteCard';
import { useQueryClient } from '@tanstack/react-query';export default function Clientes() {
    const { user, userName, empresaActiva } = useAuth();
    const [searchParams] = useSearchParams();
    const isAgendaHoy = searchParams.get('agenda') === 'hoy';

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [exportLoading, setExportLoading] = useState(false);

    // Filters
    const [fNombre, setFNombre] = useState('');
    const [fTelefono, setFTelefono] = useState('');
    const [fDireccion, setFDireccion] = useState('');
    const [fEstado, setFEstado] = useState('Todos');
    const [fSituacion, setFSituacion] = useState('Todos');
    const [fResponsable, setFResponsable] = useState('');
    const [fRubro, setFRubro] = useState('');
    const [fInteres, setFInteres] = useState('');
    const [fEstilo, setFEstilo] = useState('');
    const [fTipoContacto, setFTipoContacto] = useState('Todos');
    const [fProximos7, setFProximos7] = useState(false);
    const [fVencidos, setFVencidos] = useState(false);
    const [fCreadoDesde, setFCreadoDesde] = useState('');
    const [fCreadoHasta, setFCreadoHasta] = useState('');

    const [sortBy, setSortBy] = useState('updated'); // 'updated', 'recent', 'oldest', 'az', 'za', 'activity_desc', 'activity_asc'

    // Metadata (Rubros to populate select)
    const [rubrosValidos, setRubrosValidos] = useState([]);

    // Modals
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const [actModalOpen, setActModalOpen] = useState(false);
    const [actTargetId, setActTargetId] = useState(null);
    const [actTargetName, setActTargetName] = useState('');

    const [expandedActivities, setExpandedActivities] = useState({});

    const { data, isLoading: loading, refetch: fetchClientes } = useClientes({
        empresaId: empresaActiva?.id,
        page, pageSize, isAgendaHoy,
        fEstado, fSituacion, fTipoContacto, fResponsable,
        fRubro, fInteres, fEstilo, fProximos7, fVencidos,
        fNombre, fTelefono, fDireccion, fCreadoDesde, fCreadoHasta, sortBy
    });
    const { clientes = [], total = 0, activities = {} } = data || {};
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const queryClient = useQueryClient();

    // Mutations
    const deleteClienteMutation = useDeleteCliente();
    const quickDateMutation = useQuickDateCliente();
    const visitaMutation = useRegistrarVisitaCliente();

    useEffect(() => {
        const fetchRubros = async () => {
            if (!empresaActiva?.id) return;
            const { data } = await supabase.from('empresa_cliente').select('rubro').eq('empresa_id', empresaActiva.id).eq('activo', true);
            if (data) {
                const uniqueRubros = [...new Set(data.map(c => c.rubro).filter(r => r && r.trim() !== ''))].sort();
                setRubrosValidos(uniqueRubros);
            }
        };
        fetchRubros();
    }, [empresaActiva]);

    const handleCreate = useCallback(() => {
        setEditingId(null);
        setModalOpen(true);
    }, []);

    const handleEdit = useCallback((id) => {
        setEditingId(id);
        setModalOpen(true);
    }, []);

    const handleDelete = useCallback((id) => {
        if (!window.confirm("¿Seguro que querés marcar como inactivo este cliente?")) return;
        deleteClienteMutation.mutate({ id, empresaActiva });
    }, [empresaActiva, deleteClienteMutation]);

    const handleOpenActivity = useCallback((id, nombre) => {
        setActTargetId(id);
        setActTargetName(nombre || 'Sin nombre');
        setActModalOpen(true);
    }, []);

    const toggleHistory = useCallback((id) => {
        setExpandedActivities(prev => ({ ...prev, [id]: !prev[id] }));
    }, []);

    const handleQuickDate = useCallback((clienteId, daysOffset) => {
        quickDateMutation.mutate({ clienteId, daysOffset, empresaActiva, userName, user });
    }, [empresaActiva, userName, user, quickDateMutation]);

    const handleRegistrarVisita = useCallback((clienteId, nombre) => {
        visitaMutation.mutate({ clienteId, nombre, empresaActiva, userName, user });
    }, [empresaActiva, userName, user, visitaMutation]);



    const handleDescargarModelo = () => {
        descargarModeloClientes();
    };

    const handleImportExcel = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        await importarClientesExcel(file, empresaActiva, userName, user?.email, () => fetchClientes());
        e.target.value = '';
    };

    const handleDescargarExcel = async () => {
        setExportLoading(true);
        await exportarClientesExcel(empresaActiva, () => setExportLoading(false));
    };

    return (
        <div className="page-container" style={{ padding: '0', maxWidth: '100%', margin: '0 auto', animation: 'page-enter 0.5s ease-out forwards' }}>

            {/* 1. HERO HEADER */}
            <header style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', gap: '16px' }}>
                <div>
                    <h1 style={{ fontSize: '2.2rem', fontWeight: 800, margin: '0 0 8px 0', letterSpacing: '-0.02em', background: 'linear-gradient(135deg, var(--text) 0%, var(--text-muted) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        {isAgendaHoy ? "Agenda de Hoy" : "Directorio de Clientes"}
                    </h1>
                    <p className="muted" style={{ margin: 0, fontSize: '1.1rem' }}>
                        {isAgendaHoy ? "Clientes programados para contactar hoy." : "Gestión, historial y segmentación interactiva de comercios."}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <Button variant="secondary" onClick={handleDescargarModelo} style={{ borderRadius: '99px', fontSize: '0.95rem' }} title="Descargar Modelo Excel">
                        Descargar Modelo
                    </Button>
                    <div style={{ display: 'flex', background: 'var(--bg-elevated)', borderRadius: '99px', border: '1px solid var(--border)', padding: '4px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
                        <Button variant="secondary" onClick={handleDescargarExcel} disabled={exportLoading} style={{ borderRadius: '99px', border: 'none', background: 'transparent' }} title="Exportar Clientes a Excel">
                            <Download size={18} />
                        </Button>
                        <label className="" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', borderRadius: '99px', border: 'none', background: 'transparent', padding: '8px 16px', color: 'var(--text-muted)' }} title="Importar desde Excel">
                            <Upload size={18} />
                            <input type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleImportExcel} />
                        </label>
                    </div>

                    <Button variant="primary" onClick={handleCreate} className="btn-text-hide-mobile" style={{ padding: '10px 24px', fontSize: '1.05rem', fontWeight: 600, borderRadius: '99px', boxShadow: '0 8px 20px -6px rgba(37, 99, 235, 0.5)' }}>
                        <Plus size={20} /> <span>Nuevo Cliente</span>
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
                        <input className="input" placeholder="Nombre o local..." value={fNombre} onChange={e => { setFNombre(e.target.value); setPage(1); }} style={{ width: '100%', paddingLeft: '40px', borderRadius: '12px' }} />
                    </div>
                    <div style={{ position: 'relative' }}>
                        <Phone size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input className="input" placeholder="Teléfono..." value={fTelefono} onChange={e => { setFTelefono(e.target.value); setPage(1); }} style={{ width: '100%', paddingLeft: '40px', borderRadius: '12px' }} />
                    </div>
                    <div style={{ position: 'relative' }}>
                        <MapPin size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input className="input" placeholder="Dirección..." value={fDireccion} onChange={e => { setFDireccion(e.target.value); setPage(1); }} style={{ width: '100%', paddingLeft: '40px', borderRadius: '12px' }} />
                    </div>

                    <div style={{ position: 'relative' }}>
                        <Store size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                        <select className="input" value={fRubro} onChange={e => { setFRubro(e.target.value); setPage(1); }} style={{ width: '100%', paddingLeft: '40px', borderRadius: '12px' }}>
                            <option value="">Cualquier rubro</option>
                            {rubrosValidos.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>

                    <div style={{ position: 'relative' }}>
                        <ActivityIcon size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                        <select className="input" value={fEstado} onChange={e => { setFEstado(e.target.value); setPage(1); }} style={{ width: '100%', paddingLeft: '40px', borderRadius: '12px' }}>
                            <option value="Todos">Todos los estados</option>
                            <option value="1 - Cliente relevado">1 - Cliente relevado</option>
                            <option value="2 - Local Visitado No Activo">2 - Local Visitado No Activo</option>
                            <option value="3 - Primer ingreso">3 - Primer Ingreso</option>
                            <option value="4 - Local Creado">4 - Local Creado</option>
                            <option value="5 - Local Visitado Activo">5 - Local Visitado Activo</option>
                            <option value="6 - Local No Interesado">6 - Local No Interesado</option>
                        </select>
                    </div>

                    <div style={{ position: 'relative' }}>
                        <ActivityIcon size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                        <select className="input" value={fSituacion} onChange={e => { setFSituacion(e.target.value); setPage(1); }} style={{ width: '100%', paddingLeft: '40px', borderRadius: '12px' }}>
                            <option value="Todos">Todas las situaciones</option>
                            <option value="sin comunicacion nueva">Sin comunicación nueva</option>
                            <option value="en proceso">En proceso</option>
                            <option value="en funcionamiento">En funcionamiento</option>
                        </select>
                    </div>

                    <div style={{ position: 'relative' }}>
                        <Phone size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                        <select className="input" value={fTipoContacto} onChange={e => { setFTipoContacto(e.target.value); setPage(1); }} style={{ width: '100%', paddingLeft: '40px', borderRadius: '12px' }}>
                            <option value="Todos">Todos los tipos de contacto</option>
                            <option value="Visita Presencial">Visita Presencial</option>
                            <option value="Llamada">Llamada</option>
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

                    <div style={{ position: 'relative' }}>
                        <Tag size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                        <select className="input" value={fInteres} onChange={e => { setFInteres(e.target.value); setPage(1); }} style={{ width: '100%', paddingLeft: '40px', borderRadius: '12px' }}>
                            <option value="">Cualquier interés</option>
                            <option value="Bajo">Bajo</option>
                            <option value="Medio">Medio</option>
                            <option value="Alto">Alto</option>
                        </select>
                    </div>

                    <div style={{ position: 'relative' }}>
                        <Building size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                        <select className="input" value={fEstilo} onChange={e => { setFEstilo(e.target.value); setPage(1); }} style={{ width: '100%', paddingLeft: '40px', borderRadius: '12px' }}>
                            <option value="">Cualquier estilo</option>
                            <option value="Dueño">Dueño</option>
                            <option value="Empleado">Empleado</option>
                            <option value="Cerrado">Cerrado</option>
                        </select>
                    </div>

                    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginLeft: '4px' }}>Creado Desde:</label>
                        <input type="date" className="input" value={fCreadoDesde} onChange={e => { setFCreadoDesde(e.target.value); setPage(1); }} style={{ width: '100%', borderRadius: '12px' }} />
                    </div>

                    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginLeft: '4px' }}>Creado Hasta:</label>
                        <input type="date" className="input" value={fCreadoHasta} onChange={e => { setFCreadoHasta(e.target.value); setPage(1); }} style={{ width: '100%', borderRadius: '12px' }} />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', paddingBottom: '2px' }}>
                        <button
                            onClick={() => { setFVencidos(p => !p); if (!fVencidos) setFProximos7(false); setPage(1); }}
                            style={{
                                flex: 1,
                                display: 'flex', alignItems: 'center', gap: '8px',
                                padding: '10px 14px', borderRadius: '12px', cursor: 'pointer',
                                fontWeight: 600, fontSize: '0.85rem',
                                background: fVencidos ? '#ef4444' : 'var(--bg-elevated)',
                                color: fVencidos ? '#fff' : 'var(--text-muted)',
                                border: fVencidos ? '1px solid #ef4444' : '1px solid var(--border)',
                                boxShadow: fVencidos ? '0 4px 14px -4px rgba(239,68,68,0.5)' : 'none',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <Clock size={16} />
                            Vencidos{fVencidos ? ' ✓' : ''}
                        </button>
                        <button
                            onClick={() => { setFProximos7(p => !p); if (!fProximos7) setFVencidos(false); setPage(1); }}
                            style={{
                                flex: 1,
                                display: 'flex', alignItems: 'center', gap: '8px',
                                padding: '10px 14px', borderRadius: '12px', cursor: 'pointer',
                                fontWeight: 600, fontSize: '0.85rem',
                                background: fProximos7 ? 'var(--accent)' : 'var(--bg-elevated)',
                                color: fProximos7 ? '#fff' : 'var(--text-muted)',
                                border: fProximos7 ? '1px solid var(--accent)' : '1px solid var(--border)',
                                boxShadow: fProximos7 ? '0 4px 14px -4px rgba(37,99,235,0.5)' : 'none',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <Calendar size={16} />
                            Próximos 7 días{fProximos7 ? ' ✓' : ''}
                        </button>
                    </div>
                </div>
            </section>

            <section style={{ marginBottom: '32px' }}>
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
                        Listado <span className="muted" style={{ fontWeight: 500, fontSize: '1.2rem' }}>({total})</span>
                    </h2>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ordenar por</span>
                        <select
                            className="input"
                            value={sortBy}
                            onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                            style={{ padding: '8px 12px', borderRadius: '10px', minWidth: '180px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', fontWeight: 500, fontSize: '0.9rem', color: 'var(--text)' }}
                        >
                            <option value="updated">Últimos editados</option>
                            <option value="recent">Más recientes (creación)</option>
                            <option value="oldest">Más antiguos (creación)</option>
                            <option value="activity_desc">Última actividad (Recientes primero)</option>
                            <option value="activity_asc">Última actividad (Antiguos primero)</option>
                            <option value="az">Nombre (A - Z)</option>
                            <option value="za">Nombre (Z - A)</option>
                        </select>
                    </div>
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
                    ) : clientes.length === 0 ? (
                        <div style={{ gridColumn: '1 / -1', background: 'var(--bg-elevated)', border: '1px dashed var(--border)', borderRadius: '20px', padding: '40px', textAlign: 'center' }}>
                            <p className="muted" style={{ fontSize: '1.1rem' }}>No se encontraron clientes con esos filtros.</p>
                        </div>
                    ) : clientes.map(c => (
                        <ClienteCard
                            key={c.id}
                            cliente={c}
                            acts={activities[c.id] || []}
                            isExpanded={expandedActivities[c.id] || false}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onQuickDate={handleQuickDate}
                            onToggleHistory={toggleHistory}
                            onRegistrarVisita={handleRegistrarVisita}
                            onOpenActivity={handleOpenActivity}
                        />
                    ))}
                </div>
            </section>

            {!loading && total > 0 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '24px' }}>
                    <Button variant="secondary" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft size={16} /></Button>
                    <span className="muted">Página {page} de {totalPages}</span>
                    <Button variant="secondary" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}><ChevronRight size={16} /></Button>
                </div>
            )}

            <ClienteModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                clienteId={editingId}
                onSaved={() => {
                    setModalOpen(false);
                    queryClient.invalidateQueries({ queryKey: ['clientes'] });
                }}
            />

            <ActividadClienteModal
                isOpen={actModalOpen}
                onClose={() => setActModalOpen(false)}
                clienteId={actTargetId}
                clienteNombre={actTargetName}
                onSaved={() => { setActModalOpen(false); queryClient.invalidateQueries({ queryKey: ['clientes'] }); }}
            />
        </div>
    );
}
