import React from 'react';
import { useTranslation } from 'react-i18next';
import { Database, Download, Cpu, Activity, AlertTriangle, Terminal } from 'lucide-react';

interface StorageItem {
    table_name: string;
    table_size_bytes: number | string;
    index_size_bytes: number | string;
}

interface SlowQueryItem {
    query: string;
    calls: number | string;
    total_time_ms: number | string;
    mean_time_ms: number | string;
}

interface UnusedIndexItem {
    table_name: string;
    index_name: string;
    index_size_bytes: number | string;
    scans: number | string;
}

interface DbaStats {
    storage?: StorageItem[];
    cache?: {
        hit_ratio?: number | string;
    };
    sessions?: {
        total_connections?: number;
        active_queries?: number;
        idle_connections?: number;
    };
    unused_indexes?: UnusedIndexItem[];
    slow_queries?: SlowQueryItem[];
}

interface DbaDiagnosticsTabProps {
    dbaStats: DbaStats;
    copiedQueryIndex: number | null;
    setCopiedQueryIndex: (idx: number | null) => void;
}

export const DbaDiagnosticsTab: React.FC<DbaDiagnosticsTabProps> = ({
    dbaStats,
    copiedQueryIndex,
    setCopiedQueryIndex
}) => {
    const { t } = useTranslation();

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const idxVal = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, idxVal)).toFixed(2)) + ' ' + sizes[idxVal];
    };

    const handleExportJson = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dbaStats, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `dba_diagnostics_${new Date().toISOString().split('T')[0]}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    };

    const totalDataBytes = (dbaStats.storage || []).reduce((acc: number, item: any) => acc + Number(item.table_size_bytes || 0), 0);
    const totalIndexBytes = (dbaStats.storage || []).reduce((acc: number, item: any) => acc + Number(item.index_size_bytes || 0), 0);
    const totalStorageBytes = totalDataBytes + totalIndexBytes;
    
    const dataPercent = totalStorageBytes > 0 ? (totalDataBytes / totalStorageBytes) * 100 : 50;
    const indexPercent = totalStorageBytes > 0 ? (totalIndexBytes / totalStorageBytes) * 100 : 50;

    return (
        <div className="tab-pane-dba">
            {/* Subtitle & Export Button */}
            <div className="dba-header-row">
                <span className="muted-subtitle">{t('audit.dba.subtitle')}</span>
                <button 
                    onClick={handleExportJson}
                    className="btn-secundario export-btn-json"
                >
                    <Download size={16} /> {t('audit.dba.export_json')}
                </button>
            </div>

            {/* DBA Cards Grid */}
            <div className="dba-cards-grid">
                {/* Card 1: Total Storage */}
                <div className="dba-dashboard-card">
                    <div className="dba-card-icon-wrapper theme-purple">
                        <Database size={22} />
                    </div>
                    <div className="dba-card-info-group">
                        <div className="dba-card-title">{t('audit.dba.card_total_size')}</div>
                        <div className="dba-card-value">
                            {formatBytes(totalStorageBytes)}
                        </div>
                    </div>
                </div>

                {/* Card 2: Cache Hit Rate */}
                <div className="dba-dashboard-card">
                    <div className="dba-card-icon-wrapper theme-green">
                        <Cpu size={22} />
                    </div>
                    <div className="dba-card-info-group">
                        <div className="dba-card-title">{t('audit.dba.card_cache_hit')}</div>
                        <div className="dba-card-value" style={{ color: Number(dbaStats.cache?.hit_ratio ?? 100) > 95 ? '#10b981' : '#f59e0b' }}>
                            {dbaStats.cache?.hit_ratio || '100'}%
                        </div>
                    </div>
                </div>

                {/* Card 3: Active Connections */}
                <div className="dba-dashboard-card">
                    <div className="dba-card-icon-wrapper theme-blue">
                        <Activity size={22} />
                    </div>
                    <div className="dba-card-info-group">
                        <div className="dba-card-title">{t('audit.dba.card_connections')}</div>
                        <div className="dba-card-value">
                            {dbaStats.sessions?.total_connections || 1}
                        </div>
                    </div>
                </div>

                {/* Card 4: Unused Indexes */}
                <div className="dba-dashboard-card">
                    <div className={`dba-card-icon-wrapper ${(dbaStats.unused_indexes || []).length > 0 ? 'theme-red' : 'theme-purple'}`}>
                        <AlertTriangle size={22} />
                    </div>
                    <div className="dba-card-info-group">
                        <div className="dba-card-title">{t('audit.dba.card_unused_indexes')}</div>
                        <div className="dba-card-value" style={{ color: (dbaStats.unused_indexes || []).length > 0 ? '#ef4444' : 'inherit' }}>
                            {(dbaStats.unused_indexes || []).length}
                        </div>
                    </div>
                </div>
            </div>

            {/* Storage Distribution */}
            <div className="dba-layout-card">
                <h3 className="layout-card-title">{t('audit.dba.storage_distribution')}</h3>
                <p className="muted-layout-desc">{t('audit.dba.storage_desc')}</p>
                
                <div className="storage-distribution-wrapper">
                    <div className="storage-ratio-bar">
                        <div 
                            style={{ width: `${dataPercent}%`, transition: 'width 0.5s ease' }} 
                            className="ratio-bar-segment data-segment" 
                            title={`Data: ${formatBytes(totalDataBytes)}`}
                        >
                            {dataPercent > 15 && `${dataPercent.toFixed(1)}%`}
                        </div>
                        <div 
                            style={{ width: `${indexPercent}%`, transition: 'width 0.5s ease' }} 
                            className="ratio-bar-segment index-segment" 
                            title={`Indexes: ${formatBytes(totalIndexBytes)}`}
                        >
                            {indexPercent > 15 && `${indexPercent.toFixed(1)}%`}
                        </div>
                    </div>
                    <div className="storage-legend-labels">
                        <div className="legend-label-item">
                            <span className="legend-badge badge-accent"></span>
                            <span className="legend-label-title">{t('audit.dba.table_data')}:</span>
                            <span className="legend-label-value">{formatBytes(totalDataBytes)}</span>
                        </div>
                        <div className="legend-label-item">
                            <span className="legend-badge badge-blue"></span>
                            <span className="legend-label-title">{t('audit.dba.table_indexes')}:</span>
                            <span className="legend-label-value">{formatBytes(totalIndexBytes)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Active Sessions Monitoring */}
            <div className="dba-layout-card">
                <h3 className="layout-card-title">{t('audit.dba.connections_monitoring')}</h3>
                <p className="muted-layout-desc">{t('audit.dba.connections_desc')}</p>
                <div className="connections-metrics-row">
                    <div className="metric-box box-accent">
                        <div className="metric-box-val">{dbaStats.sessions?.active_queries || 0}</div>
                        <div className="metric-box-label">{t('audit.dba.active_label')}</div>
                    </div>
                    <div className="metric-box box-muted">
                        <div className="metric-box-val">{dbaStats.sessions?.idle_connections || 0}</div>
                        <div className="metric-box-label">{t('audit.dba.idle_label')}</div>
                    </div>
                </div>
            </div>

            {/* Slowest Queries Table */}
            <div className="dba-layout-card">
                <h3 className="layout-card-title">{t('audit.dba.slow_queries')}</h3>
                <p className="muted-layout-desc">{t('audit.dba.slow_queries_desc')}</p>
                {!(dbaStats.slow_queries) || dbaStats.slow_queries.length === 0 ? (
                    <div className="empty-dba-subcard-dashed">
                        {t('audit.dba.no_slow_queries')}
                    </div>
                ) : (
                    <div className="dba-table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>{t('audit.dba.query_header')}</th>
                                    <th style={{ textAlign: 'center', width: '80px' }}>{t('audit.dba.calls_header')}</th>
                                    <th style={{ textAlign: 'right', width: '100px' }}>{t('audit.dba.total_time_header')}</th>
                                    <th style={{ textAlign: 'right', width: '100px' }}>{t('audit.dba.mean_time_header')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dbaStats.slow_queries.map((q, idxQ) => (
                                    <tr key={idxQ}>
                                        <td className="query-td">
                                            <div className="query-code-wrapper">
                                                <code>
                                                    {q.query}
                                                </code>
                                                <button 
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(q.query);
                                                        setCopiedQueryIndex(idxQ);
                                                        setTimeout(() => setCopiedQueryIndex(null), 2000);
                                                    }}
                                                    className="copy-query-btn"
                                                >
                                                    {copiedQueryIndex === idxQ ? '✔️ Copied!' : t('audit.dba.copy_query')}
                                                </button>
                                            </div>
                                        </td>
                                        <td style={{ textAlign: 'center', fontWeight: 700 }}>{q.calls}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--danger)' }}>{Number(q.total_time_ms).toLocaleString()} ms</td>
                                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{Number(q.mean_time_ms).toLocaleString()} ms</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Unused Indexes Panel */}
            <div className="dba-layout-card">
                <h3 className="layout-card-title">{t('audit.dba.unused_indexes_panel')}</h3>
                <p className="muted-layout-desc">{t('audit.dba.unused_indexes_desc')}</p>
                {!(dbaStats.unused_indexes) || dbaStats.unused_indexes.length === 0 ? (
                    <div className="empty-dba-subcard-green">
                        ✔️ {t('audit.dba.no_unused_indexes')}
                    </div>
                ) : (
                    <div className="dba-table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>{t('audit.dba.index_name_header')}</th>
                                    <th>{t('audit.headers.category')}</th>
                                    <th style={{ textAlign: 'right', width: '100px' }}>{t('audit.dba.scans_header')}</th>
                                    <th style={{ textAlign: 'right', width: '120px' }}>{t('audit.dba.card_unused_indexes')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dbaStats.unused_indexes.map((idx, idxI) => (
                                    <tr key={idxI}>
                                        <td className="index-name-monospace">{idx.index_name}</td>
                                        <td style={{ fontWeight: 600 }}>{idx.table_name.toUpperCase()}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 700 }}>{idx.scans}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--danger)' }}>{formatBytes(Number(idx.index_size_bytes))}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};
