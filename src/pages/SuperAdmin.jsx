import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
    Building2, Users, Ticket, DollarSign, Search, Plus, 
    TrendingUp, ShieldCheck, Mail, Calendar, ExternalLink, 
    MoreHorizontal, ChevronRight, Activity, CreditCard, AlertCircle, X, Check, Save
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import toast from 'react-hot-toast';

export default function SuperAdmin() {
    const { role } = useAuth();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ total_companies: 0, total_users: 0, active_tickets: 0, total_mrr: 0 });
    const [empresas, setEmpresas] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('dashboard');
    
    // Modal State
    const [editingEmpresa, setEditingEmpresa] = useState(null);
    const [saving, setSaving] = useState(false);

    const isSuperAdmin = role === 'super-admin';

    useEffect(() => {
        if (isSuperAdmin) {
            fetchGlobalData();
        }
    }, [isSuperAdmin]);

    const fetchGlobalData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Stats from RPC
            const { data: statsData, error: statsError } = await supabase.rpc('get_super_admin_stats');
            if (statsError) throw statsError;
            setStats(statsData);

            // 2. Fetch Companies with Billing
            const { data: empData, error: empError } = await supabase
                .from('empresas')
                .select('*')
                .order('created_at', { ascending: false });
            if (empError) throw empError;

            // Enrich companies with usage metrics from RPC
            const enriched = await Promise.all(empData.map(async (emp) => {
                // Try RPC, if fails default to 0
                try {
                    const { data: usage, error: usageError } = await supabase.rpc('get_company_usage_stats', { p_empresa_id: emp.id });
                    if (usageError) throw usageError;
                    return { ...emp, usage: usage || { clients: 0, deliveries: 0, visits: 0 } };
                } catch (e) {
                    console.warn(`Could not fetch usage for ${emp.nombre}`, e);
                    return { ...emp, usage: { clients: 0, deliveries: 0, visits: 0 } };
                }
            }));
            setEmpresas(enriched);

            // 3. Fetch Recent Tickets
            const { data: ticketData, error: ticketError } = await supabase
                .from('tickets')
                .select('*, empresas(nombre)')
                .order('created_at', { ascending: false })
                .limit(10);
            if (ticketError) throw ticketError;
            setTickets(ticketData);

        } catch (error) {
            console.error('Error loading super-admin data:', error);
            toast.error('Error al cargar datos globales');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateBilling = async () => {
        if (!editingEmpresa) return;
        setSaving(true);
        try {
            const { error } = await supabase
                .from('empresas')
                .update({
                    billing_plan: editingEmpresa.billing_plan,
                    billing_price: editingEmpresa.billing_price,
                    billing_currency: editingEmpresa.billing_currency,
                    billing_status: editingEmpresa.billing_status,
                    billing_due_date: editingEmpresa.billing_due_date,
                    billing_notes: editingEmpresa.billing_notes
                })
                .eq('id', editingEmpresa.id);

            if (error) throw error;
            
            toast.success(`Plan de ${editingEmpresa.nombre} actualizado`);
            setEditingEmpresa(null);
            fetchGlobalData();
        } catch (error) {
            console.error('Error updating billing:', error);
            toast.error('No se pudo actualizar la facturación');
        } finally {
            setSaving(false);
        }
    };

    const filteredEmpresas = useMemo(() => {
        return empresas.filter(e => 
            e.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
            e.billing_plan?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [empresas, searchTerm]);

    if (!isSuperAdmin) {
        return (
            <div style={{ height: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                <ShieldCheck size={64} style={{ marginBottom: '20px', opacity: 0.2 }} />
                <h2>Acceso Restringido</h2>
                <p>Esta sección es exclusiva para el equipo de desarrollo y administración global.</p>
            </div>
        );
    }

    return (
        <div style={{ padding: '30px', maxWidth: '1400px', margin: '0 auto', position: 'relative' }}>
            {/* Header */}
            <div style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 style={{ fontSize: '2.2rem', fontWeight: 900, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
                        Super Admin <span style={{ color: 'var(--accent)', fontSize: '1rem', verticalAlign: 'middle', background: 'var(--accent-alpha)', padding: '4px 10px', borderRadius: '20px', marginLeft: '10px' }}>Dashboard</span>
                    </h1>
                    <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '1.1rem' }}>Control global de PickingUp CRM</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <Button variant="secondary" onClick={fetchGlobalData} disabled={loading}>
                        <Activity size={18} style={{ marginRight: '8px' }} />
                        Sincronizar Datos
                    </Button>
                </div>
            </div>

            {/* Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '40px' }}>
                <StatCard 
                    icon={<Building2 color="#8b5cf6" />} 
                    label="Empresas Totales" 
                    value={stats.total_companies} 
                    trend="+12% este mes"
                    bg="rgba(139, 92, 246, 0.1)"
                />
                <StatCard 
                    icon={<Users color="#3b82f6" />} 
                    label="Usuarios Activos" 
                    value={stats.total_users} 
                    bg="rgba(59, 130, 246, 0.1)"
                />
                <StatCard 
                    icon={<Ticket color="#ef4444" />} 
                    label="Soporte Pendiente" 
                    value={stats.active_tickets} 
                    bg="rgba(239, 68, 68, 0.1)"
                />
                <StatCard 
                    icon={<DollarSign color="#10b981" />} 
                    label="Ingresos (MRR)" 
                    value={`$${stats.total_mrr.toLocaleString()}`} 
                    trend="Creciendo"
                    bg="rgba(16, 185, 129, 0.1)"
                />
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '24px', marginBottom: '30px', borderBottom: '1px solid var(--border)' }}>
                <Tab text="Resumen General" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
                <Tab text="Suscripciones y Facturación" active={activeTab === 'billing'} onClick={() => setActiveTab('billing')} />
                <Tab text="Tickets de Soporte" active={activeTab === 'support'} onClick={() => setActiveTab('support')} />
            </div>

            {/* Content Area */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '100px', opacity: 0.5 }}>Cargando inteligencia global...</div>
            ) : activeTab === 'dashboard' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px' }}>
                    {/* Recent Companies */}
                    <Section title="Últimas Empresas">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {empresas.slice(0, 5).map(emp => (
                                <CompanyRow key={emp.id} company={emp} onEdit={() => { setEditingEmpresa({ ...emp }); setActiveTab('billing'); }} />
                            ))}
                        </div>
                    </Section>

                    {/* Recent Support */}
                    <Section title="Tickets Recientes">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {tickets.length > 0 ? tickets.map(t => (
                                <div key={t.id} style={{ padding: '15px', borderRadius: '12px', background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{t.asunto}</span>
                                        <StatusBadge status={t.estado} />
                                    </div>
                                    <p style={{ margin: '0 0 10px', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>{t.mensaje?.substring(0, 60)}...</p>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', opacity: 0.6 }}>
                                        <span>{t.empresas?.nombre || 'Global'}</span>
                                        <span>{new Date(t.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            )) : (
                                <p style={{ textAlign: 'center', opacity: 0.4 }}>No hay tickets pendientes.</p>
                            )}
                        </div>
                    </Section>
                </div>
            ) : activeTab === 'billing' ? (
                <div>
                     <div style={{ marginBottom: '20px', display: 'flex', gap: '15px' }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
                            <input 
                                className="input" 
                                placeholder="Buscar empresa por nombre o plan..." 
                                style={{ paddingLeft: '40px' }}
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div style={{ background: 'var(--bg-elevated)', borderRadius: '20px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: 'var(--bg-glass)', borderBottom: '1px solid var(--border)' }}>
                                    <th style={thStyle}>Empresa</th>
                                    <th style={thStyle}>Plan</th>
                                    <th style={thStyle}>Estado</th>
                                    <th style={thStyle}>MRR</th>
                                    <th style={thStyle}>Prox. Cobro</th>
                                    <th style={thStyle}>Uso (Locales)</th>
                                    <th style={thStyle}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredEmpresas.map(emp => (
                                    <tr key={emp.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={tdStyle}>
                                            <div style={{ fontWeight: 700 }}>{emp.nombre}</div>
                                            <div style={{ fontSize: '0.75rem', opacity: 0.5 }}>ID: {emp.id.slice(0,8)}</div>
                                        </td>
                                        <td style={tdStyle}><span style={{ background: 'var(--accent-alpha)', color: 'var(--accent)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600 }}>{emp.billing_plan || 'free'}</span></td>
                                        <td style={tdStyle}><StatusBadge status={emp.billing_status || 'active'} /></td>
                                        <td style={tdStyle}><span style={{ fontWeight: 700 }}>${emp.billing_price || 0}</span></td>
                                        <td style={tdStyle}>{emp.billing_due_date ? new Date(emp.billing_due_date).toLocaleDateString() : 'N/A'}</td>
                                        <td style={tdStyle}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <div style={{ width: '40px', height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                                                    <div style={{ width: `${Math.min((emp.usage?.clients || 0) / 500 * 100, 100)}%`, height: '100%', background: 'var(--accent)' }} />
                                                </div>
                                                <span style={{ fontSize: '0.8rem' }}>{emp.usage?.clients || 0}</span>
                                            </div>
                                        </td>
                                        <td style={tdStyle}>
                                            <button 
                                                onClick={() => setEditingEmpresa({ ...emp })}
                                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--accent)' }}
                                            >
                                                <CreditCard size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div style={{ textAlign: 'center', padding: '100px', opacity: 0.4 }}>
                    <Ticket size={48} style={{ marginBottom: '15px' }} />
                    <p>Módulo de gestión avanzada de tickets en desarrollo...</p>
                </div>
            )}

            {/* Edit Billing Modal */}
            {editingEmpresa && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', 
                    zIndex: 2000, padding: '20px'
                }}>
                    <div style={{
                        background: 'var(--bg-card)', width: '100%', maxWidth: '600px',
                        borderRadius: '32px', border: '1px solid var(--accent)',
                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                        overflow: 'hidden', animation: 'modalSlideIn 0.3s ease-out'
                    }}>
                        {/* Modal Header */}
                        <div style={{ padding: '30px', background: 'var(--accent-alpha)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>Gestionar Plan</h2>
                                <p style={{ margin: '4px 0 0', opacity: 0.6, fontSize: '0.9rem' }}>{editingEmpresa.nombre}</p>
                            </div>
                            <button onClick={() => setEditingEmpresa(null)} style={{ background: 'var(--bg-elevated)', border: 'none', borderRadius: '12px', padding: '10px', cursor: 'pointer', color: 'var(--text-primary)' }}>
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div style={{ padding: '30px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={labelStyle}>Plan de Suscripción</label>
                                <select 
                                    className="input" 
                                    value={editingEmpresa.billing_plan || 'free'}
                                    onChange={e => setEditingEmpresa({ ...editingEmpresa, billing_plan: e.target.value })}
                                >
                                    <option value="free">Gratuito (Free)</option>
                                    <option value="pro">Profesional (Pro)</option>
                                    <option value="enterprise">Corporativo (Enterprise)</option>
                                    <option value="custom">Personalizado</option>
                                </select>
                            </div>

                            <div>
                                <label style={labelStyle}>Precio Mensual</label>
                                <div style={{ position: 'relative' }}>
                                    <DollarSign size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
                                    <input 
                                        type="number" 
                                        className="input" 
                                        style={{ paddingLeft: '35px' }}
                                        value={editingEmpresa.billing_price || 0}
                                        onChange={e => setEditingEmpresa({ ...editingEmpresa, billing_price: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={labelStyle}>Moneda</label>
                                <select 
                                    className="input" 
                                    value={editingEmpresa.billing_currency || 'ARS'}
                                    onChange={e => setEditingEmpresa({ ...editingEmpresa, billing_currency: e.target.value })}
                                >
                                    <option value="ARS">ARS - Pesos Argentinos</option>
                                    <option value="USD">USD - Dólares</option>
                                    <option value="EUR">EUR - Euros</option>
                                </select>
                            </div>

                            <div>
                                <label style={labelStyle}>Estado de Pago</label>
                                <select 
                                    className="input" 
                                    value={editingEmpresa.billing_status || 'active'}
                                    onChange={e => setEditingEmpresa({ ...editingEmpresa, billing_status: e.target.value })}
                                >
                                    <option value="active">Activo / Al día</option>
                                    <option value="pending">Pago Pendiente</option>
                                    <option value="overdue">Mora / Suspendido</option>
                                    <option value="trial">Periodo de Prueba</option>
                                </select>
                            </div>

                            <div>
                                <label style={labelStyle}>Próximo Vencimiento</label>
                                <input 
                                    type="date" 
                                    className="input" 
                                    value={editingEmpresa.billing_due_date || ''}
                                    onChange={e => setEditingEmpresa({ ...editingEmpresa, billing_due_date: e.target.value })}
                                />
                            </div>

                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={labelStyle}>Notas Internas</label>
                                <textarea 
                                    className="input" 
                                    rows="3" 
                                    style={{ resize: 'none' }}
                                    placeholder="Notas sobre el acuerdo, bonificaciones, etc."
                                    value={editingEmpresa.billing_notes || ''}
                                    onChange={e => setEditingEmpresa({ ...editingEmpresa, billing_notes: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div style={{ padding: '20px 30px', background: 'var(--bg-glass)', borderTop: '1px solid var(--border)', display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
                            <Button variant="secondary" onClick={() => setEditingEmpresa(null)}>Cerrar</Button>
                            <Button onClick={handleUpdateBilling} disabled={saving}>
                                <Save size={18} style={{ marginRight: '8px' }} />
                                {saving ? 'Guardando...' : 'Guardar Cambios'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes modalSlideIn {
                    from { transform: translateY(30px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
}

// Helper Components
function StatCard({ icon, label, value, trend, bg }) {
    return (
        <div style={{ 
            background: 'var(--bg-elevated)', 
            padding: '24px', 
            borderRadius: '24px', 
            border: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ padding: '12px', borderRadius: '16px', background: bg }}>{icon}</div>
                {trend && <span style={{ fontSize: '0.75rem', color: trend.includes('+') ? '#10b981' : 'var(--accent)', fontWeight: 600 }}>{trend}</span>}
            </div>
            <div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 500 }}>{label}</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 900, letterSpacing: '-0.03em' }}>{value}</div>
            </div>
        </div>
    );
}

function Tab({ text, active, onClick }) {
    return (
        <button 
            onClick={onClick}
            style={{ 
                padding: '12px 4px', 
                background: 'transparent', 
                border: 'none', 
                borderBottom: active ? '3px solid var(--accent)' : '3px solid transparent',
                color: active ? 'var(--text-primary)' : 'var(--text-muted)',
                fontWeight: active ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.2s'
            }}
        >
            {text}
        </button>
    );
}

function Section({ title, children }) {
    return (
        <div style={{ background: 'var(--bg-card)', borderRadius: '28px', padding: '30px', border: '1px solid var(--border)' }}>
            <h3 style={{ margin: '0 0 25px', fontSize: '1.2rem', fontWeight: 800 }}>{title}</h3>
            {children}
        </div>
    );
}

function CompanyRow({ company, onEdit }) {
    return (
        <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '16px', 
            padding: '16px', 
            borderRadius: '16px', 
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            transition: 'transform 0.2s',
            cursor: 'pointer'
        }} onClick={onEdit}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Building2 size={20} color="white" />
            </div>
            <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>{company.nombre}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{company.usage?.clients || 0} locales • {company.billing_plan || 'free'}</div>
            </div>
            <ChevronRight size={18} style={{ opacity: 0.3 }} />
        </div>
    );
}

function StatusBadge({ status }) {
    const colors = {
        active: { bg: 'rgba(16, 185, 129, 0.1)', text: '#10b981' },
        pending: { bg: 'rgba(245, 158, 11, 0.1)', text: '#f59e0b' },
        overdue: { bg: 'rgba(239, 68, 68, 0.1)', text: '#ef4444' },
        trial: { bg: 'rgba(59, 130, 246, 0.1)', text: '#3b82f6' },
        Abierto: { bg: 'rgba(239, 68, 68, 0.1)', text: '#ef4444' },
        Cerrado: { bg: 'rgba(107, 114, 128, 0.1)', text: '#6b7280' },
        default: { bg: 'var(--border)', text: 'var(--text-muted)' }
    };
    const c = colors[status] || colors.default;
    return (
        <span style={{ 
            fontSize: '0.75rem', 
            fontWeight: 700, 
            padding: '4px 10px', 
            borderRadius: '20px', 
            background: c.bg, 
            color: c.text,
            textTransform: 'uppercase'
        }}>
            {status}
        </span>
    );
}

const thStyle = { padding: '16px', textAlign: 'left', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' };
const tdStyle = { padding: '16px', fontSize: '0.9rem' };
const labelStyle = { display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px', opacity: 0.7 };
