import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInternalAI } from '../hooks/useInternalAI';
import { supabase } from '../lib/supabase';
import { 
    Phone, RefreshCw, 
    Zap, Cpu, 
    Target, ArrowRight, Layers,
    History, MessageSquareMore, CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
        <div className="min-h-screen bg-[#f8fafc] dark:bg-[#020617] text-slate-900 dark:text-slate-100 font-sans selection:bg-slate-900/30 transition-colors duration-500">
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-to-b from-slate-900/10 via-transparent to-transparent blur-[120px] rounded-full" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto p-4 md:p-8 space-y-12">
                <header className="flex flex-col lg:flex-row items-center justify-between gap-8 pt-8">
                    <div className="space-y-4 text-center lg:text-left">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/10 dark:bg-slate-900/20 border border-slate-900/20">
                            <Cpu size={14} className="text-slate-900 dark:text-white" />
                            <span className="text-[10px] font-black tracking-[0.2em] uppercase">Intelligence Engine v3</span>
                        </div>
                        <h1 className="text-5xl md:text-8xl font-black tracking-tighter leading-none">
                            RADAR<span className="text-slate-900 dark:text-white">.</span>
                        </h1>
                        <div className="flex gap-2 mt-4 bg-slate-200 dark:bg-slate-800 p-1 rounded-xl w-max mx-auto lg:mx-0">
                            <button onClick={() => setMode('radar')} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${mode === 'radar' ? 'bg-white dark:bg-slate-900 shadow-sm' : 'text-slate-500'}`}>Radar de Riesgo</button>
                            <button onClick={() => setMode('training')} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${mode === 'training' ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Modo Maestro</button>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-lg font-medium max-w-xl">
                            Escaneo profundo de {stats.total} clientes en tiempo real.
                        </p>
                    </div>

                    <div className="flex flex-col items-center gap-6">
                        <button 
                            onClick={handleStartRadar}
                            disabled={analyzing}
                            className={`group relative h-24 w-64 rounded-2xl overflow-hidden transition-all active:scale-95 shadow-2xl ${
                                analyzing ? 'bg-slate-800' : 'bg-slate-900 dark:bg-white'
                            }`}
                        >
                            <div className="relative z-10 flex items-center justify-center gap-3 text-white dark:text-slate-900">
                                {analyzing ? (
                                    <>
                                        <RefreshCw size={20} className="animate-spin" />
                                        <span className="text-sm font-black uppercase tracking-widest">{progress}% ANALIZANDO</span>
                                    </>
                                ) : (
                                    <>
                                        <Zap size={20} fill="currentColor" />
                                        <span className="text-sm font-black uppercase tracking-widest">{isTrained ? 'RE-ESCANEAR TODO' : 'INICIAR RADAR'}</span>
                                    </>
                                )}
                            </div>
                            {analyzing && (
                                <motion.div 
                                    className="absolute inset-0 bg-[#0c0c0c] origin-left"
                                    initial={{ scaleX: 0 }}
                                    animate={{ scaleX: progress / 100 }}
                                />
                            )}
                        </button>
                        
                        <div className="flex items-center gap-6 text-[10px] font-black uppercase tracking-widest text-slate-400">
                            <span className="flex items-center gap-1.5"><Layers size={12} /> Local Processing</span>
                            <span className="flex items-center gap-1.5"><Target size={12} /> {stats.total} Nodes</span>
                        </div>
                    </div>
                </header>

                <AnimatePresence>
                    {logs.length > 0 && (
                        <motion.div 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="max-w-2xl mx-auto lg:mx-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl p-4 font-mono text-[10px] text-slate-500"
                        >
                            <div className="space-y-1">
                                {logs.map((log, i) => (
                                    <div key={i} className="flex gap-4">
                                        <span className="opacity-50"># {i}</span>
                                        <span className={log.includes('completado') ? 'text-emerald-500 font-bold' : ''}>{log}</span>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <main className="space-y-8">
                    {mode === 'training' ? (
                        <div className="space-y-6">
                            <div className="bg-indigo-500/10 border border-indigo-500/20 p-6 rounded-3xl">
                                <h2 className="text-xl font-black text-indigo-500 uppercase tracking-widest mb-2">Centro de Entrenamiento (CoqueBot)</h2>
                                <p className="text-slate-500 dark:text-slate-400 text-sm">
                                    Aquí aparecen las preguntas que los usuarios hicieron y CoqueBot no supo responder. Escribí la respuesta y las palabras clave para que aprenda.
                                </p>
                            </div>
                            
                            {unknownQueries.length === 0 ? (
                                <div className="text-center py-20 border border-dashed border-slate-300 dark:border-slate-800 rounded-3xl">
                                    <CheckCircle2 size={40} className="mx-auto text-emerald-500 mb-4 opacity-50" />
                                    <h3 className="text-xl font-black text-slate-400">Todo al día</h3>
                                    <p className="text-slate-500 text-sm">No hay consultas pendientes de aprendizaje.</p>
                                </div>
                            ) : (
                                <div className="grid gap-4">
                                    {unknownQueries.map(q => (
                                        <div key={q.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <span className="text-[10px] font-black text-slate-400 uppercase">Pregunta del usuario</span>
                                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">"{q.query}"</h3>
                                                </div>
                                                <span className="text-[10px] text-slate-400">{new Date(q.created_at).toLocaleDateString()}</span>
                                            </div>
                                            
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Tu Respuesta (Lo que dirá CoqueBot)</label>
                                                    <textarea 
                                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                                        rows={3}
                                                        placeholder="Ej: Para hacer eso, tenés que ir a..."
                                                        value={trainingResponses[q.id]?.response || ''}
                                                        onChange={(e) => setTrainingResponses(prev => ({...prev, [q.id]: {...(prev[q.id] || {}), response: e.target.value}}))}
                                                    />
                                                </div>
                                                <div className="flex gap-4 items-end">
                                                    <div className="flex-1">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Palabras Clave (Separadas por coma)</label>
                                                        <input 
                                                            type="text"
                                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                                            placeholder="Ej: reporte, bajar excel, descargar clientes"
                                                            value={trainingResponses[q.id]?.keywords || ''}
                                                            onChange={(e) => setTrainingResponses(prev => ({...prev, [q.id]: {...(prev[q.id] || {}), keywords: e.target.value}}))}
                                                        />
                                                    </div>
                                                    <button 
                                                        onClick={() => handleSaveTraining(q.id)}
                                                        disabled={!trainingResponses[q.id]?.response}
                                                        className="h-11 px-6 bg-indigo-500 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-indigo-600 disabled:opacity-50 transition-all"
                                                    >
                                                        Enseñar
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <>
                    {isTrained && (
                        <div className="flex flex-wrap gap-4 items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-8">

                            <div className="flex items-center gap-4">
                                <button 
                                    onClick={() => setFilter('riesgo')}
                                    className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                                        filter === 'riesgo' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                    }`}
                                >
                                    Riesgo ({stats.alto + stats.medio})
                                </button>
                                <button 
                                    onClick={() => setFilter('todos')}
                                    className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                                        filter === 'todos' ? 'bg-slate-900 dark:bg-white dark:text-slate-900 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                    }`}
                                >
                                    Todos ({stats.total})
                                </button>
                            </div>

                            <div className="flex gap-8">
                                <div className="text-center">
                                    <div className="text-[10px] font-black text-slate-400 uppercase mb-1">Riesgo Crítico</div>
                                    <div className="text-2xl font-black text-rose-500">{stats.alto}</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-[10px] font-black text-slate-400 uppercase mb-1">En Seguimiento</div>
                                    <div className="text-2xl font-black text-amber-500">{stats.medio}</div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <AnimatePresence>
                            {displayClients.map((cliente, i) => (
                                <motion.div
                                    key={cliente.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: (i % 12) * 0.05 }}
                                    className="group relative bg-white dark:bg-slate-900/50 backdrop-blur-sm rounded-[2rem] p-7 border border-slate-200 dark:border-slate-800 hover:border-slate-900/50 dark:hover:border-white/50 transition-all shadow-sm hover:shadow-2xl overflow-hidden"
                                >
                                    <div className={`absolute top-0 right-0 w-32 h-32 blur-[60px] opacity-10 transition-opacity group-hover:opacity-30 ${
                                        cliente.riskLevel === 'alto' ? 'bg-rose-500' : 'bg-amber-500'
                                    }`} />

                                    <div className="relative z-10 space-y-6">
                                        <div className="flex justify-between items-start">
                                            <div className="space-y-1">
                                                <div className={`text-[10px] font-black uppercase tracking-tighter ${
                                                    cliente.riskLevel === 'alto' ? 'text-rose-500' : 'text-amber-500'
                                                }`}>
                                                    {cliente.riskLevel === 'alto' ? 'Critical Alert' : 'Attention Needed'}
                                                </div>
                                                <h3 className="text-xl font-black text-slate-900 dark:text-white leading-tight uppercase line-clamp-1">{cliente.nombre}</h3>
                                            </div>
                                            <div className="text-2xl font-black text-slate-200 dark:text-slate-800">
                                                {Math.round(cliente.prob * 100)}%
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                                <motion.div 
                                                    className={`h-full ${cliente.riskLevel === 'alto' ? 'bg-rose-500' : 'bg-amber-500'}`}
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${cliente.prob * 100}%` }}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-1 text-[9px] font-black text-slate-400 uppercase">
                                                    <History size={10} /> Silence
                                                </div>
                                                <div className="text-sm font-bold">{Math.floor((new Date().getTime() - new Date(cliente.ultima_actividad || cliente.created_at || new Date()).getTime()) / 86400000)} days</div>
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-1 text-[9px] font-black text-slate-400 uppercase">
                                                    <MessageSquareMore size={10} /> Sentiment
                                                </div>
                                                <div className={`text-sm font-bold uppercase ${
                                                    cliente.sentiment === 'NEGATIVO' ? 'text-rose-500' : 
                                                    cliente.sentiment === 'POSITIVO' ? 'text-emerald-500' : 'text-slate-500'
                                                }`}>
                                                    {cliente.sentiment || 'Neutral'}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 pt-2">
                                            <a 
                                                href={`tel:${cliente.telefono}`}
                                                className="flex-1 h-12 flex items-center justify-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 dark:hover:bg-slate-200 transition-all shadow-lg"
                                            >
                                                <Phone size={14} /> Call Now
                                            </a>
                                            <button 
                                                onClick={() => navigate('/clientes', { state: { nombre: cliente.nombre } })}
                                                className="h-12 w-12 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-900 dark:hover:bg-white hover:text-white dark:hover:text-slate-900 transition-all"
                                            >
                                                <ArrowRight size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>

                    {isTrained && displayClients.length === 0 && (
                        <div className="py-20 text-center">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-black uppercase mb-4">
                                <CheckCircle2 size={14} /> Base Segura
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white">No hay riesgos detectados</h3>
                            <p className="text-slate-500 dark:text-slate-400 mt-2">Todos tus clientes están operando dentro de sus rangos normales.</p>
                        </div>
                    )}
                    </>
                    )}
                </main>
            </div>
        </div>
    );
}
