import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInternalAI } from '../hooks/useInternalAI';
import { supabase } from '../lib/supabase';
import './InternalAI.css';
import { 
    Phone, RefreshCw, Zap, Cpu, Target, ArrowRight,
    History, MessageSquareMore, CheckCircle2, Brain,
    ShieldAlert, AlertTriangle, TrendingDown, Activity,
    BookOpen, Sparkles, ChevronRight, Clock
} from 'lucide-react';
import { useTenant } from '../contexts/TenantContext';

interface AIClient {
    id: string;
    nombre: string;
    telefono?: string;
    mail?: string;
    ultima_actividad?: string;
    created_at?: string;
    estado?: string;
    notas?: string;
    riskLevel: 'bajo' | 'medio' | 'alto' | 'pendiente';
    prob: number;
    sentiment?: string;
}

/**
 * Internal AI (Churn Radar) Page
 */
export default function InternalAI() {
    const navigate = useNavigate();
    const { tenantConfig } = useTenant();
    const { trainFromHistory, getAIChurnRisk, isTrained } = useInternalAI();
    
    const [clients, setClients] = useState<AIClient[]>([]);
    const [loading, setLoading] = useState(true);
    const [analyzing, setAnalyzing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [logs, setLogs] = useState<string[]>([]);
    const [filter, setFilter] = useState<'riesgo' | 'todos'>('riesgo');
    
    // Training Mode State
    const [mode, setMode] = useState<'radar' | 'training'>('radar');
    const [unknownQueries, setUnknownQueries] = useState<any[]>([]);
    const [trainingResponses, setTrainingResponses] = useState<{[key: number]: {response: string, keywords: string}}>({});

    const addLog = (msg: string) => {
        setLogs(prev => [msg, ...prev].slice(0, 4));
    };

    const fetchUnknownQueries = async () => {
        const { data } = await (supabase.from('ai_unknown_queries' as any) as any)
            .select('*')
            .is('response', null)
            .order('created_at', { ascending: false });
        if (data) setUnknownQueries(data);
    };

    useEffect(() => {
        if (mode === 'training') fetchUnknownQueries();
    }, [mode]);

    const handleSaveTraining = async (id: number) => {
        const tr = trainingResponses[id];
        if (!tr || !tr.response) return;
        
        await (supabase.from('ai_unknown_queries' as any) as any)
            .update({ response: tr.response, keywords: tr.keywords || '' })
            .eq('id', id);
            
        setTrainingResponses(prev => { const n = {...prev}; delete n[id]; return n; });
        fetchUnknownQueries();
    };

    const handleIgnoreTraining = async (id: number) => {
        await (supabase.from('ai_unknown_queries' as any) as any)
            .update({ response: 'IGNORADO', keywords: 'IGNORADO' })
            .eq('id', id);
            
        setTrainingResponses(prev => { const n = {...prev}; delete n[id]; return n; });
        fetchUnknownQueries();
    };

    const fetchAllClients = useCallback(async () => {
        setLoading(true);
        addLog("Extrayendo base de datos completa...");
        
        let allData: any[] = [];
        let from = 0;
        let to = 999;
        let hasMore = true;

        while (hasMore) {
            const { data, error } = await supabase
                .from('empresa_cliente')
                .select('cliente_id, ultima_actividad, created_at, estado, notas, clientes(id, nombre, telefono, mail)')
                .order('ultima_actividad', { ascending: false })
                .range(from, to);

            if (error || !data || data.length === 0) {
                hasMore = false;
            } else {
                allData = [...allData, ...data];
                from += 1000;
                to += 1000;
                if (data.length < 1000) hasMore = false;
            }
        }
        
        if (allData.length > 0) {
            const flattened: AIClient[] = allData.map(item => ({
                id: item.clientes?.id,
                nombre: item.clientes?.nombre || 'Sin Nombre',
                telefono: item.clientes?.telefono,
                mail: item.clientes?.mail,
                ultima_actividad: item.ultima_actividad,
                created_at: item.created_at,
                estado: item.estado,
                notas: item.notas,
                riskLevel: 'pendiente',
                prob: 0
            }));
            setClients(flattened);
            addLog(`Base de datos cargada: ${flattened.length} clientes.`);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchAllClients();
    }, [fetchAllClients]);

    const handleStartRadar = async () => {
        setAnalyzing(true);
        setProgress(0);
        addLog("Iniciando Red Neuronal Profunda...");
        
        await trainFromHistory();
        
        const total = clients.length;
        const batchSize = 10;
        const analyzedResults = [...clients];

        for (let i = 0; i < total; i += batchSize) {
            const batch = analyzedResults.slice(i, i + batchSize);
            
            const promises = batch.map(async (c) => {
                const result = await getAIChurnRisk(c, []); 
                if (!result) return c;

                const { probability: prob, sentiment } = result;
                let riskLevel: 'bajo' | 'medio' | 'alto' = 'bajo';
                if (prob > 0.75) riskLevel = 'alto';
                else if (prob > 0.45) riskLevel = 'medio';

                return { ...c, prob, riskLevel, sentiment };
            });

            const results = await Promise.all(promises);
            
            for (let j = 0; j < results.length; j++) {
                analyzedResults[i + j] = results[j];
            }

            setProgress(Math.round(((i + batchSize) / total) * 100));
            if (i % 30 === 0) addLog(`Procesados ${i + results.length} de ${total} clientes...`);
        }

        addLog("Radar completado con éxito.");
        analyzedResults.sort((a, b) => (b.prob || 0) - (a.prob || 0));
        setClients(analyzedResults);
        setAnalyzing(false);
    };

    const stats = useMemo(() => {
        const alto = clients.filter(c => c.riskLevel === 'alto').length;
        const medio = clients.filter(c => c.riskLevel === 'medio').length;
        return { alto, medio, total: clients.length };
    }, [clients]);

    const displayClients = useMemo(() => {
        if (filter === 'riesgo') return clients.filter(c => c.riskLevel === 'alto' || c.riskLevel === 'medio');
        return clients;
    }, [clients, filter]);

    return (
        <div className="page-fullbleed ai-radar-page">
            <div className="ai-bg-layer">
                <div className="ai-glow-red" />
                <div className="ai-glow-indigo" />
                <div className="ai-grid" />
            </div>

            <div className="ai-container">
                <header className="ai-header">
                    <div className="ai-title-wrap">
                        <div className="ai-badge">
                            <Brain size={12} className="spin" /> Intelligence Engine v4 · {tenantConfig.ai.name}
                        </div>
                        <h1 className="ai-title">
                            RADAR<span className="ai-dot">.</span>
                        </h1>
                        <div className="ai-toggle">
                            <button onClick={() => setMode('radar')} className={`ai-toggle-btn ${mode === 'radar' ? 'active-radar' : ''}`}>
                                <Activity size={12} /> Radar de Riesgo
                            </button>
                            <button onClick={() => setMode('training')} className={`ai-toggle-btn ${mode === 'training' ? 'active-training' : ''}`}>
                                <BookOpen size={12} /> Modo Maestro
                            </button>
                        </div>
                    </div>

                    <div className="ai-header-actions">
                        <div className="ai-stat-pills">
                            <div className="ai-stat-pill normal">
                                <Target size={14} />
                                <div className="ai-stat-val">{stats.total}</div>
                                <div className="ai-stat-lbl">Clientes</div>
                            </div>
                            <div className="ai-stat-pill critical">
                                <ShieldAlert size={14} />
                                <div className="ai-stat-val">{stats.alto}</div>
                                <div className="ai-stat-lbl">Crítico</div>
                            </div>
                            <div className="ai-stat-pill warning">
                                <AlertTriangle size={14} />
                                <div className="ai-stat-val">{stats.medio}</div>
                                <div className="ai-stat-lbl">Atención</div>
                            </div>
                        </div>

                        <button onClick={handleStartRadar} disabled={analyzing} className="ai-scan-btn">
                            <div className="ai-scan-content">
                                {analyzing ? (
                                    <><RefreshCw size={16} className="spin" /> <span>{progress}% ESCANEANDO</span></>
                                ) : (
                                    <><Zap size={16} /> <span>{isTrained ? 'RE-ESCANEAR' : 'INICIAR RADAR'}</span></>
                                )}
                            </div>
                            {analyzing && <div className="ai-scan-anim" />}
                        </button>
                    </div>
                </header>

                {logs.length > 0 && (
                    <div className="ai-terminal">
                        <div className="ai-terminal-head">
                            <div className="ai-dot-r" /><div className="ai-dot-y" /><div className="ai-dot-g" />
                            <span className="ai-terminal-lbl">SYSTEM LOG</span>
                        </div>
                        {logs.map((log, i) => (
                            <div key={i} className="ai-log-line">
                                <span className="ai-log-caret">{'>'}</span>
                                <span className={`ai-log-txt ${log.includes('completado') ? 'ai-log-success' : ''}`}>{log}</span>
                            </div>
                        ))}
                    </div>
                )}

                <main>
                    {mode === 'training' ? (
                        <div>
                            <div className="ai-train-hero">
                                <div className="ai-train-glow" />
                                <div className="ai-train-icon"><Sparkles size={20} /></div>
                                <div className="ai-train-text">
                                    <h2>Centro de Entrenamiento</h2>
                                    <p>Preguntas que {tenantConfig.ai.name} no supo responder. Enseñale la respuesta y las palabras clave para que aprenda.</p>
                                </div>
                            </div>

                            {unknownQueries.length === 0 ? (
                                <div className="ai-empty dashed">
                                    <div className="ai-empty-icon emerald"><CheckCircle2 size={28} /></div>
                                    <h3>Todo al día</h3>
                                    <p>No hay consultas pendientes de aprendizaje.</p>
                                </div>
                            ) : (
                                <div className="ai-train-list">
                                    {unknownQueries.map((q, idx) => (
                                        <div key={q.id} className="ai-train-card">
                                            <div className="ai-tc-head">
                                                <div className="ai-tc-title-wrap">
                                                    <div className="ai-tc-num">#{idx + 1}</div>
                                                    <div>
                                                        <div className="ai-tc-lbl">Pregunta sin respuesta</div>
                                                        <h3 className="ai-tc-query">"{q.query}"</h3>
                                                    </div>
                                                </div>
                                                <div className="ai-tc-date">
                                                    <Clock size={10} /> {new Date(q.created_at).toLocaleDateString()}
                                                </div>
                                            </div>

                                            <div className="ai-form-group">
                                                <label className="ai-label">Respuesta para {tenantConfig.ai.name}</label>
                                                <textarea
                                                    className="ai-input"
                                                    rows={3}
                                                    placeholder="Ej: Para hacer eso, andá a la sección de Clientes y..."
                                                    value={trainingResponses[q.id]?.response || ''}
                                                    onChange={(e) => setTrainingResponses(prev => ({...prev, [q.id]: {...(prev[q.id] || {}), response: e.target.value}}))}
                                                />
                                            </div>
                                            <div className="ai-form-row">
                                                <div className="ai-form-col">
                                                    <label className="ai-label">Palabras Clave (separadas por coma)</label>
                                                    <input
                                                        type="text"
                                                        className="ai-input"
                                                        placeholder="Ej: reporte, excel, exportar"
                                                        value={trainingResponses[q.id]?.keywords || ''}
                                                        onChange={(e) => setTrainingResponses(prev => ({...prev, [q.id]: {...(prev[q.id] || {}), keywords: e.target.value}}))}
                                                    />
                                                </div>
                                                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                                                    <button
                                                        onClick={() => handleIgnoreTraining(q.id)}
                                                        className="ai-btn-ignore"
                                                        style={{ background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
                                                    >
                                                        Ignorar
                                                    </button>
                                                    <button
                                                        onClick={() => handleSaveTraining(q.id)}
                                                        disabled={!trainingResponses[q.id]?.response}
                                                        className="ai-btn-train"
                                                    >
                                                        <Sparkles size={12} /> Enseñar
                                                    </button>
                                                </div>
                                            </div>
                                            {trainingResponses[q.id]?.response && (
                                                <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(139, 92, 246, 0.05)', borderRadius: '8px', border: '1px dashed #8b5cf6' }}>
                                                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#8b5cf6', marginBottom: '4px', textTransform: 'uppercase' }}>PREVIEW DE {tenantConfig.ai.name}:</div>
                                                    <div style={{ fontSize: '0.85rem', color: 'var(--text)', fontStyle: 'italic' }}>
                                                        "{trainingResponses[q.id].response}"
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <>
                            {isTrained && (
                                <div className="ai-filter-bar">
                                    <div className="ai-filters">
                                        <button onClick={() => setFilter('riesgo')} className={`ai-filter-btn ${filter === 'riesgo' ? 'active-riesgo' : ''}`}>
                                            <TrendingDown size={12} /> En Riesgo ({stats.alto + stats.medio})
                                        </button>
                                        <button onClick={() => setFilter('todos')} className={`ai-filter-btn ${filter === 'todos' ? 'active-todos' : ''}`}>
                                            <Target size={12} /> Todos ({stats.total})
                                        </button>
                                    </div>
                                    <div className="ai-filter-summary">
                                        <div className="ai-summary-item">
                                            <div className="ai-summary-lbl">Crítico</div>
                                            <div className="ai-summary-val ai-color-crit">{stats.alto}</div>
                                        </div>
                                        <div className="ai-summary-item">
                                            <div className="ai-summary-lbl">Atención</div>
                                            <div className="ai-summary-val ai-color-warn">{stats.medio}</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="ai-grid-cards">
                                {displayClients.map((cliente) => {
                                    const isAlto = cliente.riskLevel === 'alto';
                                    const cardClass = isAlto ? 'critical' : 'warning';
                                    const days = Math.floor((new Date().getTime() - new Date(cliente.ultima_actividad || cliente.created_at || new Date()).getTime()) / 86400000);
                                    
                                    return (
                                        <div key={cliente.id} className={`ai-card ${cardClass}`}>
                                            <div className="ai-card-glow" />
                                            <div className="ai-card-strip" />
                                            <div className="ai-card-content">
                                                <div className="ai-card-head">
                                                    <div>
                                                        <div className="ai-card-alert">
                                                            {isAlto ? <ShieldAlert size={10}/> : <AlertTriangle size={10}/>}
                                                            {isAlto ? 'Alerta Crítica' : 'Requiere Atención'}
                                                        </div>
                                                        <h3 className="ai-card-name">{cliente.nombre}</h3>
                                                    </div>
                                                    <div className="ai-card-perc">{Math.round(cliente.prob * 100)}%</div>
                                                </div>

                                                <div className="ai-risk-bar-wrap">
                                                    <div className="ai-risk-lbls">
                                                        <span>Riesgo de abandono</span>
                                                        <span className={isAlto ? 'ai-val-crit' : 'ai-val-warn'}>{Math.round(cliente.prob * 100)}%</span>
                                                    </div>
                                                    <div className="ai-risk-track">
                                                        <div className="ai-risk-fill" style={{ width: `${cliente.prob * 100}%` }} />
                                                    </div>
                                                </div>

                                                <div className="ai-card-stats">
                                                    <div className="ai-micro-stat">
                                                        <div className="ai-micro-lbl"><History size={9}/> Silencio</div>
                                                        <div className={`ai-micro-val ${days > 60 ? 'ai-val-crit' : days > 30 ? 'ai-val-warn' : ''}`}>{days} días</div>
                                                    </div>
                                                    <div className="ai-micro-stat">
                                                        <div className="ai-micro-lbl"><MessageSquareMore size={9}/> Sentimiento</div>
                                                        <div className={`ai-micro-val ${cliente.sentiment === 'NEGATIVO' ? 'ai-val-crit' : cliente.sentiment === 'POSITIVO' ? 'ai-val-good' : ''}`}>
                                                            {cliente.sentiment || 'Neutral'}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="ai-card-actions">
                                                    <a href={`tel:${cliente.telefono}`} className="ai-btn-call">
                                                        <Phone size={13}/> Llamar
                                                    </a>
                                                    <button onClick={() => navigate('/clientes', { state: { nombre: cliente.nombre } })} className="ai-btn-nav">
                                                        <ChevronRight size={16}/>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {isTrained && displayClients.length === 0 && (
                                <div className="ai-empty">
                                    <div className="ai-empty-icon emerald"><CheckCircle2 size={32} /></div>
                                    <h3>Base Asegurada</h3>
                                    <p>Todos tus clientes están dentro de sus rangos normales.</p>
                                </div>
                            )}

                            {!isTrained && !loading && (
                                <div className="ai-empty dashed">
                                    <div className="ai-empty-icon rose"><Activity size={32} /></div>
                                    <h3>Radar en Espera</h3>
                                    <p>Presioná <strong className="ai-val-crit">Iniciar Radar</strong> para escanear todos tus clientes.</p>
                                </div>
                            )}
                        </>
                    )}
                </main>
            </div>
        </div>
    );
}

