import { Button } from '../ui/Button';

export const StatsFilters = ({ 
    rangePreset, setRangePreset, 
    dateFrom, setDateFrom, 
    dateTo, setDateTo, 
    filterActivator, setFilterActivator, 
    activators, 
    refreshStats, 
    loading 
}) => {
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

                <select className="input" style={{ minWidth: '180px' }} value={filterActivator} onChange={(e) => setFilterActivator(e.target.value)}>
                    <option value="">👨‍💼 Todo el Equipo</option>
                    {activators.map(a => <option key={a.email} value={a.nombre}>{a.nombre}</option>)}
                </select>

                <Button variant="secondary" onClick={refreshStats} disabled={loading}>
                    {loading ? 'Cargando...' : 'Actualizar'}
                </Button>
            </div>
        </header>
    );
};
