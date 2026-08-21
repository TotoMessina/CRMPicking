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
            <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md pointer-events-auto select-none">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 15 }}
                    transition={{ duration: 0.2 }}
                    className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100"
                >
                    {/* ── HEADER ── */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                                <FileSpreadsheet className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                                    {state.title}
                                    {state.status === 'processing' && (
                                        <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin" />
                                    )}
                                </h3>
                                <p className="text-xs text-slate-400">
                                    {state.fileName ? `Archivo: ${state.fileName}` : 'Procesando registros de Excel'}
                                </p>
                            </div>
                        </div>

                        {!isDone ? (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400 text-xs font-semibold animate-pulse">
                                <Lock className="w-3.5 h-3.5" />
                                <span>Carga en proceso — No cierre ni recargue la pestaña</span>
                            </div>
                        ) : (
                            <button
                                onClick={onClose}
                                className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                                title="Cerrar"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        )}
                    </div>

                    {/* ── METRICS GRID ── */}
                    <div className="p-6 bg-slate-900/60 border-b border-slate-800/80">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                            {/* Total Filas */}
                            <div className="p-3.5 bg-slate-800/60 border border-slate-700/50 rounded-xl">
                                <div className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                                    <Layers className="w-3.5 h-3.5 text-indigo-400" />
                                    Total Filas
                                </div>
                                <div className="mt-1 text-2xl font-bold text-slate-100">
                                    {state.totalRows}
                                </div>
                            </div>

                            {/* Faltan por Cargar */}
                            <div className="p-3.5 bg-cyan-950/30 border border-cyan-500/30 rounded-xl">
                                <div className="text-xs font-semibold text-cyan-400 flex items-center gap-1.5">
                                    <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${state.status === 'processing' ? 'animate-spin' : ''}`} />
                                    Faltan Cargar
                                </div>
                                <div className="mt-1 text-2xl font-bold text-cyan-300">
                                    {state.remainingRows}
                                </div>
                            </div>

                            {/* Cargados con Éxito */}
                            <div className="p-3.5 bg-emerald-950/30 border border-emerald-500/30 rounded-xl">
                                <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                    Cargados Éxito
                                </div>
                                <div className="mt-1 text-2xl font-bold text-emerald-300">
                                    {state.successCount + state.updatedCount}
                                </div>
                            </div>

                            {/* Omitidos / Errores */}
                            <div className="p-3.5 bg-amber-950/30 border border-amber-500/30 rounded-xl">
                                <div className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                                    <PhoneOff className="w-3.5 h-3.5 text-amber-400" />
                                    No Cargados
                                </div>
                                <div className="mt-1 text-2xl font-bold text-amber-300">
                                    {state.errorCount}
                                </div>
                            </div>
                        </div>

                        {/* ── PROGRESS BAR ── */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center text-xs">
                                <span className="font-semibold text-slate-300 truncate max-w-[70%]">
                                    {state.status === 'processing' && (
                                        <span className="text-indigo-400">
                                            Cargando fila {state.processedRows} de {state.totalRows}
                                            {state.currentRowName ? `: "${state.currentRowName}"` : ''}
                                        </span>
                                    )}
                                    {state.status === 'completed' && (
                                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                                            <Check className="w-4 h-4" /> Proceso de carga finalizado
                                        </span>
                                    )}
                                    {state.status === 'reading' && (
                                        <span className="text-cyan-400">Leyendo y analizando archivo Excel...</span>
                                    )}
                                </span>
                                <span className="font-bold text-indigo-400">{percent}%</span>
                            </div>

                            <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/60">
                                <motion.div
                                    className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 rounded-full"
                                    initial={{ width: '0%' }}
                                    animate={{ width: `${percent}%` }}
                                    transition={{ duration: 0.2 }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* ── AUDIT LOG & REJECTED REASONS ── */}
                    <div className="flex-1 min-h-[220px] max-h-[360px] overflow-y-auto p-6 space-y-3 bg-slate-950/40">
                        {/* Tabs Filter */}
                        <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setFilterTab('all')}
                                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                                        filterTab === 'all'
                                            ? 'bg-indigo-600 text-white shadow-sm'
                                            : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                                    }`}
                                >
                                    <ListFilter className="w-3.5 h-3.5" />
                                    Todos ({state.items.length})
                                </button>
                                <button
                                    onClick={() => setFilterTab('success')}
                                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                                        filterTab === 'success'
                                            ? 'bg-emerald-600 text-white shadow-sm'
                                            : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                                    }`}
                                >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    Cargados ({state.successCount + state.updatedCount})
                                </button>
                                <button
                                    onClick={() => setFilterTab('errors')}
                                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                                        filterTab === 'errors'
                                            ? 'bg-amber-600 text-white shadow-sm'
                                            : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                                    }`}
                                >
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    No Cargados / Errores ({state.errorCount})
                                </button>
                            </div>

                            <span className="text-[11px] text-slate-400 font-medium">
                                Mostrando {filteredItems.length} registros
                            </span>
                        </div>

                        {/* List items */}
                        {filteredItems.length === 0 ? (
                            <div className="text-center py-8 text-slate-500 text-sm">
                                {state.status === 'reading'
                                    ? 'Cargando datos...'
                                    : 'No hay registros en esta categoría.'}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {filteredItems.map((item: ImportRowResult, idx: number) => {
                                    const isErr = item.status === 'error' || item.status === 'skipped';
                                    const isUpdated = item.status === 'updated';

                                    return (
                                        <div
                                            key={idx}
                                            className={`p-3 rounded-xl border text-xs transition-all ${
                                                isErr
                                                    ? 'bg-rose-950/20 border-rose-500/40 text-rose-200'
                                                    : isUpdated
                                                    ? 'bg-blue-950/20 border-blue-500/30 text-blue-200'
                                                    : 'bg-emerald-950/10 border-emerald-500/30 text-emerald-200'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-start gap-2.5">
                                                    <div className="mt-0.5">
                                                        {isErr ? (
                                                            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                                                        ) : isUpdated ? (
                                                            <RefreshCw className="w-4 h-4 text-blue-400 shrink-0" />
                                                        ) : (
                                                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-slate-100 text-sm">
                                                            <span className="text-slate-400 mr-1 text-xs">Fila {item.rowIndex}:</span>
                                                            {item.name || 'Sin Nombre'}
                                                        </div>
                                                        {item.phone && (
                                                            <div className="text-[11px] text-slate-400 mt-0.5">
                                                                Teléfono: <span className="font-mono text-slate-300">{item.phone}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="shrink-0 text-right">
                                                    {isErr ? (
                                                        <span className="px-2 py-0.5 rounded-md bg-rose-500/20 border border-rose-500/30 text-rose-300 text-[10px] font-bold uppercase tracking-wider">
                                                            No Cargado
                                                        </span>
                                                    ) : isUpdated ? (
                                                        <span className="px-2 py-0.5 rounded-md bg-blue-500/20 border border-blue-500/30 text-blue-300 text-[10px] font-bold uppercase tracking-wider">
                                                            Actualizado
                                                        </span>
                                                    ) : (
                                                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold uppercase tracking-wider">
                                                            Nuevo
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Reason details for errors */}
                                            {isErr && item.reason && (
                                                <div className="mt-2 p-2 rounded-lg bg-rose-900/30 border border-rose-500/30 text-rose-300 text-[11px] leading-relaxed font-medium">
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
                    <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-900/90">
                        <div>
                            {state.errorCount > 0 && isDone && (
                                <button
                                    onClick={exportErrorsToCSV}
                                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-2 transition-colors"
                                >
                                    <Download className="w-3.5 h-3.5 text-amber-400" />
                                    Descargar Log de Errores (.CSV)
                                </button>
                            )}
                        </div>

                        <button
                            onClick={onClose}
                            disabled={!isDone}
                            className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-lg ${
                                isDone
                                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30 cursor-pointer'
                                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                            }`}
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
