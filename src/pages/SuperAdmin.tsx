import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
    Building2, Users, Ticket, DollarSign, Search, 
    ShieldCheck, Activity, CreditCard, X, ChevronRight, Save, Sparkles 
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import toast from 'react-hot-toast';
import { useTenant } from '../contexts/TenantContext';
import { defaultTenantConfig } from '../config/tenant';
import '../styles/superadmin.css';

interface Company {
    id: string;
    nombre: string;
    billing_plan?: string;
    billing_price?: number | string;
    billing_currency?: string;
    billing_status?: string;
    billing_due_date?: string | null;
    billing_notes?: string | null;
    config?: any;
    created_at?: string;
    usage?: {
        clients: number;
        deliveries: number;
        visits: number;
    };
}

interface SupportTicket {
    id: string | number;
    asunto: string;
    mensaje?: string;
    estado: string;
    created_at: string;
    empresas?: {
        nombre: string;
    } | null;
}

interface Stats {
    total_companies: number;
    total_users: number;
    active_tickets: number;
    total_mrr: number;
}

export default function SuperAdmin() {
    const { role } = useAuth();
    const { tenantConfig } = useTenant();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<Stats>({ total_companies: 0, total_users: 0, active_tickets: 0, total_mrr: 0 });
    const [empresas, setEmpresas] = useState<Company[]>([]);
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('dashboard');
    
    // Modal State
    const [editingEmpresa, setEditingEmpresa] = useState<Company | null>(null);
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
            setStats(statsData as unknown as Stats);

            // 2. Fetch Companies with Billing
            const { data: empData, error: empError } = await supabase
                .from('empresas')
                .select('*')
                .order('created_at', { ascending: false });
            if (empError) throw empError;

            // Enrich companies with usage metrics from RPC
            const enriched = await Promise.all((empData as Company[]).map(async (emp) => {
                // Try RPC, if fails default to 0
                try {
                    const { data: usage, error: usageError } = await supabase.rpc('get_company_usage_stats', { p_empresa_id: emp.id });
                    if (usageError) throw usageError;
                    return { ...emp, usage: (usage as any) || { clients: 0, deliveries: 0, visits: 0 } };
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
            setTickets((ticketData as SupportTicket[]) || []);

        } catch (error) {
            console.error("SuperAdmin load error", error);
            toast.error("Error al cargar datos globales de administración");
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
                    billing_price: editingEmpresa.billing_price !== undefined && editingEmpresa.billing_price !== null ? Number(editingEmpresa.billing_price) : null,
                    billing_currency: editingEmpresa.billing_currency,
                    billing_status: editingEmpresa.billing_status,
                    billing_due_date: editingEmpresa.billing_due_date,
                    billing_notes: editingEmpresa.billing_notes,
                    config: editingEmpresa.config
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
            <div className="superadmin-access-denied">
                <ShieldCheck size={64} />
                <h2>Acceso Restringido</h2>
                <p>Esta sección es exclusiva para el equipo de desarrollo y administración global.</p>
            </div>
        );
    }

    return (
        <div className="superadmin-container">
            {/* Header */}
            <div className="superadmin-header">
                <div>
                    <h1 className="superadmin-title">
                        Super Admin <span className="superadmin-badge">Dashboard</span>
                    </h1>
                    <p className="superadmin-subtitle">Control global de {tenantConfig.app.name}</p>
                </div>
                <div className="superadmin-actions">
                    <Button variant="secondary" onClick={fetchGlobalData} disabled={loading} className="superadmin-actions-btn">
                        <Activity size={18} />
                        Sincronizar Datos
                    </Button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="superadmin-grid-metrics">
                <StatCard 
                    icon={<Building2 color="var(--accent)" />} 
                    label="Empresas Totales" 
                    value={stats.total_companies} 
                    trend="+12% este mes"
                    bg="var(--accent-soft)"
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
            <div className="superadmin-tabs">
                <Tab text="Resumen General" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
                <Tab text="Suscripciones y Facturación" active={activeTab === 'billing'} onClick={() => setActiveTab('billing')} />
                <Tab text="Tickets de Soporte" active={activeTab === 'support'} onClick={() => setActiveTab('support')} />
            </div>

            {/* Content Area */}
            {loading ? (
                <div className="superadmin-intelligence-loading">Cargando inteligencia global...</div>
            ) : activeTab === 'dashboard' ? (
                <div className="superadmin-layout-split">
                    {/* Recent Companies */}
                    <Section title="Últimas Empresas">
                        <div className="superadmin-layout-column">
                            {empresas.slice(0, 5).map(emp => (
                                <CompanyRow key={emp.id} company={emp} onEdit={() => { setEditingEmpresa({ ...emp }); setActiveTab('billing'); }} />
                            ))}
                        </div>
                    </Section>

                    {/* Recent Support */}
                    <Section title="Tickets Recientes">
                        <div className="superadmin-tickets-container">
                            {tickets.length > 0 ? tickets.map(t => (
                                <div key={t.id} className="superadmin-ticket-card">
                                    <div className="superadmin-ticket-header">
                                        <span className="superadmin-ticket-title">{t.asunto}</span>
                                        <StatusBadge status={t.estado} />
                                    </div>
                                    <p className="superadmin-ticket-body">{t.mensaje?.substring(0, 60)}...</p>
                                    <div className="superadmin-ticket-footer">
                                        <span>{t.empresas?.nombre || 'Global'}</span>
                                        <span>{new Date(t.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            )) : (
                                <p className="superadmin-tickets-empty">No hay tickets pendientes.</p>
                            )}
                        </div>
                    </Section>
                </div>
            ) : activeTab === 'billing' ? (
                <div>
                     <div className="superadmin-search-wrapper">
                        <div className="superadmin-search-box">
                            <Search size={18} className="superadmin-search-icon" />
                            <input 
                                className="input superadmin-search-input" 
                                placeholder="Buscar empresa por nombre o plan..." 
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="superadmin-table-container">
                        <table className="superadmin-table">
                            <thead>
                                <tr className="header-row">
                                    <th>Empresa</th>
                                    <th>Plan</th>
                                    <th>Estado</th>
                                    <th>MRR</th>
                                    <th>Prox. Cobro</th>
                                    <th>Uso (Locales)</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredEmpresas.map(emp => (
                                    <tr key={emp.id} className="data-row">
                                        <td>
                                            <div className="superadmin-empresa-info">
                                                <div className="superadmin-empresa-name">{emp.nombre}</div>
                                                <div className="superadmin-empresa-id">ID: {emp.id.slice(0,8)}</div>
                                            </div>
                                        </td>
                                        <td><span className="superadmin-plan-badge">{emp.billing_plan || 'free'}</span></td>
                                        <td><StatusBadge status={emp.billing_status || 'active'} /></td>
                                        <td><span className="superadmin-price">${emp.billing_price || 0}</span></td>
                                        <td>{emp.billing_due_date ? new Date(emp.billing_due_date).toLocaleDateString() : 'N/A'}</td>
                                        <td>
                                            <div className="superadmin-usage-bar-wrapper">
                                                <div className="superadmin-usage-bar">
                                                    <div className="superadmin-usage-fill" style={{ width: `${Math.min((emp.usage?.clients || 0) / 500 * 100, 100)}%` }} />
                                                </div>
                                                <span className="superadmin-usage-text">{emp.usage?.clients || 0}</span>
                                            </div>
                                        </td>
                                        <td className="superadmin-actions-cell">
                                            <button onClick={() => setEditingEmpresa({ ...emp })}>
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
                <div className="superadmin-tickets-loading">
                    <Ticket size={48} />
                    <p>Módulo de gestión avanzada de tickets en desarrollo...</p>
                </div>
            )}

            {/* Edit Billing Modal */}
            {editingEmpresa && (
                <div className="superadmin-modal-overlay">
                    <div className="superadmin-modal-content">
                        {/* Modal Header */}
                        <div className="superadmin-modal-header">
                            <div>
                                <h2 className="superadmin-modal-header-title">Gestionar Plan</h2>
                                <p className="superadmin-modal-header-subtitle">{editingEmpresa.nombre}</p>
                            </div>
                            <button onClick={() => setEditingEmpresa(null)} className="superadmin-modal-close-btn">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="superadmin-modal-body">
                            <div className="superadmin-form-group superadmin-form-group-full">
                                <label>Plan de Suscripción</label>
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

                            <div className="superadmin-form-group">
                                <label>Precio Mensual</label>
                                <div className="superadmin-input-wrapper">
                                    <DollarSign size={16} />
                                    <input 
                                        type="number" 
                                        className="input" 
                                        value={editingEmpresa.billing_price || 0}
                                        onChange={e => setEditingEmpresa({ ...editingEmpresa, billing_price: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="superadmin-form-group">
                                <label>Moneda</label>
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

                            <div className="superadmin-form-group">
                                <label>Estado de Pago</label>
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

                            <div className="superadmin-form-group">
                                <label>Próximo Vencimiento</label>
                                <input 
                                    type="date" 
                                    className="input" 
                                    value={editingEmpresa.billing_due_date || ''}
                                    onChange={e => setEditingEmpresa({ ...editingEmpresa, billing_due_date: e.target.value })}
                                />
                            </div>

                            <div className="superadmin-form-group superadmin-form-group-full">
                                <label>Notas Internas</label>
                                <textarea 
                                    className="input" 
                                    rows={3} 
                                    style={{ resize: 'none' }}
                                    placeholder="Notas sobre el acuerdo, bonificaciones, etc."
                                    value={editingEmpresa.billing_notes || ''}
                                    onChange={e => setEditingEmpresa({ ...editingEmpresa, billing_notes: e.target.value })}
                                />
                            </div>
                             
                            <div style={{ marginTop: '25px', padding: '20px', background: 'rgba(139, 92, 246, 0.05)', borderRadius: '16px', border: '1px solid rgba(139, 92, 246, 0.1)', gridColumn: 'span 2' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px', color: 'var(--color-primary)' }}>
                                    <Sparkles size={18} />
                                    <h4 style={{ margin: 0, fontWeight: 700 }}>Personalización & AI</h4>
                                </div>
                                
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                    <div>
                                        <label className="billing-label" style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Color Primario (Hex)</label>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <input 
                                                type="color" 
                                                style={{ width: '40px', height: '40px', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}
                                                value={editingEmpresa.config?.theme?.colors?.primary || defaultTenantConfig.theme.colors.primary}
                                                onChange={e => {
                                                    const cfg = JSON.parse(JSON.stringify(editingEmpresa.config || defaultTenantConfig));
                                                    if (!cfg.theme.colors) cfg.theme.colors = { ...defaultTenantConfig.theme.colors };
                                                    cfg.theme.colors.primary = e.target.value;
                                                    setEditingEmpresa({ ...editingEmpresa, config: cfg });
                                                }}
                                            />
                                            <input 
                                                type="text" 
                                                className="input" 
                                                style={{ flex: 1 }}
                                                value={editingEmpresa.config?.theme?.colors?.primary || defaultTenantConfig.theme.colors.primary}
                                                onChange={e => {
                                                    const cfg = JSON.parse(JSON.stringify(editingEmpresa.config || defaultTenantConfig));
                                                    if (!cfg.theme.colors) cfg.theme.colors = { ...defaultTenantConfig.theme.colors };
                                                    cfg.theme.colors.primary = e.target.value;
                                                    setEditingEmpresa({ ...editingEmpresa, config: cfg });
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="billing-label" style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Nombre de la IA</label>
                                        <input 
                                            type="text" 
                                            className="input" 
                                            placeholder="Ej: CoqueBot"
                                            value={editingEmpresa.config?.ai?.name || defaultTenantConfig.ai.name}
                                            onChange={e => {
                                                const cfg = JSON.parse(JSON.stringify(editingEmpresa.config || defaultTenantConfig));
                                                cfg.ai.name = e.target.value;
                                                setEditingEmpresa({ ...editingEmpresa, config: cfg });
                                            }}
                                        />
                                    </div>
                                    <div style={{ gridColumn: 'span 2' }}>
                                        <label className="billing-label" style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>URL del Logo</label>
                                        <input 
                                            type="text" 
                                            className="input" 
                                            placeholder="https://..."
                                            value={editingEmpresa.config?.app?.logoUrl || defaultTenantConfig.app.logoUrl}
                                            onChange={e => {
                                                const cfg = JSON.parse(JSON.stringify(editingEmpresa.config || defaultTenantConfig));
                                                cfg.app.logoUrl = e.target.value;
                                                setEditingEmpresa({ ...editingEmpresa, config: cfg });
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="superadmin-modal-footer">
                                <Button variant="secondary" onClick={() => setEditingEmpresa(null)}>Cerrar</Button>
                                <Button onClick={handleUpdateBilling} disabled={saving}>
                                    <Save size={18} style={{ marginRight: '8px' }} />
                                    {saving ? 'Guardando...' : 'Guardar Cambios'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Helper Components
function StatCard({ icon, label, value, trend, bg }: { icon: React.ReactNode; label: string; value: React.ReactNode; trend?: string; bg?: string }) {
    return (
        <div className="superadmin-stat-card">
            <div className="superadmin-stat-card-header">
                <div className="superadmin-stat-card-icon" style={{ background: bg }}>{icon}</div>
                {trend && <span className="superadmin-stat-card-trend" style={{ color: trend.includes('+') ? '#10b981' : 'var(--accent)' }}>{trend}</span>}
            </div>
            <div>
                <div className="superadmin-stat-card-label">{label}</div>
                <div className="superadmin-stat-card-value">{value}</div>
            </div>
        </div>
    );
}

function Tab({ text, active, onClick }: { text: string; active: boolean; onClick: () => void }) {
    return (
        <button 
            onClick={onClick}
            className={`superadmin-tab-btn ${active ? 'active' : ''}`}
        >
            {text}
        </button>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="superadmin-section">
            <h3 className="superadmin-section-title">{title}</h3>
            {children}
        </div>
    );
}

function CompanyRow({ company, onEdit }: { company: Company; onEdit: () => void }) {
    return (
        <div className="superadmin-company-row" onClick={onEdit}>
            <div className="superadmin-company-row-icon">
                <Building2 size={20} color="white" />
            </div>
            <div className="superadmin-company-row-info">
                <div className="superadmin-company-row-name">{company.nombre}</div>
                <div className="superadmin-company-row-detail">{company.usage?.clients || 0} locales • {company.billing_plan || 'free'}</div>
            </div>
            <ChevronRight size={18} style={{ opacity: 0.3 }} />
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const colors: Record<string, { bg: string; text: string }> = {
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
        <span 
            className="superadmin-status-badge"
            style={{ 
                background: c.bg, 
                color: c.text
            }}
        >
            {status}
        </span>
    );
}

