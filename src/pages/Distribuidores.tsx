import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { Button } from '../components/ui/Button';
import { 
    Plus, ChevronLeft, ChevronRight, Download, Upload, MoreVertical, 
    FileText, Building2, Layers, CheckCircle2, Clock
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

import { Distribuidor, ActividadDistribuidor, DistribuidorFiltersState } from '../types/distribuidor';
import { DistribuidorCard } from '../components/distribuidores/DistribuidorCard';
import { DistribuidorFilters } from '../components/distribuidores/DistribuidorFilters';
import { DistribuidorModal } from '../components/ui/DistribuidorModal';
import { ActividadDistribuidorModal } from '../components/ui/ActividadDistribuidorModal';
import { ExcelImportModal } from '../components/ui/ExcelImportModal';
import { useExcelImport } from '../hooks/useExcelImport';
import { 
    descargarModeloDistribuidores, 
    descargarModeloDistribuidoresCSV,
    importarDistribuidoresExcel, 
    exportarDistribuidoresExcel,
    exportarDistribuidoresCSV 
} from '../lib/excelExport';

const INITIAL_FILTERS: DistribuidorFiltersState = {
    search: '',
    ejecutivo: 'Todos',
    zona: 'Todos',
    canal: 'Todos',
    erp: 'Todos',
    estado: 'Todos'
};

export default function Distribuidores() {
    const { t } = useTranslation();
    const { empresaActiva } = useAuth();
    const askConfirm = useConfirm();

    // Data state
    const [distribuidores, setDistribuidores] = useState<Distribuidor[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const pageSize = 20;

    // Filters state
    const [filters, setFilters] = useState<DistribuidorFiltersState>(INITIAL_FILTERS);

    // Dynamic filter options
    const [ejecutivosDisponibles, setEjecutivosDisponibles] = useState<string[]>([]);
    const [zonasDisponibles, setZonasDisponibles] = useState<string[]>([]);

    // Sorting
    const [sortBy, setSortBy] = useState<string>('recent');

    // Activities
    const [activities, setActivities] = useState<Record<string, ActividadDistribuidor[]>>({});
    const [expandedActivities, setExpandedActivities] = useState<Record<string, boolean>>({});

    // Modals
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | string | null>(null);

    const [actModalOpen, setActModalOpen] = useState(false);
    const [actTargetId, setActTargetId] = useState<number | string | null>(null);
    const [actTargetName, setActTargetName] = useState('');

    const [actionsOpen, setActionsOpen] = useState(false);

    // Excel import state
    const { importState, startImport, updateProgress, closeImportModal } = useExcelImport();

    // Fetch distribuidores
    const fetchDistribuidores = async () => {
        if (!empresaActiva?.id) return;
        setLoading(true);

        try {
            let request = supabase
                .from('distribuidores')
                .select('*', { count: 'exact' })
                .eq('empresa_id', empresaActiva.id);

            // Filtros select
            if (filters.estado !== 'Todos') {
                request = request.eq('estado', filters.estado);
            }
            if (filters.ejecutivo !== 'Todos') {
                request = request.eq('ejecutivo_cuenta', filters.ejecutivo);
            }
            if (filters.zona !== 'Todos') {
                request = request.eq('zona_entrega', filters.zona);
            }

            // Búsqueda libre
            if (filters.search && filters.search.trim()) {
                const term = `"%${filters.search.trim()}%"`;
                request = request.or(`nombre.ilike.${term},direccion.ilike.${term},categorias_productos.ilike.${term},canal_comercializacion.ilike.${term},zona_entrega.ilike.${term},erp_sistema_gestion.ilike.${term},ejecutivo_cuenta.ilike.${term}`);
            }

            // Orden
            if (sortBy === 'az') {
                request = request.order('nombre', { ascending: true });
            } else if (sortBy === 'za') {
                request = request.order('nombre', { ascending: false });
            } else if (sortBy === 'activity_desc') {
                request = request.order('ultima_actividad', { ascending: false, nullsFirst: false });
            } else if (sortBy === 'oldest') {
                request = request.order('created_at', { ascending: true });
            } else {
                request = request.order('created_at', { ascending: false });
            }

            // Paginación
            request = request.range((page - 1) * pageSize, page * pageSize - 1);

            const { data, count, error } = await request;

            if (error) throw error;

            const list = (data as Distribuidor[]) || [];
            setDistribuidores(list);
            setTotal(count || 0);

            // Fetch actividades para los distribuidores visibles
            if (list.length > 0) {
                const ids = list.map(d => Number(d.id));
                const { data: actsData, error: actsError } = await supabase
                    .from('actividades_distribuidores')
                    .select('*')
                    .eq('empresa_id', empresaActiva.id)
                    .in('distribuidor_id', ids)
                    .order('fecha', { ascending: false });

                if (!actsError && actsData) {
                    const actsObj: Record<string, ActividadDistribuidor[]> = {};
                    actsData.forEach((a: any) => {
                        const key = String(a.distribuidor_id);
                        if (!actsObj[key]) actsObj[key] = [];
                        actsObj[key].push(a);
                    });
                    setActivities(actsObj);
                }
            } else {
                setActivities({});
            }

        } catch (err: any) {
            console.error('Error al cargar distribuidores:', err);
            toast.error(err.message || 'Error al cargar distribuidores');
        } finally {
            setLoading(false);
        }
    };

    // Cargar listas para filtros de selección
    const fetchFilterOptions = async () => {
        if (!empresaActiva?.id) return;
        try {
            const { data, error } = await supabase
                .from('distribuidores')
                .select('ejecutivo_cuenta, zona_entrega')
                .eq('empresa_id', empresaActiva.id);

            if (!error && data) {
                const ejecutivos = Array.from(new Set(data.map(d => d.ejecutivo_cuenta).filter(Boolean))) as string[];
                const zonas = Array.from(new Set(data.map(d => d.zona_entrega).filter(Boolean))) as string[];
                setEjecutivosDisponibles(ejecutivos);
                setZonasDisponibles(zonas);
            }
        } catch (e) {
            console.error('Error al cargar opciones de filtros:', e);
        }
    };

    useEffect(() => {
        fetchFilterOptions();
    }, [empresaActiva?.id]);

    useEffect(() => {
        fetchDistribuidores();
    }, [page, filters, sortBy, empresaActiva?.id]);

    // Total de páginas
    const totalPages = Math.ceil(total / pageSize) || 1;

    // Métricas rápidas
    const metrics = useMemo(() => {
        const activos = distribuidores.filter(d => d.estado === 'Activo').length;
        const prospectos = distribuidores.filter(d => d.estado === 'Prospecto' || d.estado === 'En negociación').length;
        return { activos, prospectos };
    }, [distribuidores]);

    // Handlers
    const handleCreate = () => {
        setEditingId(null);
        setModalOpen(true);
    };

    const handleEdit = (id: number | string) => {
        setEditingId(id);
        setModalOpen(true);
    };

    const handleDelete = async (id: number | string) => {
        const dist = distribuidores.find(d => d.id === id);
        const ok = await askConfirm({
            title: '¿Eliminar Distribuidor?',
            message: `¿Estás seguro de que deseas eliminar a "${dist?.nombre || 'este distribuidor'}"? Esta acción también borrará sus actividades asociadas.`,
            confirmLabel: 'Eliminar',
            cancelLabel: 'Cancelar',
            variant: 'danger'
        });

        if (!ok) return;

        try {
            const { error } = await supabase
                .from('distribuidores')
                .delete()
                .eq('id', id);

            if (error) throw error;

            toast.success('Distribuidor eliminado');
            fetchDistribuidores();
            fetchFilterOptions();
        } catch (err: any) {
            console.error('Error al eliminar distribuidor:', err);
            toast.error(err.message || 'Error al eliminar distribuidor');
        }
    };

    const handleOpenActivity = (id: number | string, nombre: string) => {
        setActTargetId(id);
        setActTargetName(nombre);
        setActModalOpen(true);
    };

    const toggleHistory = (id: number | string) => {
        const key = String(id);
        setExpandedActivities(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        startImport('Importando Distribuidores desde Excel', file.name);
        await importarDistribuidoresExcel(
            file,
            empresaActiva,
            () => {
                fetchDistribuidores();
                fetchFilterOptions();
            },
            prog => updateProgress(prog)
        );
        e.target.value = '';
    };

    const handleDescargarExcel = async () => {
        await exportarDistribuidoresExcel(empresaActiva, filters);
    };

    const handleDescargarCSV = async () => {
        await exportarDistribuidoresCSV(empresaActiva, filters);
    };

    const handleDescargarModelo = () => {
        descargarModeloDistribuidores();
    };

    const handleDescargarModeloCSV = () => {
        descargarModeloDistribuidoresCSV();
    };

    const handleResetFilters = () => {
        setFilters(INITIAL_FILTERS);
        setPage(1);
    };

    return (
        <div className="page-container" style={{ padding: '0', maxWidth: '100%', margin: '0 auto', position: 'relative' }}>
            
            {/* 1. HERO HEADER */}
            <header style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', gap: '16px' }}>
                <div>
                    <h1 style={{ fontSize: '2.2rem', fontWeight: 800, margin: '0 0 8px 0', letterSpacing: '-0.02em', background: 'linear-gradient(135deg, var(--text) 0%, var(--text-muted) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Distribuidores
                    </h1>
                    <p className="muted" style={{ margin: 0, fontSize: '1.1rem' }}>
                        Gestión comercial, condiciones logísticas y seguimiento de distribuidores.
                    </p>
                </div>

                {/* ACCIONES EXCEL Y PLANTILLA */}
                <div style={{ position: 'relative', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <Button 
                        variant="secondary" 
                        type="button"
                        onClick={handleDescargarModelo} 
                        style={{ borderRadius: '14px', height: '44px', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-glass)', backdropFilter: 'blur(10px)', border: '1px solid var(--border)' }}
                        title="Descargar plantilla Excel para carga de distribuidores"
                    >
                        <FileText size={18} style={{ color: 'var(--primary)' }} />
                        <span className="hide-mobile">Descargar Plantilla</span>
                    </Button>

                    <Button 
                        variant="secondary" 
                        type="button"
                        onClick={handleDescargarExcel} 
                        style={{ borderRadius: '14px', height: '44px', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-glass)', backdropFilter: 'blur(10px)', border: '1px solid var(--border)' }}
                        title="Exportar listado de distribuidores a Excel"
                    >
                        <Download size={18} style={{ color: 'var(--primary)' }} />
                        <span className="hide-mobile">Exportar Excel</span>
                    </Button>

                    <div style={{ position: 'relative' }}>
                        <Button 
                            variant="secondary" 
                            type="button"
                            onClick={() => setActionsOpen(!actionsOpen)} 
                            style={{ borderRadius: '14px', height: '44px', padding: '0 14px', display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-glass)', backdropFilter: 'blur(10px)', border: '1px solid var(--border)' }}
                        >
                            <MoreVertical size={18} />
                            <span className="hide-mobile">Más</span>
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
                                            minWidth: '250px', background: 'var(--bg-card)', border: '1px solid var(--border)',
                                            borderRadius: '16px', boxShadow: 'var(--shadow-xl)', padding: '8px',
                                            backdropFilter: 'blur(16px)'
                                        }}
                                    >
                                        <button 
                                            type="button"
                                            className="dropdown-item" 
                                            onClick={(e) => { e.stopPropagation(); setActionsOpen(false); handleDescargarModelo(); }}
                                            style={{ width: '100%', padding: '10px 14px', textAlign: 'left', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', color: 'var(--text)', background: 'none', border: 'none', cursor: 'pointer' }}
                                        >
                                            <FileText size={16} style={{ color: 'var(--primary)' }} /> Descargar Plantilla Excel (.xlsx)
                                        </button>
                                        <button 
                                            type="button"
                                            className="dropdown-item" 
                                            onClick={(e) => { e.stopPropagation(); setActionsOpen(false); handleDescargarModeloCSV(); }}
                                            style={{ width: '100%', padding: '10px 14px', textAlign: 'left', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', color: 'var(--text)', background: 'none', border: 'none', cursor: 'pointer' }}
                                        >
                                            <FileText size={16} style={{ color: '#10b981' }} /> Descargar Plantilla CSV (.csv)
                                        </button>
                                        <div style={{ height: '1px', background: 'var(--border)', margin: '6px 0' }} />
                                        <button 
                                            type="button"
                                            className="dropdown-item" 
                                            onClick={(e) => { e.stopPropagation(); setActionsOpen(false); handleDescargarExcel(); }}
                                            style={{ width: '100%', padding: '10px 14px', textAlign: 'left', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', color: 'var(--text)', background: 'none', border: 'none', cursor: 'pointer' }}
                                        >
                                            <Download size={16} style={{ color: 'var(--primary)' }} /> Exportar a Excel (.xlsx)
                                        </button>
                                        <button 
                                            type="button"
                                            className="dropdown-item" 
                                            onClick={(e) => { e.stopPropagation(); setActionsOpen(false); handleDescargarCSV(); }}
                                            style={{ width: '100%', padding: '10px 14px', textAlign: 'left', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', color: 'var(--text)', background: 'none', border: 'none', cursor: 'pointer' }}
                                        >
                                            <Download size={16} style={{ color: '#10b981' }} /> Exportar a CSV (.csv)
                                        </button>
                                        <div style={{ height: '1px', background: 'var(--border)', margin: '6px 0' }} />
                                        <label 
                                            className="dropdown-item" 
                                            style={{ width: '100%', padding: '10px 14px', textAlign: 'left', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', color: 'var(--text)', cursor: 'pointer' }}
                                        >
                                            <Upload size={16} style={{ color: 'var(--primary)' }} /> Importar desde Excel / CSV
                                            <input 
                                                type="file" 
                                                accept=".xlsx,.xls,.csv" 
                                                style={{ display: 'none' }} 
                                                onChange={(e) => { handleImportExcel(e); setActionsOpen(false); }} 
                                            />
                                        </label>
                                    </motion.div>
                                </>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </header>

            {/* 2. BARRA DE FILTROS */}
            <DistribuidorFilters
                filters={filters}
                setFilters={setFilters}
                ejecutivosDisponibles={ejecutivosDisponibles}
                zonasDisponibles={zonasDisponibles}
                onReset={handleResetFilters}
            />

            {/* 3. SECCIÓN DEL LISTADO */}
            <section style={{ marginBottom: '32px' }}>
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
                        Listado de Distribuidores <span className="muted" style={{ fontWeight: 500, fontSize: '1.2rem' }}>({total})</span>
                    </h2>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Ordenar por:
                        </span>
                        <select
                            className="input"
                            value={sortBy}
                            onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                            style={{ padding: '8px 12px', borderRadius: '10px', minWidth: '180px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', fontWeight: 500, fontSize: '0.9rem', color: 'var(--text)' }}
                        >
                            <option value="recent">Más recientes</option>
                            <option value="oldest">Más antiguos</option>
                            <option value="activity_desc">Última actividad</option>
                            <option value="az">Nombre (A - Z)</option>
                            <option value="za">Nombre (Z - A)</option>
                        </select>
                    </div>
                </header>

                {/* GRILLA DE TARJETAS */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
                    {loading ? (
                        Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="bento-card" style={{ padding: '24px', minHeight: '240px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div className="skeleton-line medium" style={{ marginBottom: '8px' }}></div>
                                <div className="skeleton-line short"></div>
                                <div className="skeleton-line short"></div>
                            </div>
                        ))
                    ) : distribuidores.length === 0 ? (
                        <div style={{ gridColumn: '1 / -1', background: 'var(--bg-elevated)', border: '1px dashed var(--border)', borderRadius: '20px', padding: '60px 40px', textAlign: 'center' }}>
                            <Building2 size={48} style={{ margin: '0 auto 16px auto', color: 'var(--text-muted)', opacity: 0.5 }} />
                            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', fontWeight: 700, color: 'var(--text)' }}>
                                No se encontraron distribuidores
                            </h3>
                            <p className="muted" style={{ margin: '0 0 20px 0', fontSize: '0.95rem' }}>
                                Podés crear un nuevo distribuidor o importar una lista mediante un archivo Excel.
                            </p>
                            <Button variant="primary" onClick={handleCreate}>
                                <Plus size={18} style={{ marginRight: '6px' }} />
                                Nuevo Distribuidor
                            </Button>
                        </div>
                    ) : distribuidores.map((d, index) => (
                        <motion.div
                            key={d.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.35, delay: index * 0.04, ease: 'easeOut' }}
                        >
                            <DistribuidorCard
                                distribuidor={d}
                                acts={activities[String(d.id)] || []}
                                isExpanded={expandedActivities[String(d.id)] || false}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                                onOpenActivity={handleOpenActivity}
                                onToggleHistory={toggleHistory}
                            />
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* 4. PAGINACIÓN */}
            {!loading && total > pageSize && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '24px', marginBottom: '40px' }}>
                    <Button variant="secondary" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                        <ChevronLeft size={16} />
                    </Button>
                    <span className="muted">Página {page} de {totalPages}</span>
                    <Button variant="secondary" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                        <ChevronRight size={16} />
                    </Button>
                </div>
            )}

            {/* MODAL DE DISTRIBUIDOR (ALTA Y EDICIÓN) */}
            <DistribuidorModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                distribuidorId={editingId}
                onSaved={() => {
                    fetchDistribuidores();
                    fetchFilterOptions();
                }}
            />

            {/* MODAL DE ACTIVIDAD */}
            <ActividadDistribuidorModal
                isOpen={actModalOpen}
                onClose={() => setActModalOpen(false)}
                distribuidorId={actTargetId}
                distribuidorNombre={actTargetName}
                onSaved={() => {
                    fetchDistribuidores();
                }}
            />

            {/* MODAL DE IMPORTACIÓN EXCEL */}
            <ExcelImportModal state={importState} onClose={closeImportModal} />

            {/* BOTÓN FLOTANTE (FAB) */}
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
                        id="btn-nuevo-distribuidor"
                        style={{
                            pointerEvents: 'auto',
                            width: '64px', height: '64px', borderRadius: '32px',
                            background: 'linear-gradient(135deg, var(--accent) 0%, #1a1a1a 100%)',
                            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: '2px solid rgba(255,255,255,0.2)', cursor: 'pointer',
                            boxShadow: '0 8px 20px -6px rgba(0, 0, 0, 0.3)'
                        }}
                        title="Nuevo Distribuidor"
                    >
                        <Plus size={32} />
                    </motion.button>
                </div>,
                document.body
            )}
        </div>
    );
}
