import React, { useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Plus, ChevronLeft, ChevronRight, Phone, Download, Upload, FileSpreadsheet } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { useLlamadas, useDeleteLlamada, LlamadaFilters as Filters } from '../hooks/useLlamadas';
import { LlamadaCard } from '../components/llamadas/LlamadaCard';
import { LlamadaModal } from '../components/llamadas/LlamadaModal';
import { LlamadaFilters } from '../components/llamadas/LlamadaFilters';
import { Button } from '../components/ui/Button';
import { useConfirm } from '../contexts/ConfirmContext';
import { descargarModeloLlamadas, exportarLlamadasExcel, importarLlamadasExcel } from '../lib/excelExport';

const PAGE_SIZE = 24;

const DEFAULT_FILTERS: Filters = {
    busqueda: '',
    operador: '',
    rubro: '',
    respuesta: '',
    etiqueta: '',
};

const Llamadas: React.FC = () => {
    const { empresaActiva } = useAuth();
    const queryClient = useQueryClient();
    const askConfirm = useConfirm();
    const deleteMutation = useDeleteLlamada();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [page, setPage] = useState(1);
    const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
    const [sortBy, setSortBy] = useState('created_desc');
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

    const updateFilter = useCallback((key: keyof Filters, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setPage(1);
    }, []);

    const { data, isLoading } = useLlamadas({
        empresaId: empresaActiva?.id || null,
        page,
        pageSize: PAGE_SIZE,
        filters,
        sortBy,
    });

    const llamadas = data?.llamadas || [];
    const total = data?.total || 0;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    const handleCreate = () => { setEditingId(null); setModalOpen(true); };
    const handleEdit = (id: number) => { setEditingId(id); setModalOpen(true); };

    const handleDelete = async (id: number) => {
        const ok = await askConfirm({
            title: 'Eliminar ficha',
            message: '¿Eliminar esta ficha de llamada? Esta acción no se puede deshacer.',
            variant: 'danger',
            confirmText: 'Eliminar',
        });
        if (!ok) return;
        await deleteMutation.mutateAsync(id);
    };

    const handleSaved = () => {
        setModalOpen(false);
        queryClient.invalidateQueries({ queryKey: ['llamadas'] });
    };

    const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        if (file && empresaActiva) {
            importarLlamadasExcel(file, empresaActiva, () => {
                queryClient.invalidateQueries({ queryKey: ['llamadas'] });
                queryClient.invalidateQueries({ queryKey: ['clientes'] });
            });
        }
        e.target.value = '';
    };

    return (
        <div className="page-container" style={{ padding: '0', maxWidth: '100%', margin: '0 auto', position: 'relative' }}>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleImportFile}
                accept=".xlsx, .xls, .csv"
                style={{ display: 'none' }}
            />

            {/* ── HEADER ─────────────────────────────── */}
            <header style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', gap: '16px' }}>
                <div>
                    <h1 style={{
                        fontSize: '2.2rem', fontWeight: 800, margin: '0 0 8px 0',
                        letterSpacing: '-0.02em',
                        background: 'linear-gradient(135deg, var(--text) 0%, var(--text-muted) 100%)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    }}>
                        Llamadas
                    </h1>
                    <p className="muted" style={{ margin: 0, fontSize: '1.1rem' }}>
                        Fichas de gestión de llamadas comerciales
                    </p>
                </div>

                {/* Acciones Excel & Leyenda */}
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', marginRight: '8px' }}>
                        <Button
                            variant="secondary"
                            onClick={descargarModeloLlamadas}
                            title="Descargar plantilla de ejemplo en Excel"
                            style={{ gap: '6px', fontSize: '0.84rem' }}
                        >
                            <FileSpreadsheet size={15} /> Plantilla
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={() => fileInputRef.current?.click()}
                            title="Cargar fichas desde un archivo Excel"
                            style={{ gap: '6px', fontSize: '0.84rem' }}
                        >
                            <Upload size={15} /> Cargar Excel
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={() => exportarLlamadasExcel(empresaActiva, filters, undefined, sortBy)}
                            title="Exportar todas las llamadas filtradas a Excel"
                            style={{ gap: '6px', fontSize: '0.84rem' }}
                        >
                            <Download size={15} /> Exportar Excel
                        </Button>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', borderLeft: '1px solid var(--border)', paddingLeft: '14px' }}>
                        {[
                            { color: '#3b82f6', label: 'Base de Datos' },
                            { color: '#10b981', label: 'Formulario' },
                            { color: '#f59e0b', label: 'Operador' },
                        ].map(({ color, label }) => (
                            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </header>

            {/* ── FILTERS ────────────────────────────── */}
            <LlamadaFilters filters={filters} updateFilter={updateFilter} />

            {/* ── LIST ───────────────────────────────── */}
            <section style={{ marginBottom: '32px' }}>
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
                        Fichas{' '}
                        <span className="muted" style={{ fontWeight: 500, fontSize: '1.2rem' }}>({total})</span>
                    </h2>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Ordenar por
                        </span>
                        <select
                            id="llamadas-sort-select"
                            value={sortBy}
                            onChange={(e) => {
                                setSortBy(e.target.value);
                                setPage(1);
                            }}
                            style={{
                                padding: '8px 14px',
                                borderRadius: '12px',
                                background: 'var(--bg-elevated)',
                                border: '1px solid var(--border)',
                                fontWeight: 500,
                                fontSize: '0.88rem',
                                color: 'var(--text)',
                                outline: 'none',
                                cursor: 'pointer',
                            }}
                        >
                            <option value="created_desc">Fecha de creación (Más reciente)</option>
                            <option value="created_asc">Fecha de creación (Más antigua)</option>
                            <option value="updated_desc">Última modificación</option>
                            <option value="nombre_asc">Nombre (A - Z)</option>
                            <option value="nombre_desc">Nombre (Z - A)</option>
                            <option value="comercio_asc">Comercio (A - Z)</option>
                            <option value="comercio_desc">Comercio (Z - A)</option>
                            <option value="operador_asc">Operador (A - Z)</option>
                        </select>
                    </div>
                </header>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', width: '100%' }}>
                    {isLoading ? (
                        Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="bento-card" style={{ padding: '24px', minHeight: '280px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div className="skeleton-line medium" style={{ marginBottom: '8px' }} />
                                <div className="skeleton-line short" />
                                <div className="skeleton-line short" />
                            </div>
                        ))
                    ) : llamadas.length === 0 ? (
                        <div style={{
                            gridColumn: '1 / -1',
                            background: 'var(--bg-elevated)', border: '1px dashed var(--border)',
                            borderRadius: '20px', padding: '60px', textAlign: 'center',
                        }}>
                            <Phone size={40} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
                            <p className="muted" style={{ fontSize: '1.1rem', margin: 0 }}>
                                No se encontraron fichas de llamada
                            </p>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: '8px 0 0' }}>
                                Creá una nueva ficha con el botón +
                            </p>
                        </div>
                    ) : (
                        llamadas.map((l, index) => (
                            <motion.div
                                key={l.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, delay: index * 0.04, ease: 'easeOut' }}
                                style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
                            >
                                <LlamadaCard
                                    llamada={l}
                                    onEdit={handleEdit}
                                    onDelete={handleDelete}
                                />
                            </motion.div>
                        ))
                    )}
                </div>
            </section>

            {/* ── PAGINACIÓN ─────────────────────────── */}
            {!isLoading && total > 0 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '24px' }}>
                    <Button variant="secondary" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                        <ChevronLeft size={16} />
                    </Button>
                    <span className="muted">Página {page} de {totalPages}</span>
                    <Button variant="secondary" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                        <ChevronRight size={16} />
                    </Button>
                </div>
            )}

            {/* ── MODAL ──────────────────────────────── */}
            <LlamadaModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                llamadaId={editingId}
                onSaved={handleSaved}
            />

            {/* ── FAB ────────────────────────────────── */}
            {createPortal(
                <div style={{ position: 'fixed', bottom: '30px', right: '30px', zIndex: 9999 }}>
                    <motion.button
                        whileHover={{ scale: 1.1, translateY: -5 }}
                        whileTap={{ scale: 0.9 }}
                        animate={{
                            boxShadow: [
                                '0 8px 20px -6px rgba(0,0,0,0.3)',
                                '0 8px 35px 5px rgba(0,0,0,0.15)',
                                '0 8px 20px -6px rgba(0,0,0,0.3)',
                            ],
                        }}
                        transition={{ boxShadow: { duration: 2, repeat: Infinity, ease: 'easeInOut' } }}
                        onClick={handleCreate}
                        id="btn-nueva-llamada"
                        style={{
                            width: '64px', height: '64px', borderRadius: '32px',
                            background: 'linear-gradient(135deg, var(--accent) 0%, #1a1a1a 100%)',
                            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: '2px solid rgba(255,255,255,0.2)', cursor: 'pointer',
                            boxShadow: '0 8px 20px -6px rgba(0,0,0,0.3)',
                        }}
                        title="Nueva ficha de llamada"
                    >
                        <Plus size={32} />
                    </motion.button>
                </div>,
                document.body
            )}
        </div>
    );
};

export default Llamadas;
