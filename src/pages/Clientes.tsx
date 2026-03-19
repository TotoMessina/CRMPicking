import React from 'react';
import { Button } from '../components/ui/Button';
import { Plus, ChevronLeft, ChevronRight, Download, Upload } from 'lucide-react';
import { ClienteModal } from '../components/ui/ClienteModal';
import { ActividadClienteModal } from '../components/ui/ActividadClienteModal';
import { ClienteCard } from '../components/ui/ClienteCard';
import { useClientsLogic } from '../hooks/useClientsLogic';
import { ClientFilters } from '../components/clients/ClientFilters';

const Clientes: React.FC = () => {
    const {
        isAgendaHoy, page, setPage, totalPages, loading, clientes, total, activities,
        filters, updateFilter, rubrosValidos, sortBy, setSortBy, expandedActivities, toggleHistory,
        exportLoading, handleDescargarExcel, handleImportExcel, handleDescargarModelo,
        modalOpen, setModalOpen, editingId, handleCreate, handleEdit, handleDelete,
        actModalOpen, setActModalOpen, actTargetId, actTargetName, handleOpenActivity,
        handleQuickDate, handleRegistrarVisita, queryClient
    } = useClientsLogic();

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
                        <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', borderRadius: '99px', border: 'none', background: 'transparent', padding: '8px 16px', color: 'var(--text-muted)' }} title="Importar desde Excel">
                            <Upload size={18} />
                            <input type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleImportExcel as any} />
                        </label>
                    </div>

                    <Button variant="primary" onClick={handleCreate} className="btn-text-hide-mobile" style={{ padding: '10px 24px', fontSize: '1.05rem', fontWeight: 600, borderRadius: '99px', boxShadow: '0 8px 20px -6px rgba(37, 99, 235, 0.5)' }}>
                        <Plus size={20} /> <span>Nuevo Cliente</span>
                    </Button>
                </div>
            </header>

            {/* 2. FILTERS */}
            <ClientFilters
                filters={filters}
                updateFilter={updateFilter}
                rubrosValidos={rubrosValidos}
            />

            {/* 3. LIST SECTION */}
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
                    ) : clientes.map((c: any) => (
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

export default Clientes;
