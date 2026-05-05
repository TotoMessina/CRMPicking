import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
    Package, 
    Plus, 
    AlertTriangle, 
    History, 
    Save,
    Trash2,
    X
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

interface Material {
    id: string;
    nombre: string;
    descripcion: string;
    stock_actual: number;
    stock_minimo: number;
    icon: string;
}

const InventarioMarketing: React.FC = () => {
    const { empresaActiva }: any = useAuth();
    const [materials, setMaterials] = useState<Material[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    
    const [formData, setFormData] = useState({
        nombre: '',
        descripcion: '',
        stock_actual: 0,
        stock_minimo: 10,
        icon: 'Package'
    });

    const fetchMaterials = async () => {
        if (!empresaActiva?.id) return;
        setLoading(true);
        const { data, error } = await (supabase as any)
            .from('marketing_material')
            .select('*')
            .eq('empresa_id', empresaActiva.id)
            .order('nombre');
        
        if (error) toast.error('Error al cargar inventario');
        else setMaterials(data || []);
        setLoading(false);
    };

    useEffect(() => {
        fetchMaterials();
    }, [empresaActiva?.id]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!empresaActiva?.id) return;

        const { error } = await (supabase as any)
            .from('marketing_material')
            .insert([{ ...formData, empresa_id: empresaActiva.id }]);

        if (error) {
            toast.error('Error al guardar material');
        } else {
            toast.success('Material creado correctamente');
            setShowModal(false);
            setFormData({ nombre: '', descripcion: '', stock_actual: 0, stock_minimo: 10, icon: 'Package' });
            fetchMaterials();
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('¿Estás seguro de eliminar este material?')) return;
        const { error } = await (supabase as any).from('marketing_material').delete().eq('id', id);
        if (error) toast.error('Error al eliminar');
        else {
            toast.success('Material eliminado');
            fetchMaterials();
        }
    };

    return (
        <div style={{ padding: '30px', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                <div>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 900, margin: 0, letterSpacing: '-0.05em' }}>
                        Inventario <span className="text-accent">Marketing</span>
                    </h1>
                    <p className="muted">Control de stock de materiales para el equipo de calle</p>
                </div>
                <button 
                    onClick={() => setShowModal(true)}
                    className="btn-primary" 
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '14px' }}
                >
                    <Plus size={20} /> Nuevo Material
                </button>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>
                    <div className="spinner"></div>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
                    {materials.map(m => (
                        <motion.div 
                            layout
                            key={m.id}
                            className="bento-card"
                            style={{ 
                                padding: '24px', 
                                position: 'relative',
                                border: m.stock_actual <= m.stock_minimo ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--border)'
                            }}
                        >
                            {m.stock_actual <= m.stock_minimo && (
                                <div style={{ 
                                    position: 'absolute', top: '12px', right: '12px', 
                                    background: '#ef4444', color: 'white', 
                                    padding: '4px 8px', borderRadius: '6px', 
                                    fontSize: '0.65rem', fontWeight: 800,
                                    display: 'flex', alignItems: 'center', gap: '4px'
                                }}>
                                    <AlertTriangle size={12} /> STOCK BAJO
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', marginBottom: '20px' }}>
                                <div style={{ 
                                    width: '48px', height: '48px', borderRadius: '12px', 
                                    background: 'var(--accent-soft)', display: 'grid', placeItems: 'center',
                                    color: 'var(--accent)'
                                }}>
                                    <Package size={24} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{m.nombre}</h3>
                                    <p className="muted" style={{ fontSize: '0.8rem', margin: '4px 0 0 0' }}>{m.descripcion}</p>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                                <div style={{ background: 'var(--bg-body)', padding: '12px', borderRadius: '12px', textAlign: 'center' }}>
                                    <div className="muted" style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}>Actual</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: m.stock_actual <= m.stock_minimo ? '#ef4444' : 'var(--text)' }}>
                                        {m.stock_actual}
                                    </div>
                                </div>
                                <div style={{ background: 'var(--bg-body)', padding: '12px', borderRadius: '12px', textAlign: 'center' }}>
                                    <div className="muted" style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}>Mínimo</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 900 }}>{m.stock_minimo}</div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button className="btn-secondary" style={{ flex: 1, fontSize: '0.8rem', gap: '6px' }}>
                                    <History size={14} /> Historial
                                </button>
                                <button 
                                    onClick={() => handleDelete(m.id)}
                                    style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', cursor: 'pointer', display: 'grid', placeItems: 'center' }}
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Modal de Creación */}
            {showModal && (
                <div className="modal-overlay">
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="modal-content" 
                        style={{ maxWidth: '450px' }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h2 style={{ margin: 0 }}>Nuevo Material</h2>
                            <button onClick={() => setShowModal(false)} className="btn-icon"><X size={20} /></button>
                        </div>
                        
                        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label className="label">Nombre del Material</label>
                                <input 
                                    className="input" 
                                    required 
                                    placeholder="Ej: Folletos A5"
                                    value={formData.nombre}
                                    onChange={e => setFormData({...formData, nombre: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="label">Descripción</label>
                                <textarea 
                                    className="input" 
                                    placeholder="Ej: Folleto institucional para locales nuevos"
                                    value={formData.descripcion}
                                    onChange={e => setFormData({...formData, descripcion: e.target.value})}
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div>
                                    <label className="label">Stock Inicial</label>
                                    <input 
                                        type="number" 
                                        className="input" 
                                        required 
                                        value={formData.stock_actual}
                                        onChange={e => setFormData({...formData, stock_actual: parseInt(e.target.value)})}
                                    />
                                </div>
                                <div>
                                    <label className="label">Alerta de Mínimo</label>
                                    <input 
                                        type="number" 
                                        className="input" 
                                        required 
                                        value={formData.stock_minimo}
                                        onChange={e => setFormData({...formData, stock_minimo: parseInt(e.target.value)})}
                                    />
                                </div>
                            </div>
                            <button type="submit" className="btn-primary" style={{ marginTop: '12px' }}>
                                <Save size={18} /> Guardar Material
                            </button>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
};


export default InventarioMarketing;
