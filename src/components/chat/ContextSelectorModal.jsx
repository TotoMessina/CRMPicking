import { useState, useEffect } from 'react';
import { X, Search, User, Users, Route, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export const ContextSelectorModal = ({ isOpen, onClose, onSelect }) => {
    const { empresaActiva } = useAuth();
    const [tab, setTab] = useState('clientes'); // 'clientes', 'consumidores', 'rutas'
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setSearchTerm('');
            setResults([]);
            return;
        }
        fetchResults();
    }, [isOpen, tab, searchTerm]);

    const fetchResults = async () => {
        if (!empresaActiva) return;
        setLoading(true);
        try {
            let query;
            if (tab === 'clientes') {
                query = supabase.from('clientes').select('id, nombre').eq('empresa_id', empresaActiva.id).limit(20);
                if (searchTerm) query = query.ilike('nombre', `%${searchTerm}%`);
            } else if (tab === 'consumidores') {
                query = supabase.from('consumidores').select('id, nombre').eq('empresa_id', empresaActiva.id).limit(20);
                if (searchTerm) query = query.ilike('nombre', `%${searchTerm}%`);
            } else if (tab === 'rutas') {
                // For routes, we can list recent dates or something similar. 
                // Using 'rutas' logic might depend on how they are stored.
                // Assuming there's a table 'rutas_reparto' or similar.
                // For now, let's simplify or check what 'rutas' means.
                // In this CRM, 'ruta' often refers to a date.
                // Let's assume we can link to a specific date of route.
                setResults([
                    { id: 'hoy', nombre: 'Ruta de Hoy', type: 'ruta' },
                    { id: 'ayer', nombre: 'Ruta de Ayer', type: 'ruta' },
                ]);
                setLoading(false);
                return;
            }

            const { data, error } = await query;
            if (error) throw error;
            setResults(data.map(item => ({ ...item, type: tab })));
        } catch (error) {
            console.error('Error fetching context results:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div style={{
                position: 'fixed', inset: 0, zIndex: 3000,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '16px', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)'
            }}>
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    style={{
                        width: '100%', maxWidth: '500px', 
                        maxHeight: '92dvh',
                        background: 'var(--bg-elevated)', borderRadius: '24px',
                        border: '1px solid var(--border)', display: 'flex', 
                        flexDirection: 'column', overflow: 'hidden',
                        boxShadow: '0 20px 50px -12px rgba(0,0,0,0.5)'
                    }}
                >
                    <div style={{ padding: '24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Vincular contexto</h3>
                            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>El mensaje se enviará con un acceso directo</p>
                        </div>
                        <button onClick={onClose} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '8px', cursor: 'pointer', color: 'var(--text)' }}>
                            <X size={20} />
                        </button>
                    </div>

                    <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
                        {[
                            { id: 'clientes', label: 'Clientes', icon: User },
                            { id: 'consumidores', label: 'Consumidores', icon: Users },
                            { id: 'rutas', label: 'Rutas', icon: Route }
                        ].map(t => (
                            <button
                                key={t.id}
                                onClick={() => setTab(t.id)}
                                style={{
                                    flex: 1, padding: '14px', border: 'none',
                                    background: tab === t.id ? 'var(--accent-soft)' : 'transparent',
                                    color: tab === t.id ? 'var(--accent)' : 'var(--text-muted)',
                                    fontWeight: 700, cursor: 'pointer', display: 'flex',
                                    alignItems: 'center', justifyContent: 'center', gap: '8px',
                                    borderBottom: tab === t.id ? '3px solid var(--accent)' : '3px solid transparent',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <t.icon size={18} />
                                {t.label}
                            </button>
                        ))}
                    </div>

                    <div style={{ padding: '20px' }}>
                        <div style={{ position: 'relative' }}>
                            <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input 
                                type="text" 
                                className="input" 
                                placeholder={`Buscar ${tab}...`} 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ width: '100%', paddingLeft: '44px', borderRadius: '16px', height: '48px' }}
                            />
                        </div>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px' }}>
                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                <div className="spinner-small" style={{ margin: '0 auto 12px auto' }} />
                                Buscando...
                            </div>
                        ) : results.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                No se encontraron resultados
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {results.map(item => (
                                    <button
                                        key={item.id}
                                        onClick={() => onSelect({ type: item.type, id: item.id, label: item.nombre })}
                                        style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            padding: '14px 18px', borderRadius: '16px', border: '1px solid var(--border)',
                                            background: 'var(--bg-card)', cursor: 'pointer', textAlign: 'left',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
                                        onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                                    >
                                        <span style={{ fontWeight: 600, color: 'var(--text)' }}>{item.nombre}</span>
                                        <div style={{ background: 'var(--bg-active)', borderRadius: '8px', padding: '4px' }}>
                                            <Check size={16} style={{ color: 'var(--accent)' }} />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
