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
import toast from 'react-hot-toast';
import { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { useAuth } from '../contexts/AuthContext';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);
ChartJS.defaults.devicePixelRatio = typeof window !== 'undefined' ? Math.max(window.devicePixelRatio || 1, 3) : 3;

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

    const dashboardRef = useRef<HTMLDivElement>(null);
    const { empresaActiva, user, userName }: any = useAuth();
    const [isExportingPdf, setIsExportingPdf] = useState(false);

    const handleExportPdf = async () => {
        if (!dashboardRef.current) return;
        try {
            toast.loading("Generando documento auditado (puede tardar unos segundos)...", { id: 'pdf-toast' });
            
            setIsExportingPdf(true);
            
            const element = dashboardRef.current;
            // Guardar estilos originales para evitar el corte por scroll
            const originalHeight = element.style.height;
            const originalOverflow = element.style.overflowY;
            const originalPadding = element.style.padding;
            const originalBg = element.style.background;
            
            // Preparar contenedor como 'hoja de papel'
            element.style.height = 'max-content';
            element.style.overflowY = 'visible';
            element.style.padding = '40px'; 
            element.style.background = '#ffffff';
            
            await new Promise(resolve => setTimeout(resolve, 400)); // Esperar render del DOM y expansión

            const canvas = await html2canvas(element, { 
                scale: 2, // 2 es óptimo para la calidad de ChartJS
                useCORS: true,
                backgroundColor: '#ffffff',
                windowWidth: 1440 // Forzar un render ancho constante para evitar gráficos apretados en móviles
            });
            
            // Revertir
            element.style.height = originalHeight;
            element.style.overflowY = originalOverflow;
            element.style.padding = originalPadding;
            element.style.background = originalBg;
            
            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            const pageHeight = pdf.internal.pageSize.getHeight();
            
            let heightLeft = pdfHeight;
            let position = 0;

            pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
            heightLeft -= pageHeight;

            while (heightLeft >= 0) {
                position = heightLeft - pdfHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
                heightLeft -= pageHeight;
            }
            
            pdf.save(`Reporte_Grafico_CRM_${new Date().getTime()}.pdf`);
            
            setIsExportingPdf(false);
            toast.dismiss('pdf-toast');
            toast.success("PDF generado exitosamente");
        } catch (error) {
            console.error("PDF generation error", error);
            setIsExportingPdf(false);
            toast.dismiss('pdf-toast');
            toast.error("Error al generar PDF");
        }
    };

    const handleExport = () => {
        try {
            // Hoja 1: Resumen (KPIs)
            const wsResumenData: any[][] = [
                ["Reporte Ejecutivo CRM - Resumen"],
                ["Fecha de generación", new Date().toLocaleString()],
                ["Filtro Rango", rangePreset as string],
                [],
                ["Métrica", "Valor"]
            ];
            const kpiLabels: Record<string, string> = {
                totalClientesActivos: 'Clientes activos', conFecha: 'Agenda con fecha', vencidos: 'Vencidos', sinFecha: 'Sin fecha',
                proxHoy: 'Próximo hoy', prox7: 'Próximo 7d', proxFuturo: 'Próximo futuro',
                act7: 'Actividades 7d', act30: 'Actividades 30d', activos30: 'Activos 30d', dormidos30: 'Dormidos 30d', sinHistorial: 'Sin historial'
            };
            Object.entries(kpis).forEach(([key, val]) => {
                wsResumenData.push([kpiLabels[key] || key, val]);
            });

            // Hoja 2: Rendimiento
            const wsRendimientoData: any[][] = [
                ["Desempeño de Activadores"],
                []
            ];
            if (listsData?.activadoresDetalle && listsData.activadoresDetalle.length > 0) {
                wsRendimientoData.push(["Activador", "Locales Activos (Totales)", "Locales Creados", "Locales Visitados (Totales)", "Efectividad"]);
                listsData.activadoresDetalle.forEach((a: any) => {
                    wsRendimientoData.push([
                        a.nombre,
                        (a.activos_creados_por_mi || 0) + (a.activos_heredados || 0),
                        a.creados_total || 0,
                        a.visitados_total || 0,
                        a.visitas_efectivas ? `${Math.round((a.visitas_efectivas / ((a.visitas_efectivas || 0) + (a.visitas_no_efectivas || 0))) * 100)}%` : '0%'
                    ]);
                });
            } else if (listsData?.activadoresStats && listsData.activadoresStats.length > 0) {
                wsRendimientoData.push(["Activador", "Conversión/Efectividad (%)"]);
                listsData.activadoresStats.forEach((a: any) => {
                    wsRendimientoData.push([a.name, a.rate.toFixed(1) + '%']);
                });
            }

            // Hoja 3: Datos Crudos
            const wsCrudosData: any[][] = [
                ["Datos Crudos - Distribución General"],
                [],
                ["Rubro", "Cantidad"]
            ];
            if (listsData?.rubros) listsData.rubros.forEach((r: any) => wsCrudosData.push([r[0], r[1]]));
            wsCrudosData.push([]);
            wsCrudosData.push(["Estado", "Cantidad"]);
            if (listsData?.estados) listsData.estados.forEach((e: any) => wsCrudosData.push([e[0], e[1]]));

            const wb = XLSX.utils.book_new();
            
            const wsResumen = XLSX.utils.aoa_to_sheet(wsResumenData);
            const wsRendimiento = XLSX.utils.aoa_to_sheet(wsRendimientoData);
            const wsCrudos = XLSX.utils.aoa_to_sheet(wsCrudosData);

            XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen KPIs");
            XLSX.utils.book_append_sheet(wb, wsRendimiento, "Rendimiento");
            XLSX.utils.book_append_sheet(wb, wsCrudos, "Datos Crudos");

            XLSX.writeFile(wb, `Reporte_Avanzado_CRM_${new Date().getTime()}.xlsx`);
            
            toast.success("Reporte Excel descargado exitosamente");
        } catch (error) {
            console.error("Export error", error);
            toast.error("Hubo un error al exportar el reporte.");
        }
    };

    return (
        <div className="stats-dashboard" ref={dashboardRef} style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '16px', overflowY: 'auto', background: 'var(--bg)' }}>
            
            {isExportingPdf && (
                <div style={{ 
                    padding: '32px 40px', 
                    background: '#ffffff', 
                    color: '#0f172a',
                    borderBottom: '4px solid #4f46e5', 
                    marginBottom: '32px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '24px'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <img 
                                src="/logo-horizontal.png" 
                                alt="PickingUp" 
                                style={{ height: '80px', objectFit: 'contain' }}
                                onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; ((e.currentTarget as HTMLElement).nextElementSibling as HTMLElement).style.display = 'flex'; }} 
                            />
                            <div style={{ display: 'none', alignItems: 'center', gap: '16px' }}>
                                <div style={{ 
                                    background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)', 
                                    color: 'white', 
                                    fontWeight: 800, 
                                    fontSize: '28px', 
                                    width: '56px', 
                                    height: '56px', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    borderRadius: '14px',
                                    boxShadow: '0 4px 10px rgba(79, 70, 229, 0.3)'
                                }}>
                                    PU
                                </div>
                                <div>
                                    <h1 style={{ margin: 0, fontSize: '32px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.5px', lineHeight: 1.1 }}>PickingUp</h1>
                                    <p style={{ margin: '4px 0 0 0', fontSize: '14px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                        Reporte Corporativo
                                    </p>
                                </div>
                            </div>
                            <div style={{ marginLeft: '12px', borderLeft: '2px solid #e2e8f0', paddingLeft: '20px' }}>
                                <p style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                    Reporte Ejecutivo
                                </p>
                            </div>
                        </div>

                        <div style={{ textAlign: 'right', fontSize: '13px', color: '#475569' }}>
                           <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '700', color: '#1e293b' }}>
                                Empresa: <strong style={{color: '#4f46e5'}}>{empresaActiva?.nombre || 'General'}</strong>
                            </h2>
                            <p style={{ margin: '4px 0 0 0' }}><strong>Generado por:</strong> {userName || user?.email || 'Sistema'}</p>
                            <p style={{ margin: '4px 0 0 0' }}><strong>Fecha:</strong> {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
                            <p style={{ margin: '4px 0 0 0' }}><strong>Audit ID:</strong> #{Math.random().toString(36).substring(2, 9).toUpperCase()}</p>
                        </div>
                    </div>
                </div>
            )}

            <StatsFilters 
                rangePreset={rangePreset as string} setRangePreset={setRangePreset}
                dateFrom={dateFrom} setDateFrom={setDateFrom}
                dateTo={dateTo} setDateTo={setDateTo}
                filterActivator={Array.isArray(filterActivator) ? filterActivator : (filterActivator ? [filterActivator as string] : [])} 
                setFilterActivator={(val: string[]) => setFilterActivator(val.length > 0 ? val[0] : '' as any) as any}
                activators={activators}
                refreshStats={refreshStats}
                onExport={handleExport}
                onExportPdf={handleExportPdf}
                isExportingPdf={isExportingPdf}
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
                        filterActivator={Array.isArray(filterActivator) ? filterActivator : (filterActivator ? [filterActivator as string] : [])} 
                    />
                </ErrorBoundary>
            )}
        </div>
    );
}

export default Estadisticas;
