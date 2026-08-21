import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FileSpreadsheet,
    X,
    CheckCircle2,
    AlertTriangle,
    RefreshCw,
    Download,
    PhoneOff,
    Check,
    Layers,
    ListFilter,
    Lock
} from 'lucide-react';
import { ImportProgressState, ImportRowResult } from '../../types/excelImport';

interface Props {
    state: ImportProgressState;
    onClose: () => void;
}

export const ExcelImportModal: React.FC<Props> = ({ state, onClose }) => {
    const [filterTab, setFilterTab] = useState<'all' | 'success' | 'errors'>('all');

    const isDone = state.status === 'completed' || state.status === 'error';

    useEffect(() => {
        if (state.isOpen && !isDone) {
            const handleBeforeUnload = (e: BeforeUnloadEvent) => {
                e.preventDefault();
                e.returnValue = 'Hay una carga de datos en proceso. Si sales o recargas la página, la importación se cancelará.';
                return e.returnValue;
            };
            window.addEventListener('beforeunload', handleBeforeUnload);
            return () => {
                window.removeEventListener('beforeunload', handleBeforeUnload);
            };
        }
    }, [state.isOpen, isDone]);

    if (!state.isOpen) return null;

    const percent = state.totalRows > 0
        ? Math.min(100, Math.round((state.processedRows / state.totalRows) * 100))
        : 0;

    const filteredItems = state.items.filter(item => {
        if (filterTab === 'success') return item.status === 'success' || item.status === 'updated';
        if (filterTab === 'errors') return item.status === 'error' || item.status === 'skipped';
        return true;
    });

    const exportErrorsToCSV = () => {
        const errorItems = state.items.filter(i => i.status === 'error' || i.status === 'skipped');
        if (errorItems.length === 0) return;

        const headers = ['Fila', 'Nombre', 'Telefono Presentado', 'Motivo de Rechazo'];
        const csvRows = [headers.join(',')];

        errorItems.forEach(item => {
            const escapedName = `"${(item.name || '').replace(/"/g, '""')}"`;
            const escapedPhone = `"${(item.phone || '').replace(/"/g, '""')}"`;
            const escapedReason = `"${(item.reason || '').replace(/"/g, '""')}"`;
            csvRows.push([item.rowIndex, escapedName, escapedPhone, escapedReason].join(','));
        });

        const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + csvRows.join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `errores_importacion_${state.fileName || 'excel'}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return createPortal(
        <AnimatePresence>
            <div style={{
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                zIndex: 99999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px',
                backgroundColor: 'rgba(2, 6, 23, 0.88)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                pointerEvents: 'auto',
                userSelect: 'none',
            }}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 15 }}
                    transition={{ duration: 0.2 }}
                    style={{
                        position: 'relative',
                        width: '100%',
                        maxWidth: '750px',
                        maxHeight: '90vh',
                        display: 'flex',
                        flexDirection: 'column',
                        backgroundColor: '#0f172a',
                        border: '1px solid #334155',
                        borderRadius: '20px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
                        overflow: 'hidden',
                        color: '#f8fafc',
                        fontFamily: 'system-ui, -apple-system, sans-serif'
                    }}
                >
                    {/* ── HEADER ── */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '18px 24px',
                        borderBottom: '1px solid #1e293b',
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                                padding: '10px',
                                borderRadius: '12px',
                                backgroundColor: 'rgba(99, 102, 241, 0.15)',
                                border: '1px solid rgba(99, 102, 241, 0.3)',
                                color: '#818cf8',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <FileSpreadsheet size={24} />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {state.title}
                                    {state.status === 'processing' && (
                                        <RefreshCw size={16} style={{ color: '#818cf8', animation: 'spin 1s linear infinite' }} />
                                    )}
                                </h3>
                                <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
                                    {state.fileName ? `Archivo: ${state.fileName}` : 'Procesando registros de Excel'}
                                </p>
                            </div>
                        </div>

                        {!isDone ? (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 12px',
                                backgroundColor: 'rgba(245, 158, 11, 0.12)',
                                border: '1px solid rgba(245, 158, 11, 0.3)',
                                borderRadius: '10px',
                                color: '#fbbf24',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                            }}>
                                <Lock size={14} />
                                <span>Carga en proceso — No cierre la pestaña</span>
                            </div>
                        ) : (
                            <button
                                onClick={onClose}
                                style={{
                                    padding: '8px',
                                    backgroundColor: 'transparent',
                                    border: 'none',
                                    color: '#94a3b8',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                                title="Cerrar"
                            >
                                <X size={20} />
                            </button>
                        )}
                    </div>

                    {/* ── METRICS GRID ── */}
                    <div style={{ padding: '24px', backgroundColor: 'rgba(15, 23, 42, 0.6)', borderBottom: '1px solid #1e293b' }}>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                            gap: '12px',
                            marginBottom: '20px'
                        }}>
                            {/* Total Filas */}
                            <div style={{ padding: '14px', backgroundColor: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(51, 65, 85, 0.6)', borderRadius: '14px' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Layers size={14} style={{ color: '#818cf8' }} />
                                    Total Filas
                                </div>
                                <div style={{ marginTop: '6px', fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc' }}>
                                    {state.totalRows}
                                </div>
                            </div>

                            {/* Faltan por Cargar */}
                            <div style={{ padding: '14px', backgroundColor: 'rgba(8, 145, 178, 0.12)', border: '1px solid rgba(6, 182, 212, 0.3)', borderRadius: '14px' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#22d3ee', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <RefreshCw size={14} style={{ color: '#22d3ee', animation: state.status === 'processing' ? 'spin 1s linear infinite' : 'none' }} />
                                    Faltan Cargar
                                </div>
                                <div style={{ marginTop: '6px', fontSize: '1.5rem', fontWeight: 800, color: '#67e8f9' }}>
                                    {state.remainingRows}
                                </div>
                            </div>

                            {/* Cargados con Éxito */}
                            <div style={{ padding: '14px', backgroundColor: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '14px' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#34d399', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <CheckCircle2 size={14} style={{ color: '#34d399' }} />
                                    Cargados Éxito
                                </div>
                                <div style={{ marginTop: '6px', fontSize: '1.5rem', fontWeight: 800, color: '#6ee7b7' }}>
                                    {state.successCount + state.updatedCount}
                                </div>
                            </div>

                            {/* Omitidos / Errores */}
                            <div style={{ padding: '14px', backgroundColor: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '14px' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <PhoneOff size={14} style={{ color: '#fbbf24' }} />
                                    No Cargados
                                </div>
                                <div style={{ marginTop: '6px', fontSize: '1.5rem', fontWeight: 800, color: '#fde68a' }}>
                                    {state.errorCount}
                                </div>
                            </div>
                        </div>

                        {/* ── PROGRESS BAR ── */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                                <span style={{ fontWeight: 600, color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }}>
                                    {state.status === 'processing' && (
                                        <span style={{ color: '#818cf8' }}>
                                            Cargando fila {state.processedRows} de {state.totalRows}
                                            {state.currentRowName ? `: "${state.currentRowName}"` : ''}
                                        </span>
                                    )}
                                    {state.status === 'completed' && (
                                        <span style={{ color: '#34d399', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Check size={16} /> Proceso de carga finalizado
                                        </span>
                                    )}
                                    {state.status === 'reading' && (
                                        <span style={{ color: '#22d3ee' }}>Leyendo y analizando archivo Excel...</span>
                                    )}
                                </span>
                                <span style={{ fontWeight: 800, color: '#818cf8', fontSize: '0.95rem' }}>{percent}%</span>
                            </div>

                            <div style={{
                                width: '100%',
                                height: '14px',
                                backgroundColor: '#1e293b',
                                borderRadius: '9999px',
                                overflow: 'hidden',
                                padding: '2px',
                                border: '1px solid #334155',
                            }}>
                                <motion.div
                                    style={{
                                        height: '100%',
                                        background: 'linear-gradient(90deg, #6366f1 0%, #a855f7 50%, #10b981 100%)',
                                        borderRadius: '9999px',
                                    }}
                                    initial={{ width: '0%' }}
                                    animate={{ width: `${percent}%` }}
                                    transition={{ duration: 0.2 }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* ── AUDIT LOG & REJECTED REASONS ── */}
                    <div style={{
                        flex: 1,
                        minHeight: '220px',
                        maxHeight: '360px',
                        overflowY: 'auto',
                        padding: '20px 24px',
                        backgroundColor: 'rgba(2, 6, 23, 0.5)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                    }}>
                        {/* Tabs Filter */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', borderBottom: '1px solid #1e293b', paddingBottom: '10px' }}>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    type="button"
                                    onClick={() => setFilterTab('all')}
                                    style={{
                                        padding: '6px 12px',
                                        fontSize: '0.78rem',
                                        fontWeight: 600,
                                        borderRadius: '8px',
                                        border: 'none',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        backgroundColor: filterTab === 'all' ? '#4f46e5' : 'rgba(30, 41, 59, 0.8)',
                                        color: filterTab === 'all' ? '#ffffff' : '#94a3b8',
                                    }}
                                >
                                    <ListFilter size={14} />
                                    Todos ({state.items.length})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFilterTab('success')}
                                    style={{
                                        padding: '6px 12px',
                                        fontSize: '0.78rem',
                                        fontWeight: 600,
                                        borderRadius: '8px',
                                        border: 'none',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        backgroundColor: filterTab === 'success' ? '#059669' : 'rgba(30, 41, 59, 0.8)',
                                        color: filterTab === 'success' ? '#ffffff' : '#94a3b8',
                                    }}
                                >
                                    <CheckCircle2 size={14} />
                                    Cargados ({state.successCount + state.updatedCount})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFilterTab('errors')}
                                    style={{
                                        padding: '6px 12px',
                                        fontSize: '0.78rem',
                                        fontWeight: 600,
                                        borderRadius: '8px',
                                        border: 'none',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        backgroundColor: filterTab === 'errors' ? '#d97706' : 'rgba(30, 41, 59, 0.8)',
                                        color: filterTab === 'errors' ? '#ffffff' : '#94a3b8',
                                    }}
                                >
                                    <AlertTriangle size={14} />
                                    No Cargados ({state.errorCount})
                                </button>
                            </div>

                            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500 }}>
                                {filteredItems.length} registros
                            </span>
                        </div>

                        {/* List items */}
                        {filteredItems.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '32px 0', color: '#64748b', fontSize: '0.88rem' }}>
                                {state.status === 'reading'
                                    ? 'Analizando archivo...'
                                    : 'No hay registros en esta categoría.'}
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {filteredItems.map((item: ImportRowResult, idx: number) => {
                                    const isErr = item.status === 'error' || item.status === 'skipped';
                                    const isUpdated = item.status === 'updated';

                                    return (
                                        <div
                                            key={idx}
                                            style={{
                                                padding: '12px 14px',
                                                borderRadius: '12px',
                                                border: `1px solid ${isErr ? 'rgba(244, 63, 94, 0.3)' : isUpdated ? 'rgba(59, 130, 246, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                                                backgroundColor: isErr ? 'rgba(136, 19, 55, 0.2)' : isUpdated ? 'rgba(30, 58, 138, 0.2)' : 'rgba(6, 78, 59, 0.2)',
                                                color: isErr ? '#fecdd3' : isUpdated ? '#bfdbfe' : '#a7f3d0',
                                                fontSize: '0.8rem',
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                                    <div style={{ marginTop: '2px' }}>
                                                        {isErr ? (
                                                            <AlertTriangle size={16} style={{ color: '#fb7185', flexShrink: 0 }} />
                                                        ) : isUpdated ? (
                                                            <RefreshCw size={16} style={{ color: '#60a5fa', flexShrink: 0 }} />
                                                        ) : (
                                                            <CheckCircle2 size={16} style={{ color: '#34d399', flexShrink: 0 }} />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.88rem' }}>
                                                            <span style={{ color: '#94a3b8', marginRight: '6px', fontSize: '0.78rem', fontWeight: 500 }}>Fila {item.rowIndex}:</span>
                                                            {item.name || 'Sin Nombre'}
                                                        </div>
                                                        {item.phone && (
                                                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                                                                Teléfono: <span style={{ fontFamily: 'monospace', color: '#cbd5e1' }}>{item.phone}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div style={{ flexShrink: 0, textAlign: 'right' }}>
                                                    {isErr ? (
                                                        <span style={{ padding: '3px 8px', borderRadius: '6px', backgroundColor: 'rgba(244, 63, 94, 0.2)', border: '1px solid rgba(244, 63, 94, 0.3)', color: '#fca5a5', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase' }}>
                                                            No Cargado
                                                        </span>
                                                    ) : isUpdated ? (
                                                        <span style={{ padding: '3px 8px', borderRadius: '6px', backgroundColor: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#93c5fd', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase' }}>
                                                            Actualizado
                                                        </span>
                                                    ) : (
                                                        <span style={{ padding: '3px 8px', borderRadius: '6px', backgroundColor: 'rgba(16, 185, 129, 0.2)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#6ee7b7', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase' }}>
                                                            Nuevo
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Reason details for errors */}
                                            {isErr && item.reason && (
                                                <div style={{ marginTop: '8px', padding: '8px 10px', borderRadius: '8px', backgroundColor: 'rgba(159, 18, 57, 0.3)', border: '1px solid rgba(244, 63, 94, 0.3)', color: '#fecdd3', fontSize: '0.75rem', lineHeight: 1.4 }}>
                                                    <strong>Motivo:</strong> {item.reason}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* ── FOOTER ── */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '16px 24px',
                        borderTop: '1px solid #1e293b',
                        backgroundColor: 'rgba(15, 23, 42, 0.95)'
                    }}>
                        <div>
                            {state.errorCount > 0 && isDone && (
                                <button
                                    type="button"
                                    onClick={exportErrorsToCSV}
                                    style={{
                                        padding: '8px 14px',
                                        borderRadius: '10px',
                                        backgroundColor: '#1e293b',
                                        color: '#cbd5e1',
                                        border: '1px solid #334155',
                                        fontSize: '0.78rem',
                                        fontWeight: 600,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        cursor: 'pointer',
                                    }}
                                >
                                    <Download size={14} style={{ color: '#fbbf24' }} />
                                    Descargar Log de Errores (.CSV)
                                </button>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            disabled={!isDone}
                            style={{
                                padding: '10px 20px',
                                borderRadius: '12px',
                                fontWeight: 700,
                                fontSize: '0.82rem',
                                border: 'none',
                                cursor: isDone ? 'pointer' : 'not-allowed',
                                backgroundColor: isDone ? '#4f46e5' : '#1e293b',
                                color: isDone ? '#ffffff' : '#64748b',
                                boxShadow: isDone ? '0 4px 12px rgba(79, 70, 229, 0.35)' : 'none',
                                transition: 'all 0.2s',
                            }}
                        >
                            {isDone ? 'Aceptar y Cerrar' : 'Procesando...'}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>,
        document.body
    );
};
