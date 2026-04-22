import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInternalAI } from '../hooks/useInternalAI';
import { supabase } from '../lib/supabase';
import { ShieldAlert, AlertTriangle, CheckCircle2, Phone, Search, RefreshCw, Activity, Mail, Target, ArrowRight, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function InternalAI() {
    const navigate = useNavigate();
    const { trainFromHistory, getAIChurnRisk, isTrained } = useInternalAI();
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [analyzing, setAnalyzing] = useState(false);

    useEffect(() => {
        fetchTopClients();
    }, []);

    useEffect(() => {
        if (isTrained && clients.length > 0 && !clients[0].prob) {
            analyzeClients();
        }
    }, [isTrained, clients]);

    const fetchTopClients = async () => {
        setLoading(true);
        // Traemos más clientes para que el radar tenga sentido
        const { data, error } = await supabase
            .from('empresa_cliente')
            .select('cliente_id, ultima_actividad, created_at, estado, notas, clientes(id, nombre, telefono, mail)')
            .limit(30);
        
        if (!error && data) {
            const ids = data.map(d => d.cliente_id);
            const { data: actData } = await supabase
                .from('actividades')
                .select('cliente_id, fecha')
                .in('cliente_id', ids)
                .order('fecha', { ascending: false });

            const flattened = data.map(item => ({
                id: item.clientes?.id,
                nombre: item.clientes?.nombre || 'Sin Nombre',
                telefono: item.clientes?.telefono,
                mail: item.clientes?.mail,
                ultima_actividad: item.ultima_actividad,
                created_at: item.created_at,
                estado: item.estado,
                notas: item.notas,
                history: actData?.filter(a => a.cliente_id === item.cliente_id) || []
            }));
            setClients(flattened);
        }
        setLoading(false);
    };

    const handleAnalyze = async () => {
        setAnalyzing(true);
        await trainFromHistory();
        setAnalyzing(false);
        analyzeClients();
    };

    const analyzeClients = () => {
        const analyzed = clients.map(c => {
            // Pasamos el historial real de actividades a la función de riesgo
            const prob = getAIChurnRisk(c, c.history);
            let riskLevel = 'bajo';
            if (prob > 0.7) riskLevel = 'alto';
            else if (prob > 0.4) riskLevel = 'medio';
            
            return { ...c, prob, riskLevel };
        });
        
        // Ordenamos para que los de riesgo alto salgan primero
        analyzed.sort((a, b) => (b.prob || 0) - (a.prob || 0));
        setClients(analyzed);
    };

    const atRiskClients = clients.filter(c => c.riskLevel === 'alto' || c.riskLevel === 'medio');
    const safeClients = clients.filter(c => c.riskLevel === 'bajo');

    // Animaciones
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };
    
    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0f172a] p-4 md:p-8">
            <motion.div 
                initial="hidden"
                animate="visible"
                variants={containerVariants}
                className="max-w-6xl mx-auto space-y-8"
            >
                
                {/* ── HERO HEADER PREMIUM ──────────────────────────── */}
                <motion.header variants={itemVariants} className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 p-8 md:p-12 text-white shadow-2xl">
                    {/* Efectos de fondo */}
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-blue-500/30 to-violet-500/30 rounded-full -mr-48 -mt-48 blur-3xl" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/20 rounded-full -ml-24 -mb-24 blur-3xl" />
                    
                    <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-10">
                        <div className="flex-1 text-center lg:text-left">
                            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase mb-6 border border-white/10">
                                <Target size={14} className="text-emerald-400" />
                                Inteligencia Predictiva
                            </div>
                            <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4 leading-tight">
                                Radar de <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">Retención</span>
                            </h1>
                            <p className="text-slate-300 text-lg max-w-xl font-medium leading-relaxed mx-auto lg:mx-0">
                                La IA analiza silenciosamente el comportamiento de tu cartera para avisarte quién necesita atención inmediata antes de que deje de comprarte.
                            </p>
                        </div>

                        <div className="flex flex-col items-center gap-4 shrink-0">
                            <div className="relative group">
                                <div className={`absolute -inset-1 rounded-2xl blur-lg opacity-70 group-hover:opacity-100 transition duration-500 ${analyzing ? 'bg-blue-500' : isTrained ? 'bg-emerald-500' : 'bg-violet-500'}`}></div>
                                <button 
                                    onClick={handleAnalyze}
                                    disabled={analyzing}
                                    className={`relative flex items-center justify-center gap-3 px-8 py-5 rounded-2xl font-black text-lg transition-all shadow-xl w-full sm:w-auto ${
                                        analyzing 
                                        ? 'bg-slate-800 text-slate-400 cursor-not-allowed' 
                                        : 'bg-white text-slate-900 hover:scale-[1.02]'
                                    }`}
                                >
                                    <RefreshCw className={analyzing ? 'animate-spin text-blue-500' : isTrained ? 'text-emerald-500' : 'text-violet-500'} size={24} />
                                    {analyzing ? 'ANALIZANDO PATRONES...' : isTrained ? 'ACTUALIZAR RADAR' : 'ENCENDER RADAR AHORA'}
                                </button>
                            </div>
                            <span className="text-slate-400 text-xs font-bold flex items-center gap-2">
                                <Activity size={14} /> 100% Privado. Los datos no salen del CRM.
                            </span>
                        </div>
                    </div>
                </motion.header>

                {/* ── ESTADO INICIAL (RADAR APAGADO) ────────────────── */}
                <AnimatePresence mode="wait">
                    {!isTrained && !analyzing && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white dark:bg-slate-800/50 backdrop-blur-xl border border-slate-200 dark:border-slate-700/50 rounded-[2.5rem] p-16 text-center shadow-lg relative overflow-hidden"
                        >
                            {/* Animación CSS de Radar */}
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 border border-slate-200 dark:border-slate-700 rounded-full opacity-20" />
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-slate-200 dark:border-slate-700 rounded-full opacity-40" />
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 border border-slate-200 dark:border-slate-700 rounded-full opacity-60" />
                            
                            <div className="relative z-10 flex flex-col items-center">
                                <div className="w-24 h-24 bg-slate-100 dark:bg-slate-700/50 rounded-full flex items-center justify-center mb-6">
                                    <Search size={40} className="text-slate-400" />
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3">El Radar está inactivo</h3>
                                <p className="text-slate-500 dark:text-slate-400 max-w-md">Enciende el radar para descubrir oportunidades ocultas y evitar la pérdida de clientes en tu base de datos actual.</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── RESULTADOS DEL ANÁLISIS ────────────────── */}
                {isTrained && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-8"
                    >
                        {/* KPI CARDS CON GLASSMORPHISM */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <motion.div variants={itemVariants} className="relative overflow-hidden bg-white dark:bg-slate-800 rounded-[2rem] p-8 border border-slate-200 dark:border-slate-700 shadow-lg group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl group-hover:bg-rose-500/20 transition-all" />
                                <div className="relative z-10">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400">
                                            <ShieldAlert size={24} />
                                        </div>
                                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Requieren Rescate</h2>
                                    </div>
                                    <div className="flex items-baseline gap-3 mb-2">
                                        <span className="text-5xl font-black text-slate-900 dark:text-white">{atRiskClients.length}</span>
                                        <span className="text-slate-500 font-medium text-lg">clientes</span>
                                    </div>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm">Alta inactividad detectada. Contáctalos para evitar que se vayan a la competencia.</p>
                                </div>
                            </motion.div>

                            <motion.div variants={itemVariants} className="relative overflow-hidden bg-white dark:bg-slate-800 rounded-[2rem] p-8 border border-slate-200 dark:border-slate-700 shadow-lg group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all" />
                                <div className="relative z-10">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                            <CheckCircle2 size={24} />
                                        </div>
                                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Base Saludable</h2>
                                    </div>
                                    <div className="flex items-baseline gap-3 mb-2">
                                        <span className="text-5xl font-black text-slate-900 dark:text-white">{safeClients.length}</span>
                                        <span className="text-slate-500 font-medium text-lg">clientes</span>
                                    </div>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm">Mantienen un comportamiento de interacción y compra dentro de lo esperado.</p>
                                </div>
                            </motion.div>
                        </div>

                        {/* LISTA DE ACCIÓN: TARJETAS VISUALES */}
                        {atRiskClients.length > 0 && (
                            <motion.div variants={itemVariants} className="pt-4">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                                        <Phone className="text-violet-500" />
                                        Tu plan de llamadas para hoy
                                    </h3>
                                    <span className="bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
                                        {atRiskClients.length} urgentes
                                    </span>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {atRiskClients.map((cliente, index) => {
                                        const isHigh = cliente.riskLevel === 'alto';
                                        const now = new Date();
                                        const lastDate = cliente.ultima_actividad || cliente.created_at;
                                        const diasInactivo = lastDate ? Math.floor((now.getTime() - new Date(lastDate).getTime()) / 86400000) : '?';

                                        return (
                                            <motion.div 
                                                key={cliente.id}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: index * 0.1 }}
                                                className={`bg-white dark:bg-slate-800 rounded-2xl p-6 border-2 transition-all hover:shadow-xl ${
                                                    isHigh 
                                                    ? 'border-rose-200 dark:border-rose-900/50 hover:border-rose-400' 
                                                    : 'border-amber-200 dark:border-amber-900/50 hover:border-amber-400'
                                                }`}
                                            >
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider mb-3 ${
                                                            isHigh ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400' : 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400'
                                                        }`}>
                                                            {isHigh ? <AlertTriangle size={12} /> : <Search size={12} />}
                                                            {isHigh ? 'Riesgo Crítico' : 'Atención Requerida'}
                                                        </div>
                                                        <h4 className="text-xl font-bold text-slate-900 dark:text-white line-clamp-1">{cliente.nombre}</h4>
                                                    </div>
                                                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-500 shrink-0">
                                                        {cliente.nombre[0]}
                                                    </div>
                                                </div>

                                                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 mb-6">
                                                    <p className="text-sm text-slate-600 dark:text-slate-400">
                                                        <strong className="text-slate-900 dark:text-white">{diasInactivo} días</strong> de silencio. La IA detectó una interrupción en su patrón habitual. Sugerimos contacto reactivador.
                                                    </p>
                                                </div>

                                                <div className="flex flex-wrap gap-2">
                                                    {cliente.telefono ? (
                                                        <a href={`tel:${cliente.telefono}`} className="flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 dark:text-slate-900 text-white rounded-xl font-bold transition-colors shadow-sm">
                                                            <Phone size={18} /> Llamar
                                                        </a>
                                                    ) : (
                                                        <button disabled className="flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-xl font-bold cursor-not-allowed">
                                                            <Phone size={18} /> Sin Teléfono
                                                        </button>
                                                    )}
                                                    
                                                    {cliente.mail && (
                                                        <a href={`mailto:${cliente.mail}`} className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold transition-colors">
                                                            <Mail size={18} />
                                                        </a>
                                                    )}
                                                    
                                                    <button 
                                                        onClick={() => navigate('/clientes', { state: { nombre: cliente.nombre } })}
                                                        className="flex items-center justify-center gap-2 px-4 py-3 bg-violet-50 hover:bg-violet-100 dark:bg-violet-500/10 dark:hover:bg-violet-500/20 text-violet-600 dark:text-violet-400 rounded-xl font-bold transition-colors ml-auto group"
                                                    >
                                                        Ficha <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                                    </button>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        )}
                        
                        {atRiskClients.length === 0 && (
                            <motion.div variants={itemVariants} className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-900/50 rounded-[2rem] p-12 text-center">
                                <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-500">
                                    <CheckCircle2 size={40} />
                                </div>
                                <h3 className="text-2xl font-black text-emerald-900 dark:text-emerald-100 mb-2">¡Todo bajo control!</h3>
                                <p className="text-emerald-700 dark:text-emerald-300">La IA no ha detectado ningún cliente con riesgo alto de abandono en este momento.</p>
                            </motion.div>
                        )}
                    </motion.div>
                )}
            </motion.div>
        </div>
    );
}
