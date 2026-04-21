import React, { useState, useRef, useEffect } from 'react';
import { Users, ChevronDown, Check, Download, FileText, Printer, Sliders } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/Button';
import { Activator } from '../../hooks/useStatistics';

interface Props {
    rangePreset: string;
    setRangePreset: (val: string) => void;
    dateFrom: string;
    setDateFrom: (val: string) => void;
    dateTo: string;
    setDateTo: (val: string) => void;
    filterActivator: string[];
    setFilterActivator: (val: string[]) => void;
    activators: Activator[];
    refreshStats: () => void;
    onExport: () => void;
    onExportPdf: () => void;
    isExportingPdf?: boolean;
    loading: boolean;
    onCustomize?: () => void;
}

export const StatsFilters: React.FC<Props> = ({ 
    rangePreset, setRangePreset, 
    dateFrom, setDateFrom, 
    dateTo, setDateTo, 
    filterActivator, setFilterActivator, 
    activators, 
    refreshStats, 
    onExport,
    onExportPdf,
    isExportingPdf,
    loading,
    onCustomize 
}) => {
    const [openActivators, setOpenActivators] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setOpenActivators(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <header className="stats-topbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '16px' }}>
            <div className="stats-title">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <h1 style={{ margin: 0 }}>Estadísticas</h1>
                </div>
                <p className="muted" style={{ margin: 4 }}>Vista de cartera, agenda y actividad.</p>
            </div>

            <div className="stats-topbar-actions" style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', background: 'var(--bg-elevated)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <select className="input" style={{ minWidth: '150px' }} value={rangePreset} onChange={(e) => setRangePreset(e.target.value)}>
                    <option value="7d">Últimos 7 días</option>
                    <option value="30d">Últimos 30 días</option>
                    <option value="60d">Últimos 60 días</option>
                    <option value="90d">Últimos 90 días</option>
                    <option value="6m">Últimos 6 meses</option>
                    <option value="1y">Último año</option>
                    <option value="custom">Personalizado</option>
                </select>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input 
                        type="date" 
                        className="input" 
                        value={dateFrom} 
                        onChange={e => { setDateFrom(e.target.value); setRangePreset('custom'); }} 
                    />
                    <span className="muted">→</span>
                    <input 
                        type="date" 
                        className="input" 
                        value={dateTo} 
                        onChange={e => { setDateTo(e.target.value); setRangePreset('custom'); }} 
                    />
                </div>

                <div style={{ position: 'relative' }} ref={dropdownRef}>
                    <button 
                        className="input" 
                        style={{ 
                            minWidth: '220px', 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center', 
                            background: filterActivator.length > 0 ? 'var(--accent-soft, rgba(99, 102, 241, 0.1))' : 'var(--bg)',
                            borderColor: filterActivator.length > 0 ? 'var(--accent, #6366f1)' : 'var(--border)',
                            color: filterActivator.length > 0 ? 'var(--accent, #6366f1)' : 'var(--text)',
                            transition: 'all 0.2s ease',
                            padding: '8px 14px'
                        }} 
                        onClick={() => setOpenActivators(!openActivators)}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                            <Users size={16} />
                            <span>
                                {filterActivator.length === 0 
                                    ? 'Todo el Equipo' 
                                    : filterActivator.length === 1 
                                        ? filterActivator[0] 
                                        : `${filterActivator.length} seleccionados`}
                            </span>
                        </div>
                        <ChevronDown size={14} style={{ opacity: 0.7, transform: openActivators ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
                    </button>
                    <AnimatePresence>
                    {openActivators && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                            transition={{ duration: 0.15 }}
                            style={{ 
                            position: 'absolute', top: '100%', left: 0, marginTop: '8px', 
                            background: 'var(--bg-elevated)', border: '1px solid var(--border)', 
                            borderRadius: '12px', padding: '8px', zIndex: 50, minWidth: '100%', 
                            boxShadow: '0 10px 25px rgba(0,0,0,0.2)', maxHeight: '320px', 
                            overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px'
                        }}>
                            <div 
                                onClick={() => { setFilterActivator([]); setOpenActivators(false); }}
                                style={{ 
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                                    padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', 
                                    background: filterActivator.length === 0 ? 'var(--accent-soft, rgba(99, 102, 241, 0.15))' : 'transparent',
                                    color: filterActivator.length === 0 ? 'var(--accent, #6366f1)' : 'var(--text)',
                                    fontWeight: filterActivator.length === 0 ? 700 : 500,
                                    borderBottom: '1px solid var(--border)', marginBottom: '4px',
                                    transition: 'background 0.15s ease'
                                }}
                            >
                                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    Todo el Equipo
                                </span>
                                {filterActivator.length === 0 && <Check size={16} />}
                            </div>

                            {activators.map(a => {
                                const isSelected = filterActivator.includes(a.nombre);
                                return (
                                    <div 
                                        key={a.email} 
                                        onClick={() => {
                                            if (isSelected) setFilterActivator(filterActivator.filter(f => f !== a.nombre));
                                            else setFilterActivator([...filterActivator, a.nombre]);
                                        }}
                                        style={{ 
                                            display: 'flex', alignItems: 'center', gap: '10px', 
                                            padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', 
                                            background: isSelected ? 'var(--accent-soft, rgba(99, 102, 241, 0.08))' : 'transparent',
                                            color: isSelected ? 'var(--accent, #6366f1)' : 'var(--text)',
                                            fontWeight: isSelected ? 600 : 500,
                                            transition: 'background 0.15s ease'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!isSelected) e.currentTarget.style.background = 'var(--bg-hover, rgba(255, 255, 255, 0.05))';
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!isSelected) e.currentTarget.style.background = 'transparent';
                                        }}
                                    >
                                        <div style={{
                                            width: '18px', height: '18px', borderRadius: '4px',
                                            border: `2px solid ${isSelected ? 'var(--accent, #6366f1)' : 'var(--text-muted)'}`,
                                            background: isSelected ? 'var(--accent, #6366f1)' : 'transparent',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            transition: 'all 0.15s ease', flexShrink: 0
                                        }}>
                                            {isSelected && <Check size={12} color="white" strokeWidth={3} />}
                                        </div>
                                        <span>{a.nombre}</span>
                                    </div>
                                );
                            })}
                        </motion.div>
                    )}
                    </AnimatePresence>
                </div>

                {!isExportingPdf && (
                    <>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <Button variant="secondary" onClick={() => window.print()} disabled={loading} style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'var(--bg-elevated)' }}>
                                <Printer size={16} /> Imprimir
                            </Button>
                            <Button variant="secondary" onClick={onExport} disabled={loading} style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'var(--bg-elevated)' }}>
                                <Download size={16} /> Excel (.xlsx)
                            </Button>
                            <Button variant="primary" onClick={onExportPdf} disabled={loading} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <FileText size={16} /> PDF Reporte
                            </Button>
                        </div>
                        <Button variant="secondary" onClick={refreshStats} disabled={loading}>
                            {loading ? 'Cargando...' : 'Actualizar'}
                        </Button>
                        {onCustomize && (
                            <button
                                onClick={onCustomize}
                                title="Personalizar dashboard"
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                    padding: '8px 14px', borderRadius: '10px',
                                    background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15))',
                                    border: '1px solid rgba(99,102,241,0.35)',
                                    color: '#6366f1', cursor: 'pointer',
                                    fontSize: '0.82rem', fontWeight: 700,
                                    transition: 'all 0.2s ease',
                                    whiteSpace: 'nowrap',
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(139,92,246,0.25))';
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15))';
                                    e.currentTarget.style.transform = 'none';
                                }}
                            >
                                <Sliders size={15} />
                                Personalizar
                            </button>
                        )}
                    </>
                )}
            </div>
        </header>
    );
};
