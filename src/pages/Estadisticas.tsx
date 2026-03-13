import React from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { useStatistics } from '../hooks/useStatistics';
import { StatsFilters } from '../components/stats/StatsFilters';
import { StatKpiCards } from '../components/stats/StatKpiCards';
import { ChartsSection } from '../components/stats/ChartsSection';
import { SituacionChart } from '../components/stats/SituacionChart';
import { RubrosSituacionChart } from '../components/stats/RubrosSituacionChart';
import { ActivadoresPerformance } from '../components/stats/ActivadoresPerformance';
import { STATS_THEME } from '../constants/statsConstants';
import ErrorBoundary from '../components/common/ErrorBoundary';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

const Estadisticas: React.FC = () => {
    const {
        currentTab, setCurrentTab,
        rangePreset, setRangePreset,
        dateFrom, setDateFrom,
        dateTo, setDateTo,
        filterActivator, setFilterActivator,
        loading, lastUpdate,
        activators, rubrosEstado5Data,
        kpis, chartsData, listsData,
        totalSituacion, refreshStats,
        filtroSituacionRubros, setFiltroSituacionRubros
    } = useStatistics();

    return (
        <div className="stats-dashboard" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '16px', overflowY: 'auto' }}>
            <StatsFilters 
                rangePreset={rangePreset as string} setRangePreset={setRangePreset}
                dateFrom={dateFrom} setDateFrom={setDateFrom}
                dateTo={dateTo} setDateTo={setDateTo}
                filterActivator={filterActivator} setFilterActivator={setFilterActivator}
                activators={activators}
                refreshStats={refreshStats}
                loading={loading}
            />

            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
                <div
                    style={{ flex: 1, padding: '12px', textAlign: 'center', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', background: currentTab === 'tabApps' ? STATS_THEME.colors.primary : 'var(--bg-elevated)', color: currentTab === 'tabApps' ? '#fff' : 'var(--text)' }}
                    onClick={() => setCurrentTab('tabApps')}
                >
                    🚀 Ecosistema Apps
                </div>
                <div
                    style={{ flex: 1, padding: '12px', textAlign: 'center', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', background: currentTab === 'tabActivadores' ? STATS_THEME.colors.primary : 'var(--bg-elevated)', color: currentTab === 'tabActivadores' ? '#fff' : 'var(--text)' }}
                    onClick={() => setCurrentTab('tabActivadores')}
                >
                    ⚡ Gestión Activadores
                </div>
            </div>

            {currentTab === 'tabApps' && (
                <div className="tab-content active">
                    <ErrorBoundary>
                        <StatKpiCards kpis={kpis} />
                    </ErrorBoundary>
                    
                    <ErrorBoundary>
                        <ChartsSection chartsData={chartsData} listsData={listsData} />
                    </ErrorBoundary>
                    
                    <ErrorBoundary>
                        <SituacionChart data={chartsData.situacionLocales} total={totalSituacion} />
                    </ErrorBoundary>
                    
                    <ErrorBoundary>
                        <RubrosSituacionChart data={rubrosEstado5Data} filter={filtroSituacionRubros} setFilter={setFiltroSituacionRubros} />
                    </ErrorBoundary>
                </div>
            )}

            {currentTab === 'tabActivadores' && (
                <ErrorBoundary>
                    <ActivadoresPerformance 
                        stats={listsData.activadoresStats} 
                        detail={listsData.activadoresDetalle} 
                        chartsData={chartsData}
                        filterActivator={filterActivator} 
                    />
                </ErrorBoundary>
            )}
        </div>
    );
}

export default Estadisticas;
