import React, { useState, useRef, useEffect } from 'react';
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
    loading: boolean;
}

export const StatsFilters: React.FC<Props> = ({ 
    rangePreset, setRangePreset, 
    dateFrom, setDateFrom, 
    dateTo, setDateTo, 
    filterActivator, setFilterActivator, 
    activators, 
    refreshStats, 
    loading 
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
                        style={{ minWidth: '180px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg)' }} 
                        onClick={() => setOpenActivators(!openActivators)}
                    >
                        <span>{filterActivator.length === 0 ? '👨‍💼 Todo el Equipo' : `👨‍💼 Seleccionados (${filterActivator.length})`}</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>▼</span>
                    </button>
                    {openActivators && (
                        <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '4px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px', zIndex: 10, minWidth: '100%', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', maxHeight: '250px', overflowY: 'auto' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px', cursor: 'pointer', fontSize: '0.9rem', borderBottom: '1px solid var(--border)', marginBottom: '4px' }}>
                                <input type="checkbox" checked={filterActivator.length === 0} onChange={() => setFilterActivator([])} style={{ accentColor: 'var(--accent)', cursor: 'pointer' }} />
                                Todo el Equipo
                            </label>
                            {activators.map(a => (
                                <label key={a.email} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text)' }}>
                                    <input type="checkbox" checked={filterActivator.includes(a.nombre)} onChange={(e) => {
                                        if (e.target.checked) setFilterActivator([...filterActivator, a.nombre]);
                                        else setFilterActivator(filterActivator.filter(f => f !== a.nombre));
                                    }} style={{ accentColor: 'var(--accent)', cursor: 'pointer' }} />
                                    {a.nombre}
                                </label>
                            ))}
                        </div>
                    )}
                </div>

                <Button variant="secondary" onClick={refreshStats} disabled={loading}>
                    {loading ? 'Cargando...' : 'Actualizar'}
                </Button>
            </div>
        </header>
    );
};
