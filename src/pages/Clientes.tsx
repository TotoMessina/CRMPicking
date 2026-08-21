import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/ui/Button';
import { Plus, ChevronLeft, ChevronRight, Download, Upload, MoreVertical, FileText } from 'lucide-react';
import { ClienteModal } from '../components/ui/ClienteModal';
import { ActividadClienteModal } from '../components/ui/ActividadClienteModal';
import { ExcelImportModal } from '../components/ui/ExcelImportModal';
import { ClienteCard } from '../components/ui/ClienteCard';
import { useAuth } from '../contexts/AuthContext';
import { useClientsLogic } from '../hooks/useClientsLogic';
import { ClientFilters } from '../components/clients/ClientFilters';
import { motion, AnimatePresence } from 'framer-motion';

const Clientes: React.FC = () => {
    const { isDemoMode } = useAuth();
    const { t } = useTranslation();
    const {
        isAgendaHoy, page, setPage, totalPages, loading, clientes, total, activities,
        filters, updateFilter, rubrosValidos, responsablesValidos, gruposValidos, sortBy, setSortBy, expandedActivities, toggleHistory,
        exportLoading, handleDescargarExcel, handleImportExcel, handleDescargarModelo,
        importState, closeImportModal,
        modalOpen, setModalOpen, editingId, handleCreate, handleEdit, handleDelete,
        actModalOpen, setActModalOpen, actTargetId, actTargetName, handleOpenActivity,
        handleQuickDate, handleRegistrarVisita, handleRegistrarLlamada, queryClient
    } = useClientsLogic();
    
    const [actionsOpen, setActionsOpen] = useState(false);

    return (
        <div className="page-container" style={{ padding: '0', maxWidth: '100%', margin: '0 auto', position: 'relative' }}>

            {/* 1. HERO HEADER */}
            <header style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', gap: '16px' }}>
                <div>
                    <h1 style={{ fontSize: '2.2rem', fontWeight: 800, margin: '0 0 8px 0', letterSpacing: '-0.02em', background: 'linear-gradient(135deg, var(--text) 0%, var(--text-muted) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        {isAgendaHoy ? t('clients.agenda_today') : t('clients.title')}
                    </h1>
                    <p className="muted" style={{ margin: 0, fontSize: '1.1rem' }}>
                        {isAgendaHoy ? t('clients.agenda_subtitle') : t('clients.subtitle')}
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
                        <span className="hide-mobile">{t('clients.actions')}</span>
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
                                        onClick={() => { handleDescargarModelo(); setActionsOpen(false); }}
                                        style={{ width: '100%', padding: '10px 14px', textAlign: 'left', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', color: 'var(--text)' }}
                                    >
                                        <FileText size={16} className="text-accent" /> {t('clients.download_model')}
                                    </button>
                                    <button 
                                        className="dropdown-item" 
                                        onClick={() => { handleDescargarExcel(); setActionsOpen(false); }}
                                        style={{ width: '100%', padding: '10px 14px', textAlign: 'left', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', color: 'var(--text)' }}
                                    >
                                        <Download size={16} className="text-accent" /> {t('clients.export')}
                                    </button>
                                    <label 
                                        className="dropdown-item" 
                                        style={{ width: '100%', padding: '10px 14px', textAlign: 'left', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', color: 'var(--text)', cursor: 'pointer' }}
                                    >
                                        <Upload size={16} className="text-accent" /> {t('clients.import')}
                                        <input type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={(e) => { handleImportExcel(e as any); setActionsOpen(false); }} />
                                    </label>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </div>
            </header>

            {/* 2. FILTERS */}
            <ClientFilters
                filters={filters}
                updateFilter={updateFilter}
                rubrosValidos={rubrosValidos}
                responsablesValidos={responsablesValidos}
                gruposValidos={gruposValidos}
            />

            {/* 3. LIST SECTION */}
            <section style={{ marginBottom: '32px' }}>
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
                        {t('clients.list')} <span className="muted" style={{ fontWeight: 500, fontSize: '1.2rem' }}>({total})</span>
                    </h2>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('clients.sort_by')}</span>
                        <select
                            className="input"
                            value={sortBy}
                            onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                            style={{ padding: '8px 12px', borderRadius: '10px', minWidth: '180px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', fontWeight: 500, fontSize: '0.9rem', color: 'var(--text)' }}
                        >
                             <option value="updated">{t('clients.sorting.updated')}</option>
                            <option value="recent">{t('clients.sorting.recent')}</option>
                            <option value="oldest">{t('clients.sorting.oldest')}</option>
                            <option value="activity_desc">{t('clients.sorting.activity_desc')}</option>
                            <option value="activity_asc">{t('clients.sorting.activity_asc')}</option>
                            <option value="az">{t('clients.sorting.az')}</option>
                            <option value="za">{t('clients.sorting.za')}</option>
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
                            <p className="muted" style={{ fontSize: '1.1rem' }}>{t('clients.no_results')}</p>
                        </div>
                    ) : clientes.map((c: any, index: number) => (
                        <motion.div
                            key={c.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: index * 0.05, ease: 'easeOut' }}
                        >
                            <ClienteCard
                                cliente={c}
                                acts={activities[c.id] || []}
                                isExpanded={expandedActivities[c.id] || false}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                                onQuickDate={handleQuickDate}
                                onToggleHistory={toggleHistory}
                                onRegistrarVisita={handleRegistrarVisita}
                                onRegistrarLlamada={handleRegistrarLlamada}
                                onOpenActivity={handleOpenActivity}
                            />
                        </motion.div>
                    ))}
                </div>
            </section>

            {!loading && total > 0 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '24px' }}>
                    <Button variant="secondary" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft size={16} /></Button>
                    <span className="muted">{t('clients.page_x_of_y', { page, totalPages })}</span>
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
                    queryClient.refetchQueries({ queryKey: ['clientes'] });
                }}
            />

            <ActividadClienteModal
                isOpen={actModalOpen}
                onClose={() => setActModalOpen(false)}
                clienteId={actTargetId}
                clienteNombre={actTargetName}
                onSaved={() => { setActModalOpen(false); queryClient.invalidateQueries({ queryKey: ['clientes'] }); }}
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
                        id="btn-nuevo-cliente"
                        style={{
                            pointerEvents: 'auto',
                            width: '64px', height: '64px', borderRadius: '32px',
                            background: 'linear-gradient(135deg, var(--accent) 0%, #1a1a1a 100%)',
                            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: '2px solid rgba(255,255,255,0.2)', cursor: 'pointer',
                            boxShadow: '0 8px 20px -6px rgba(0, 0, 0, 0.3)'
                        }}
                        title={t('clients.new_client_title')}
                    >
                        <Plus size={32} />
                    </motion.button>
                </div>,
                document.body
            )}

            <style tabIndex={-1}>{`
                .dropdown-item:hover { background: var(--bg-elevated); color: var(--primary) !important; }
                .text-accent { color: var(--primary); }
            `}</style>
            <ExcelImportModal state={importState} onClose={closeImportModal} />
        </div>
    );
}

export default Clientes;
