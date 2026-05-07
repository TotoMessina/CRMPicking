import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Building2, Shield, ChevronDown, Check, X, Unlock, Lock, Save, AppWindow, Layers, Users, Plus, Edit2, Hexagon } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

import { ALL_PAGES, GROUPS } from '../constants/pages';

export default function PermisosEmpresa() {
    const { role, empresaActiva, paginasPermitidas, user: currentUser, isDemoMode } = useAuth();
    const [empresas, setEmpresas] = useState([]);
    const [selectedEmpresa, setSelectedEmpresa] = useState(null);
    const [permisos, setPermisos] = useState({});
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);
    const [activeTab, setActiveTab] = useState('modulos'); // 'modulos' | 'usuarios' | 'categorias' | 'campos'
    const [localSidebarGroups, setLocalSidebarGroups] = useState([]);
    const [localPageGroups, setLocalPageGroups] = useState({});
    const [localCustomFields, setLocalCustomFields] = useState([]);
    const [localFormLayout, setLocalFormLayout] = useState(null);
    const [editingFieldKey, setEditingFieldKey] = useState(null);
    const [localBrandColor, setLocalBrandColor] = useState('#7c3aded');
    const [localLogoUrl, setLocalLogoUrl] = useState('');
    const [localSystemName, setLocalSystemName] = useState('PickingUp CRM');

    // Nuevos Estados Dinámicos
    const [rolesDinamicos, setRolesDinamicos] = useState([]);
    const [usuariosEmpresa, setUsuariosEmpresa] = useState([]);
    
    // Estados Modales
    const [selectedUser, setSelectedUser] = useState(null);
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [editUserForm, setEditUserForm] = useState({ role: '', activo: true });

    const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
    const [newRoleForm, setNewRoleForm] = useState({ nombre: '', color_hex: '#0c0c0c' });

    // Cargar empresas
    useEffect(() => {
        const fetchEmpresas = async () => {
            const { data } = await supabase.from('empresas').select('id, nombre, config').order('nombre');
            setEmpresas(data || []);
            if (data?.length > 0) setSelectedEmpresa(data[0]);
        };
        fetchEmpresas();
    }, []);

    // Cargar datos core vinculados a la empresa
    const fetchCoreData = useCallback(async () => {
        if (!selectedEmpresa) return;
        setLoading(true);

        try {
            // 1. Cargar Permisos de Paginación
            const { data: permData } = await supabase
                .from('empresa_permisos_pagina')
                .select('*')
                .eq('empresa_id', selectedEmpresa.id);

            const map = {};
            (permData || []).forEach(row => {
                map[row.pagina] = {
                    habilitada: row.habilitada,
                    roles: new Set(row.roles_permitidos || []),
                };
            });

            ALL_PAGES.forEach(p => {
                if (!map[p.to]) map[p.to] = { habilitada: false, roles: new Set() };
            });
            setPermisos(map);
            setDirty(false);

            // 2. Cargar Roles Dinámicos
            const { data: rolesData, error: rolesError } = await supabase
                .from('crm_roles')
                .select('*')
                .or(`empresa_id.eq.${selectedEmpresa.id},empresa_id.is.null`)
                .order('created_at', { ascending: true });
            
            if (!rolesError) {
                setRolesDinamicos(rolesData || []);
            } else {
                console.error("Error cargando crm_roles (Ignorar si la tabla no existe aún)", rolesError);
                // Fallback temporal si no crearon la tabla aún
                setRolesDinamicos([
                    { nombre: 'admin', color_hex: '#ef4444' },
                    { nombre: 'supervisor', color_hex: '#f59e0b' },
                    { nombre: 'activador', color_hex: '#3b82f6' },
                    { nombre: 'empleado', color_hex: '#10b981' }
                ]);
            }

            // 3. Cargar Usuarios
            const { data: usersData } = await supabase
                .from('usuarios')
                .select('*')
                .order('nombre', { ascending: true }); // Simplificado. Si hay RLS de empresa_usuario mejor.
            
            setUsuariosEmpresa(usersData || []);

            // 4. Cargar Configuración de Categorías de la Empresa
            const configGroups = selectedEmpresa?.config?.sidebarGroups || GROUPS;
            const configPageGroups = selectedEmpresa?.config?.pageGroups || {};
            setLocalSidebarGroups(configGroups);
            setLocalPageGroups(configPageGroups);

            // 5. Cargar Configuración de Campos Personalizados
            const configCustomFields = selectedEmpresa?.config?.customFields || [];
            setLocalCustomFields(configCustomFields);

            // 6. Cargar Configuración de Layout del Formulario
            let configFormLayout = selectedEmpresa?.config?.formLayout || null;
            if (configFormLayout && Array.isArray(configFormLayout)) {
                configFormLayout = { steps: configFormLayout };
            }
            if (!configFormLayout || !configFormLayout.steps || configFormLayout.steps.length === 0) {
                configFormLayout = {
                    steps: [
                        {
                            id: 1,
                            title: '1. Datos del Local y Contacto',
                            fields: [
                                { key: 'nombre_local', label: 'Nombre del Local', type: 'text', isStandard: true, required: true },
                                { key: 'direccion', label: 'Dirección', type: 'text', isStandard: true, required: true },
                                { key: 'nombre', label: 'Nombre del Contacto', type: 'text', isStandard: true, required: true },
                                { key: 'telefono', label: 'Teléfono', type: 'text', isStandard: true, required: true },
                                { key: 'mail', label: 'Mail', type: 'email', isStandard: true },
                                { key: 'cuit', label: 'CUIT', type: 'text', isStandard: true },
                                { key: 'horarios_atencion', label: 'Horarios de Atención', type: 'text', isStandard: true },
                                { key: 'estilo_contacto', label: 'Estilo de Contacto', type: 'select', isStandard: true },
                                { key: 'tipo_contacto', label: 'Tipo de Contacto', type: 'select', isStandard: true },
                                { key: 'responsable', label: 'Responsable', type: 'select', isStandard: true }
                            ]
                        },
                        {
                            id: 2,
                            title: '2. Clasificación del Cliente',
                            fields: [
                                { key: 'rubro', label: 'Rubro', type: 'select', isStandard: true, required: true },
                                { key: 'estado', label: 'Estado', type: 'select', isStandard: true },
                                { key: 'interes', label: 'Nivel de Interés', type: 'interes_bar', isStandard: true },
                                { key: 'venta_digital', label: '¿Venta Digital?', type: 'venta_digital', isStandard: true },
                                { key: 'grupos', label: 'Grupos / Etiquetas', type: 'grupos', isStandard: true },
                                { key: 'situacion', label: 'Situación', type: 'situacion', isStandard: true }
                            ]
                        },
                        {
                            id: 3,
                            title: '3. Agenda y Notas',
                            fields: [
                                { key: 'fecha_proximo_contacto', label: 'Próxima Visita', type: 'agenda', isStandard: true },
                                { key: 'notas', label: 'Notas', type: 'textarea', isStandard: true }
                            ]
                        }
                    ]
                };
                // Automatically append any custom fields
                const configCustomFields = selectedEmpresa?.config?.customFields || [];
                configCustomFields.forEach(cf => {
                    if (!configFormLayout.steps[0].fields.some(f => f.key === cf.key)) {
                        configFormLayout.steps[0].fields.push({ key: cf.key, label: cf.label, type: cf.type, options: cf.options, placeholder: cf.placeholder, isStandard: false });
                    }
                });
            } else {
                configFormLayout.steps.forEach((s, idx) => {
                    if (!s.id) s.id = idx + 1;
                });
            }
            setLocalFormLayout(configFormLayout);
            
            setLocalBrandColor(selectedEmpresa?.config?.brandColor || '#7c3aded');
            setLocalLogoUrl(selectedEmpresa?.config?.logoUrl || '');
            setLocalSystemName(selectedEmpresa?.config?.systemName || 'PickingUp CRM');

        } catch (error) {
            toast.error("Error al sincronizar datos");
        } finally {
            setLoading(false);
        }
    }, [selectedEmpresa]);

    useEffect(() => {
        fetchCoreData();
    }, [fetchCoreData]);

    const handleSavePermisos = async () => {
        if (!selectedEmpresa || isDemoMode) return;
        setSaving(true);

        const rows = ALL_PAGES.map(p => ({
            empresa_id: selectedEmpresa.id,
            pagina: p.to,
            habilitada: permisos[p.to]?.habilitada ?? false,
            roles_permitidos: Array.from(permisos[p.to]?.roles || []),
            updated_at: new Date().toISOString(),
        }));

        const { error: permError } = await supabase
            .from('empresa_permisos_pagina')
            .upsert(rows, { onConflict: 'empresa_id,pagina' });

        if (permError) {
            toast.error('Error al guardar permisos');
            setSaving(false);
            return;
        }

        const updatedConfig = {
            ...(selectedEmpresa.config || {}),
            sidebarGroups: localSidebarGroups,
            pageGroups: localPageGroups,
            customFields: localCustomFields,
            formLayout: localFormLayout,
            brandColor: localBrandColor,
            logoUrl: localLogoUrl,
            systemName: localSystemName
        };

        const { error: configError } = await supabase.rpc('update_empresa_config', {
            p_empresa_id: selectedEmpresa.id,
            p_config: updatedConfig
        });

        if (configError) {
            toast.error('Error al guardar configuración de categorías');
        } else {
            toast.success('Permisos y configuración de marca guardados');
            document.documentElement.style.setProperty('--accent', localBrandColor);
            setEmpresas(prev => prev.map(emp => emp.id === selectedEmpresa.id ? { ...emp, config: updatedConfig } : emp));
            setSelectedEmpresa(prev => ({ ...prev, config: updatedConfig }));
            setDirty(false);
            window.dispatchEvent(new CustomEvent('permissions-updated'));
        }
        setSaving(false);
    };

    const handleSaveUser = async (e) => {
        e.preventDefault();
        if (!selectedUser || isDemoMode) return;
        setSaving(true);
        try {
            const { error } = await supabase
                .from('usuarios')
                .update({
                    role: editUserForm.role,
                    activo: editUserForm.activo,
                })
                .eq('id', selectedUser.id);
            if (error) throw error;
            toast.success('Rol de usuario actualizado');
            setIsUserModalOpen(false);
            fetchCoreData();
        } catch (error) {
            toast.error('Error actualizando usuario');
        } finally {
            setSaving(false);
        }
    };

    const handleCreateRole = async (e) => {
        e.preventDefault();
        if (isDemoMode) return;
        setSaving(true);
        try {
            const { error } = await supabase.from('crm_roles').insert([{
                empresa_id: selectedEmpresa.id,
                nombre: newRoleForm.nombre.trim().toLowerCase(),
                color_hex: newRoleForm.color_hex
            }]);
            if (error) throw error;
            toast.success('Rol creado exitosamente');
            setIsRoleModalOpen(false);
            setNewRoleForm({ nombre: '', color_hex: '#0c0c0c' });
            fetchCoreData();
        } catch (error) {
            toast.error('Ocurrió un error al crear el rol');
        } finally {
            setSaving(false);
        }
    };

    const isSuperAdmin = role === 'super-admin';
    const effectiveRole = isSuperAdmin ? 'super-admin' : (empresaActiva?.role_en_empresa?.toLowerCase() || role);
    const hasPermission = isSuperAdmin || (paginasPermitidas && paginasPermitidas['/permisos-empresa']?.includes(effectiveRole));

    const groupedPages = useMemo(() => {
        const groups = {};
        const categories = localSidebarGroups.length > 0 ? localSidebarGroups : GROUPS;
        categories.forEach(g => { groups[g] = []; });
        ALL_PAGES.forEach(p => {
            const currentGroup = localPageGroups[p.to] || p.group;
            if (groups[currentGroup]) groups[currentGroup].push(p);
            else {
                if(!groups['Otros']) groups['Otros'] = [];
                groups['Otros'].push(p);
            }
        });
        return groups;
    }, [localSidebarGroups, localPageGroups]);

    if (!hasPermission) return null; // Fallback or restricted view

    return (
        <div className="container" style={{ padding: '20px', paddingBottom: '90px' }}>
            <style>{`
                /* Responsive Grids */
                .permisos-cards-grid {
                    display: grid !important;
                    grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)) !important;
                    gap: 16px !important;
                }
                
                /* Custom Fields row responsiveness */
                .custom-field-row {
                    display: grid !important;
                    grid-template-columns: 1fr !important;
                    gap: 16px !important;
                    align-items: end !important;
                    padding: 16px !important;
                    border-radius: 12px !important;
                    border: 1px solid var(--border) !important;
                }
                
                @media (min-width: 768px) {
                    .custom-field-row {
                        grid-template-columns: 1fr 160px 1fr auto !important;
                    }
                }

                /* Responsive header */
                @media (max-width: 600px) {
                    .permisos-header {
                        flex-direction: column !important;
                        align-items: stretch !important;
                    }
                    .actions-section {
                        align-items: stretch !important;
                    }
                    .select-empresa-wrapper {
                        max-width: 100% !important;
                    }
                }

                /* Tables responsiveness */
                .table-container {
                    width: 100% !important;
                    overflow-x: auto !important;
                    -webkit-overflow-scrolling: touch !important;
                }

                /* Tab bar responsive scroll indicator */
                .tabs-bar::-webkit-scrollbar {
                    height: 4px;
                }
                .tabs-bar::-webkit-scrollbar-thumb {
                    background: var(--border);
                    border-radius: 4px;
                }
            `}</style>
            {/* Cabecera Principal */}
            <div className="permisos-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px', marginBottom: '24px' }}>
                <div className="title-section" style={{ flex: '1 1 300px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                        <div style={{ background: 'rgba(0, 0, 0, 0.15)', padding: 10, borderRadius: 12 }}>
                            <Shield size={26} color="var(--accent)" />
                        </div>
                        <h1 style={{ margin: 0, fontSize: '1.6rem', lineHeight: 1 }}>Centro de Accesos</h1>
                    </div>
                    <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>Administrá roles dinámicos, usuarios y privilegios de pantallas.</p>
                </div>

                <div className="actions-section" style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: '1 1 250px', alignItems: 'flex-end' }}>
                    <div className="select-empresa-wrapper" style={{ position: 'relative', width: '100%', maxWidth: '300px' }}>
                        <select
                            className="input premium-input"
                            style={{ width: '100%', paddingLeft: 40, cursor: 'pointer', appearance: 'none', height: '40px', fontSize: '0.9rem' }}
                            value={selectedEmpresa?.id || ''}
                            onChange={e => setSelectedEmpresa(empresas.find(c => c.id === e.target.value))}
                        >
                            {empresas.map(e => (
                                <option key={e.id} value={e.id}>{e.nombre}</option>
                            ))}
                        </select>
                        <Building2 size={16} className="text-accent" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                        <ChevronDown size={14} className="muted" style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    </div>
                </div>
            </div>

            {/* Pestañas de Navegación */}
            <div className="tabs-bar" style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)', marginBottom: '24px', overflowX: 'auto' }}>
                <button 
                    onClick={() => setActiveTab('modulos')}
                    style={{ background: 'transparent', border: 'none', borderBottom: activeTab === 'modulos' ? '2px solid var(--accent)' : '2px solid transparent', padding: '12px 20px', color: activeTab === 'modulos' ? 'var(--text)' : 'var(--text-muted)', fontWeight: activeTab === 'modulos' ? 700 : 500, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }}
                >
                    <Layers size={16} /> Permisos de Módulos
                </button>
                <button 
                    onClick={() => setActiveTab('usuarios')}
                    style={{ background: 'transparent', border: 'none', borderBottom: activeTab === 'usuarios' ? '2px solid var(--accent)' : '2px solid transparent', padding: '12px 20px', color: activeTab === 'usuarios' ? 'var(--text)' : 'var(--text-muted)', fontWeight: activeTab === 'usuarios' ? 700 : 500, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }}
                >
                    <Users size={16} /> Roles y Usuarios
                </button>
                <button 
                    onClick={() => setActiveTab('categorias')}
                    style={{ background: 'transparent', border: 'none', borderBottom: activeTab === 'categorias' ? '2px solid var(--accent)' : '2px solid transparent', padding: '12px 20px', color: activeTab === 'categorias' ? 'var(--text)' : 'var(--text-muted)', fontWeight: activeTab === 'categorias' ? 700 : 500, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }}
                >
                    <Layers size={16} /> Categorías Sidebar
                </button>
                <button 
                    onClick={() => setActiveTab('campos')}
                    style={{ background: 'transparent', border: 'none', borderBottom: activeTab === 'campos' ? '2px solid var(--accent)' : '2px solid transparent', padding: '12px 20px', color: activeTab === 'campos' ? 'var(--text)' : 'var(--text-muted)', fontWeight: activeTab === 'campos' ? 700 : 500, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }}
                >
                    <Plus size={16} /> Campos de Clientes
                </button>
                <button 
                    onClick={() => setActiveTab('personalizacion')}
                    style={{ background: 'transparent', border: 'none', borderBottom: activeTab === 'personalizacion' ? '2px solid var(--accent)' : '2px solid transparent', padding: '12px 20px', color: activeTab === 'personalizacion' ? 'var(--text)' : 'var(--text-muted)', fontWeight: activeTab === 'personalizacion' ? 700 : 500, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }}
                >
                    🎨 Marca Blanca / Estilos
                </button>
            </div>

            {loading ? (
                 <div style={{ textAlign: 'center', padding: '60px', background: 'var(--bg-elevated)', borderRadius: 20 }}><div className="spinner" style={{ margin: '0 auto 16px' }}></div></div>
            ) : (
                <>
                    {/* TAB: MÓDULOS */}
                    {activeTab === 'modulos' && (
                        <div className="permisos-grupos-grid" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: '-10px' }}>
                                <button className="btn-secundario" onClick={() => { ALL_PAGES.forEach(p => setPermisos(pr => ({...pr, [p.to]: {habilitada: true, roles: new Set(rolesDinamicos.map(r=>r.nombre))} }))); setDirty(true); }} style={{ fontSize: '0.8rem', padding: '6px 12px' }}><Unlock size={14} style={{marginRight: 4}}/> Todo</button>
                                <button className="btn-secundario danger-hover" onClick={() => { ALL_PAGES.forEach(p => setPermisos(pr => ({...pr, [p.to]: {habilitada: false, roles: new Set()} }))); setDirty(true); }} style={{ fontSize: '0.8rem', padding: '6px 12px' }}><Lock size={14} style={{marginRight: 4}}/> Nada</button>
                            </div>

                            {Object.keys(groupedPages).map(groupName => {
                                const paginas = groupedPages[groupName];
                                if (!paginas || paginas.length === 0) return null;

                                return (
                                    <section key={groupName} className="permisos-group-section">
                                        <h2 style={{ fontSize: '1.1rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)' }}>
                                            <Layers size={16} /> {groupName}
                                        </h2>
                                        
                                        <div className="permisos-cards-grid">
                                            {paginas.map(page => {
                                                const perm = permisos[page.to] || { habilitada: false, roles: new Set() };
                                                const isEnabled = perm.habilitada;
                                                const Icon = page.icon || AppWindow;

                                                return (
                                                    <div key={page.to} className={`permiso-card glass-card ${isEnabled ? 'enabled' : 'disabled'}`} style={{ padding: 0, overflow: 'hidden' }}>
                                                        <div className="permiso-card-header" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                                <div className="permiso-icon-wrap" style={{ background: isEnabled ? 'rgba(124, 58, 237, 0.1)' : 'var(--bg)', color: isEnabled ? 'var(--accent)' : 'var(--text-muted)', padding: 8, borderRadius: 8, transition: 'all 0.3s' }}>
                                                                    <Icon size={16} />
                                                                </div>
                                                                <div>
                                                                    <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>{page.label}</h3>
                                                                </div>
                                                            </div>
                                                            <div onClick={() => { setPermisos(pr => ({...pr, [page.to]: {...pr[page.to], habilitada: !isEnabled}})); setDirty(true); }} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: isEnabled ? 'var(--accent)' : 'var(--text-muted)', userSelect:'none' }}>{isEnabled ? 'ON' : 'OFF'}</span>
                                                                <div className={`modern-switch ${isEnabled ? 'active' : ''}`}><div className="modern-switch-knob"></div></div>
                                                            </div>
                                                        </div>

                                                        <div className="permiso-card-body" style={{ padding: '12px 16px', background: isEnabled ? 'transparent' : 'var(--bg-elevated)', transition: 'background 0.3s', position: 'relative' }}>
                                                            <div className="roles-chips-container" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                                {rolesDinamicos.map(rolData => {
                                                                    const rol = rolData.nombre;
                                                                    const hasRole = perm.roles.has(rol);
                                                                    return (
                                                                        <button
                                                                            key={rol}
                                                                            disabled={!isEnabled}
                                                                            onClick={() => {
                                                                                setPermisos(prev => {
                                                                                    const roles = new Set(prev[page.to]?.roles || []);
                                                                                    if (roles.has(rol)) roles.delete(rol); else roles.add(rol);
                                                                                    return { ...prev, [page.to]: { ...prev[page.to], roles } };
                                                                                });
                                                                                setDirty(true);
                                                                            }}
                                                                            className={`role-chip ${hasRole ? 'selected' : ''}`}
                                                                            style={{ '--chip-color': rolData.color_hex || 'var(--accent)', fontSize: '0.75rem', padding: '4px 10px' }}
                                                                        >
                                                                            {hasRole ? <Check size={12} /> : null} {rol}
                                                                        </button>
                                                                    )
                                                                })}
                                                                {rolesDinamicos.length === 0 && <span className="muted" style={{fontSize:'0.8rem'}}>No hay roles creados.</span>}
                                                            </div>
                                                            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed var(--border)' }}>
                                                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Categoría del Sidebar</label>
                                                                <select 
                                                                    className="input premium-input"
                                                                    style={{ width: '100%', fontSize: '0.8rem', height: '32px', padding: '0 8px', cursor: isEnabled ? 'pointer' : 'not-allowed' }}
                                                                    value={localPageGroups[page.to] || page.group}
                                                                    disabled={!isEnabled}
                                                                    onChange={e => {
                                                                        setLocalPageGroups(prev => ({ ...prev, [page.to]: e.target.value }));
                                                                        setDirty(true);
                                                                    }}
                                                                >
                                                                    {localSidebarGroups.map(grp => (
                                                                        <option key={grp} value={grp}>{grp}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                            {!isEnabled && <div style={{ position: 'absolute', inset: 0, zIndex: 5, cursor: 'not-allowed' }} title="Habilita el módulo primero"></div>}
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </section>
                                )
                            })}
                        </div>
                    )}

                    {/* TAB: USUARIOS Y ROLES */}
                    {activeTab === 'usuarios' && (
                        <div className="usuarios-roles-grid" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-elevated)', padding: '16px', borderRadius: '12px', border: '1px dashed var(--border)' }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}><Hexagon size={16} /> Roles Personaliados</h3>
                                    <p className="muted" style={{ margin: '4px 0 0 0', fontSize: '0.85rem' }}>Define los cargos que existen dentro de esta empresa.</p>
                                </div>
                                <button className="btn-primario" onClick={() => setIsRoleModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
                                    <Plus size={16} /> Crear Rol
                                </button>
                            </div>
                            
                            <div className="table-container" style={{ borderRadius: '12px', border: '1px solid var(--border)', overflowX: 'auto', background: 'var(--bg-card)' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                    <thead>
                                        <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                                            <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)' }}>Usuario</th>
                                            <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)' }}>Email</th>
                                            <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)' }}>Rol Asignado</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'right' }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {usuariosEmpresa.length === 0 ? (
                                            <tr><td colSpan="4" style={{ padding: '24px', textAlign: 'center' }} className="muted">No se encontraron usuarios.</td></tr>
                                        ) : (
                                            usuariosEmpresa.map(u => {
                                                const assignedData = rolesDinamicos.find(r => r.nombre === u.role);
                                                const roleColor = assignedData?.color_hex || 'var(--text-muted)';
                                                return (
                                                <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                                    <td style={{ padding: '12px 16px', fontWeight: 500 }}>{u.avatar_emoji || '📍'} {u.nombre || '-'}</td>
                                                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{u.email}</td>
                                                    <td style={{ padding: '12px 16px' }}>
                                                        <span style={{ background: `${roleColor}15`, color: roleColor, padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, border: `1px solid ${roleColor}30` }}>
                                                            {u.role || 'Sin rol'}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                                        <button className="btn-secundario" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => {
                                                            setSelectedUser(u);
                                                            setEditUserForm({ role: u.role || '', activo: u.activo !== false });
                                                            setIsUserModalOpen(true);
                                                        }}>
                                                            <Edit2 size={14} style={{ marginRight: 6 }} /> Modificar
                                                        </button>
                                                    </td>
                                                </tr>
                                                )
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                    
                    {/* TAB: CATEGORÍAS */}
                    {activeTab === 'categorias' && (
                        <div className="categorias-management-grid" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <div style={{ background: 'var(--bg-elevated)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
                                <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}><Layers size={18} /> Gestionar Categorías del Sidebar</h3>
                                <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>Agregá, renombrá, reordená o eliminá las secciones que agrupan los accesos en el menú lateral.</p>
                                
                                <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '600px' }}>
                                    {localSidebarGroups.map((groupName, index) => (
                                        <div key={groupName} className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                                                <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{groupName}</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                {/* Reordenar */}
                                                <button 
                                                    className="btn-secundario" 
                                                    style={{ padding: '6px', minWidth: 'auto' }} 
                                                    disabled={index === 0}
                                                    type="button"
                                                    onClick={() => {
                                                        const updated = [...localSidebarGroups];
                                                        const temp = updated[index];
                                                        updated[index] = updated[index - 1];
                                                        updated[index - 1] = temp;
                                                        setLocalSidebarGroups(updated);
                                                        setDirty(true);
                                                    }}
                                                    title="Mover arriba"
                                                >
                                                    <ChevronDown size={14} style={{ transform: 'rotate(180deg)' }} />
                                                </button>
                                                <button 
                                                    className="btn-secundario" 
                                                    style={{ padding: '6px', minWidth: 'auto' }} 
                                                    disabled={index === localSidebarGroups.length - 1}
                                                    type="button"
                                                    onClick={() => {
                                                        const updated = [...localSidebarGroups];
                                                        const temp = updated[index];
                                                        updated[index] = updated[index + 1];
                                                        updated[index + 1] = temp;
                                                        setLocalSidebarGroups(updated);
                                                        setDirty(true);
                                                    }}
                                                    title="Mover abajo"
                                                >
                                                    <ChevronDown size={14} />
                                                </button>

                                                {/* Renombrar */}
                                                <button 
                                                    className="btn-secundario" 
                                                    style={{ padding: '6px', minWidth: 'auto' }}
                                                    type="button"
                                                    onClick={() => {
                                                        const newName = prompt('Ingresá el nuevo nombre para la categoría:', groupName);
                                                        if (newName && newName.trim() && newName.trim() !== groupName) {
                                                            const trimName = newName.trim();
                                                            setLocalSidebarGroups(prev => prev.map(g => g === groupName ? trimName : g));
                                                            setLocalPageGroups(prev => {
                                                                const updated = { ...prev };
                                                                Object.keys(updated).forEach(k => {
                                                                    if (updated[k] === groupName) {
                                                                        updated[k] = trimName;
                                                                    }
                                                                });
                                                                return updated;
                                                            });
                                                            setDirty(true);
                                                        }
                                                    }}
                                                    title="Renombrar"
                                                >
                                                    <Edit2 size={14} />
                                                </button>

                                                {/* Eliminar */}
                                                <button 
                                                    className="btn-secundario danger-hover" 
                                                    style={{ padding: '6px', minWidth: 'auto' }}
                                                    disabled={localSidebarGroups.length <= 1}
                                                    type="button"
                                                    onClick={() => {
                                                        if (confirm(`¿Estás seguro de eliminar la categoría "${groupName}"? Las páginas en esta categoría volverán a su grupo predeterminado.`)) {
                                                            setLocalSidebarGroups(prev => prev.filter(g => g !== groupName));
                                                            setLocalPageGroups(prev => {
                                                                const updated = { ...prev };
                                                                Object.keys(updated).forEach(k => {
                                                                    if (updated[k] === groupName) {
                                                                        delete updated[k];
                                                                    }
                                                                });
                                                                return updated;
                                                            });
                                                            setDirty(true);
                                                        }
                                                    }}
                                                    title="Eliminar"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div style={{ marginTop: '24px', display: 'flex', gap: '12px', maxWidth: '500px' }}>
                                    <input 
                                        type="text" 
                                        id="new-category-input"
                                        className="input premium-input" 
                                        placeholder="Nueva categoría..." 
                                        style={{ flex: 1, height: '40px' }} 
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') {
                                                const val = e.currentTarget.value.trim();
                                                if (val && !localSidebarGroups.includes(val)) {
                                                    setLocalSidebarGroups(prev => [...prev, val]);
                                                    e.currentTarget.value = '';
                                                    setDirty(true);
                                                }
                                            }
                                        }}
                                    />
                                    <button 
                                        className="btn-primario" 
                                        style={{ height: '40px', padding: '0 16px' }}
                                        type="button"
                                        onClick={() => {
                                            const input = document.getElementById('new-category-input');
                                            const val = input?.value.trim();
                                            if (val && !localSidebarGroups.includes(val)) {
                                                setLocalSidebarGroups(prev => [...prev, val]);
                                                input.value = '';
                                                setDirty(true);
                                            }
                                        }}
                                    >
                                        <Plus size={16} style={{ marginRight: 6 }} /> Agregar
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB: CAMPOS PERSONALIZADOS */}
                    {activeTab === 'campos' && (
                        <div className="custom-fields-management" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <div style={{ background: 'var(--bg-elevated)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
                                <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}><Edit2 size={18} /> Campos Personalizados de Clientes</h3>
                                <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>Definí nuevos campos a nivel de empresa para los formularios y fichas de clientes.</p>
                                
                                <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {localCustomFields.length === 0 ? (
                                        <div style={{ padding: '24px', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: '12px' }} className="muted">
                                            No hay campos personalizados creados. Agregá uno abajo.
                                        </div>
                                    ) : (
                                        localCustomFields.map((cf, index) => (
                                            <div key={cf.key} className="glass-card custom-field-row">
                                                {/* Etiqueta */}
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Etiqueta del Campo</label>
                                                    <input 
                                                        type="text" 
                                                        className="input premium-input" 
                                                        style={{ height: '38px', fontSize: '0.9rem' }}
                                                        value={cf.label} 
                                                        onChange={e => {
                                                            const val = e.target.value;
                                                            setLocalCustomFields(prev => prev.map((f, i) => i === index ? { ...f, label: val } : f));
                                                            setDirty(true);
                                                        }}
                                                    />
                                                </div>

                                                {/* Tipo de Entrada */}
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Tipo</label>
                                                    <select 
                                                        className="input premium-input" 
                                                        style={{ height: '38px', fontSize: '0.9rem', cursor: 'pointer' }}
                                                        value={cf.type} 
                                                        onChange={e => {
                                                            const val = e.target.value;
                                                            setLocalCustomFields(prev => prev.map((f, i) => i === index ? { ...f, type: val, options: val === 'select' ? (f.options || []) : undefined } : f));
                                                            setDirty(true);
                                                        }}
                                                    >
                                                        <option value="text">Texto Corto</option>
                                                        <option value="number">Número</option>
                                                        <option value="boolean">Verdadero/Falso (Check)</option>
                                                        <option value="select">Opciones de Selección</option>
                                                    </select>
                                                </div>

                                                {/* Placeholder u Opciones */}
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    {cf.type === 'select' ? (
                                                        <>
                                                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Opciones (separadas por coma)</label>
                                                            <input 
                                                                type="text" 
                                                                className="input premium-input" 
                                                                style={{ height: '38px', fontSize: '0.9rem' }}
                                                                placeholder="Ej: Opción A, Opción B"
                                                                value={cf.options_raw !== undefined ? cf.options_raw : (cf.options ? cf.options.join(', ') : '')} 
                                                                onChange={e => {
                                                                    const raw = e.target.value;
                                                                    const parsed = raw.split(',').map(s => s.trim()).filter(Boolean);
                                                                    setLocalCustomFields(prev => prev.map((f, i) => i === index ? { ...f, options: parsed, options_raw: raw } : f));
                                                                    setDirty(true);
                                                                }}
                                                                onBlur={() => {
                                                                    setLocalCustomFields(prev => prev.map((f, i) => i === index ? { ...f, options_raw: undefined } : f));
                                                                }}
                                                            />
                                                        </>
                                                    ) : (
                                                        <>
                                                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Marcador (Placeholder)</label>
                                                            <input 
                                                                type="text" 
                                                                className="input premium-input" 
                                                                style={{ height: '38px', fontSize: '0.9rem' }}
                                                                placeholder="Ej: Completar..."
                                                                value={cf.placeholder || ''} 
                                                                onChange={e => {
                                                                    const val = e.target.value;
                                                                    setLocalCustomFields(prev => prev.map((f, i) => i === index ? { ...f, placeholder: val } : f));
                                                                    setDirty(true);
                                                                }}
                                                            />
                                                        </>
                                                    )}
                                                </div>

                                                {/* Acciones */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingTop: '18px' }}>
                                                    {/* Reordenar */}
                                                    <button 
                                                        className="btn-secundario" 
                                                        style={{ padding: '6px', minWidth: 'auto', height: '38px' }} 
                                                        disabled={index === 0}
                                                        type="button"
                                                        onClick={() => {
                                                            const updated = [...localCustomFields];
                                                            const temp = updated[index];
                                                            updated[index] = updated[index - 1];
                                                            updated[index - 1] = temp;
                                                            setLocalCustomFields(updated);
                                                            setDirty(true);
                                                        }}
                                                        title="Mover arriba"
                                                    >
                                                        <ChevronDown size={14} style={{ transform: 'rotate(180deg)' }} />
                                                    </button>
                                                    <button 
                                                        className="btn-secundario" 
                                                        style={{ padding: '6px', minWidth: 'auto', height: '38px' }} 
                                                        disabled={index === localCustomFields.length - 1}
                                                        type="button"
                                                        onClick={() => {
                                                            const updated = [...localCustomFields];
                                                            const temp = updated[index];
                                                            updated[index] = updated[index + 1];
                                                            updated[index + 1] = temp;
                                                            setLocalCustomFields(updated);
                                                            setDirty(true);
                                                        }}
                                                        title="Mover abajo"
                                                    >
                                                        <ChevronDown size={14} />
                                                    </button>

                                                    {/* Eliminar */}
                                                    <button 
                                                        className="btn-secundario danger-hover" 
                                                        style={{ padding: '6px', minWidth: 'auto', height: '38px' }}
                                                        type="button"
                                                        onClick={() => {
                                                            if (confirm(`¿Estás seguro de eliminar el campo "${cf.label}"?`)) {
                                                                setLocalCustomFields(prev => prev.filter((_, i) => i !== index));
                                                                setDirty(true);
                                                            }
                                                        }}
                                                        title="Eliminar"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                <div style={{ marginTop: '24px', display: 'flex', gap: '12px', maxWidth: '500px' }}>
                                    <input 
                                        type="text" 
                                        id="new-field-label"
                                        className="input premium-input" 
                                        placeholder="Nueva etiqueta (Ej: Volumen de Compra)..." 
                                        style={{ flex: 1, height: '40px' }} 
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') {
                                                const val = e.currentTarget.value.trim();
                                                if (val) {
                                                    const key = val.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
                                                    if (!localCustomFields.some(f => f.key === key)) {
                                                        setLocalCustomFields(prev => [...prev, { key, label: val, type: 'text', placeholder: '' }]);
                                                        setLocalFormLayout(prev => {
                                                            if (!prev || !prev.steps) return prev;
                                                            const updated = [...prev.steps];
                                                            if (!updated[0].fields.some(f => f.key === key)) {
                                                                updated[0].fields.push({ key, label: val, type: 'text', isStandard: false });
                                                            }
                                                            return { ...prev, steps: updated };
                                                        });
                                                        e.currentTarget.value = '';
                                                        setDirty(true);
                                                    } else {
                                                        toast.error('Ya existe un campo similar.');
                                                    }
                                                }
                                            }
                                        }}
                                    />
                                    <button 
                                        className="btn-primario" 
                                        style={{ height: '40px', padding: '0 16px' }}
                                        type="button"
                                        onClick={() => {
                                            const input = document.getElementById('new-field-label');
                                            const val = input?.value.trim();
                                            if (val) {
                                                const key = val.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
                                                if (!localCustomFields.some(f => f.key === key)) {
                                                    setLocalCustomFields(prev => [...prev, { key, label: val, type: 'text', placeholder: '' }]);
                                                    setLocalFormLayout(prev => {
                                                        if (!prev || !prev.steps) return prev;
                                                        const updated = [...prev.steps];
                                                        if (!updated[0].fields.some(f => f.key === key)) {
                                                            updated[0].fields.push({ key, label: val, type: 'text', isStandard: false });
                                                        }
                                                        return { ...prev, steps: updated };
                                                    });
                                                    if (input) input.value = '';
                                                    setDirty(true);
                                                } else {
                                                    toast.error('Ya existe un campo similar.');
                                                }
                                            }
                                        }}
                                    >
                                        <Plus size={16} style={{ marginRight: 6 }} /> Agregar Campo
                                    </button>
                                </div>
                            </div>

                            {/* ── DISEÑADOR DE PASOS DEL FORMULARIO (WIZARD) ── */}
                            <div style={{ background: 'var(--bg-elevated)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 8 }}><Layers size={18} /> Diseñador de Pasos del Formulario (Wizard)</h3>
                                    {localFormLayout && (
                                        <button 
                                            className="btn-secundario danger-hover" 
                                            style={{ padding: '6px 12px', fontSize: '0.8rem', height: '32px' }}
                                            type="button"
                                            onClick={() => {
                                                if (confirm('¿Restablecer la distribución del formulario por defecto? Perderás las pantallas y configuraciones personalizadas.')) {
                                                    setLocalFormLayout(null);
                                                    setDirty(true);
                                                }
                                            }}
                                        >
                                            Restablecer por defecto
                                        </button>
                                    )}
                                </div>
                                <p className="muted" style={{ margin: 0, fontSize: '0.85rem', marginBottom: '20px' }}>
                                    Configurá la cantidad de pantallas (pasos), la distribución de los campos y la obligatoriedad de los datos del cliente.
                                </p>

                                {!localFormLayout || !localFormLayout.steps ? (
                                    <div style={{ padding: '32px', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: '12px', background: 'rgba(var(--accent-rgb), 0.02)' }}>
                                        <p className="muted" style={{ marginBottom: '16px', fontSize: '0.95rem' }}>El formulario tiene actualmente la distribución de 3 pasos estándar por defecto.</p>
                                        <button 
                                            className="btn-primario" 
                                            type="button"
                                            onClick={() => {
                                                const defaultLayout = {
                                                    steps: [
                                                        {
                                                            id: 1,
                                                            title: '1. Datos del Local y Contacto',
                                                            fields: [
                                                                { key: 'nombre_local', label: 'Nombre del Local', type: 'text', isStandard: true, required: true },
                                                                { key: 'direccion', label: 'Dirección', type: 'text', isStandard: true, required: true },
                                                                { key: 'nombre', label: 'Nombre del Contacto', type: 'text', isStandard: true, required: true },
                                                                { key: 'telefono', label: 'Teléfono', type: 'text', isStandard: true, required: true },
                                                                { key: 'mail', label: 'Mail', type: 'email', isStandard: true },
                                                                { key: 'cuit', label: 'CUIT', type: 'text', isStandard: true },
                                                                { key: 'horarios_atencion', label: 'Horarios de Atención', type: 'text', isStandard: true },
                                                                { key: 'estilo_contacto', label: 'Estilo de Contacto', type: 'select', isStandard: true },
                                                                { key: 'tipo_contacto', label: 'Tipo de Contacto', type: 'select', isStandard: true },
                                                                { key: 'responsable', label: 'Responsable', type: 'select', isStandard: true }
                                                            ]
                                                        },
                                                        {
                                                            id: 2,
                                                            title: '2. Clasificación del Cliente',
                                                            fields: [
                                                                { key: 'rubro', label: 'Rubro', type: 'select', isStandard: true, required: true },
                                                                { key: 'estado', label: 'Estado', type: 'select', isStandard: true },
                                                                { key: 'interes', label: 'Nivel de Interés', type: 'interes_bar', isStandard: true },
                                                                { key: 'venta_digital', label: '¿Venta Digital?', type: 'venta_digital', isStandard: true },
                                                                { key: 'grupos', label: 'Grupos / Etiquetas', type: 'grupos', isStandard: true },
                                                                { key: 'situacion', label: 'Situación', type: 'situacion', isStandard: true }
                                                            ]
                                                        },
                                                        {
                                                            id: 3,
                                                            title: '3. Agenda y Notas',
                                                            fields: [
                                                                { key: 'fecha_proximo_contacto', label: 'Próxima Visita', type: 'agenda', isStandard: true },
                                                                { key: 'notas', label: 'Notas', type: 'textarea', isStandard: true }
                                                            ]
                                                        }
                                                    ]
                                                };
                                                // Agregar campos personalizados que existan hoy
                                                localCustomFields.forEach(cf => {
                                                    defaultLayout.steps[0].fields.push({ key: cf.key, label: cf.label, type: cf.type, options: cf.options, placeholder: cf.placeholder, isStandard: false });
                                                });
                                                setLocalFormLayout(defaultLayout);
                                                setDirty(true);
                                                toast.success('Distribución personalizada inicializada con éxito.');
                                            }}
                                        >
                                            <Plus size={16} style={{ marginRight: 6 }} /> Personalizar Distribución de Pantallas
                                        </button>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                        {localFormLayout.steps.map((step, stepIdx) => (
                                            <div key={stepIdx} className="glass-card" style={{ padding: '20px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                                                        <span style={{ fontSize: '0.85rem', fontWeight: 800, background: 'var(--accent)', color: '#fff', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            {stepIdx + 1}
                                                        </span>
                                                        <input 
                                                            type="text" 
                                                            className="input premium-input" 
                                                            style={{ height: '36px', fontSize: '0.95rem', fontWeight: 600, maxWidth: '300px' }}
                                                            value={step.title} 
                                                            onChange={e => {
                                                                const val = e.target.value;
                                                                setLocalFormLayout(prev => ({
                                                                    ...prev,
                                                                    steps: prev.steps.map((s, idx) => idx === stepIdx ? { ...s, title: val } : s)
                                                                }));
                                                                setDirty(true);
                                                            }}
                                                        />
                                                    </div>
                                                    <button 
                                                        className="btn-secundario danger-hover" 
                                                        style={{ padding: '4px 10px', fontSize: '0.78rem', height: '28px' }}
                                                        type="button"
                                                        onClick={() => {
                                                            if (localFormLayout.steps.length <= 1) {
                                                                toast.error('El formulario debe tener al menos una pantalla.');
                                                                return;
                                                            }
                                                            if (confirm('¿Eliminar esta pantalla? Todos sus campos se moverán a la primera pantalla.')) {
                                                                const fieldsToMove = step.fields || [];
                                                                const updated = localFormLayout.steps.filter((_, idx) => idx !== stepIdx);
                                                                updated[0].fields = [...(updated[0].fields || []), ...fieldsToMove];
                                                                updated.forEach((s, idx) => { s.id = idx + 1; });
                                                                setLocalFormLayout({ steps: updated });
                                                                setDirty(true);
                                                            }
                                                        }}
                                                    >
                                                        Eliminar Pantalla
                                                    </button>
                                                </div>

                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                    {(step.fields || []).length === 0 ? (
                                                        <p className="muted" style={{ margin: 0, fontSize: '0.8rem', padding: '12px', border: '1px dashed var(--border)', borderRadius: '8px', textAlign: 'center' }}>
                                                            No hay campos en esta pantalla. Arrastrá o asigná campos disponibles.
                                                        </p>
                                                    ) : (
                                                        step.fields.map((cf, cfIdx) => {
                                                            const isEditing = editingFieldKey === cf.key;
                                                            return (
                                                                <div key={cf.key} style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{cf.label}</span>
                                                                            <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: cf.isStandard ? 'rgba(59,130,246,0.1)' : 'rgba(16,185,129,0.1)', color: cf.isStandard ? 'var(--accent)' : '#10b981' }}>
                                                                                {cf.isStandard ? 'Estándar' : 'Personalizado'}
                                                                            </span>
                                                                        </div>

                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                                            <button 
                                                                                style={{ background: 'none', border: 'none', color: isEditing ? 'var(--accent)' : 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 600 }}
                                                                                type="button"
                                                                                onClick={() => setEditingFieldKey(isEditing ? null : cf.key)}
                                                                            >
                                                                                <Edit2 size={13} /> {isEditing ? 'Cerrar' : 'Configurar'}
                                                                            </button>

                                                                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', cursor: 'pointer', userSelect: 'none' }}>
                                                                                <input 
                                                                                    type="checkbox" 
                                                                                    checked={Boolean(cf.required)} 
                                                                                    onChange={e => {
                                                                                        const checked = e.target.checked;
                                                                                        setLocalFormLayout(prev => ({
                                                                                            ...prev,
                                                                                            steps: prev.steps.map((s, sIdx) => sIdx === stepIdx ? {
                                                                                                ...s,
                                                                                                fields: s.fields.map((f, fIdx) => fIdx === cfIdx ? { ...f, required: checked } : f)
                                                                                            } : s)
                                                                                        }));
                                                                                        setDirty(true);
                                                                                    }}
                                                                                    style={{ width: '15px', height: '15px', accentColor: 'var(--accent)' }}
                                                                                />
                                                                                Obligatorio
                                                                            </label>

                                                                            <select 
                                                                                style={{ height: '28px', fontSize: '0.8rem', padding: '0 8px', borderRadius: '6px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', cursor: 'pointer' }}
                                                                                value={stepIdx}
                                                                                onChange={e => {
                                                                                    const targetIdx = Number(e.target.value);
                                                                                    if (targetIdx === stepIdx) return;
                                                                                    setLocalFormLayout(prev => {
                                                                                        const updated = [...prev.steps];
                                                                                        const [movedField] = updated[stepIdx].fields.splice(cfIdx, 1);
                                                                                        updated[targetIdx].fields.push(movedField);
                                                                                        return { ...prev, steps: updated };
                                                                                    });
                                                                                    setDirty(true);
                                                                                }}
                                                                            >
                                                                                {localFormLayout.steps.map((_, idx) => (
                                                                                    <option key={idx} value={idx}>Mover a paso {idx + 1}</option>
                                                                                ))}
                                                                            </select>

                                                                            <button 
                                                                                style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px' }}
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setLocalFormLayout(prev => ({
                                                                                        ...prev,
                                                                                        steps: prev.steps.map((s, sIdx) => sIdx === stepIdx ? {
                                                                                            ...s,
                                                                                            fields: s.fields.filter((_, fIdx) => fIdx !== cfIdx)
                                                                                        } : s)
                                                                                    }));
                                                                                    setDirty(true);
                                                                                }}
                                                                                title="Quitar del formulario"
                                                                            >
                                                                                <X size={14} />
                                                                            </button>
                                                                        </div>
                                                                    </div>

                                                                    {isEditing && (
                                                                        <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Etiqueta de Pregunta / Campo</label>
                                                                                <input 
                                                                                    type="text"
                                                                                    className="input premium-input"
                                                                                    style={{ height: '32px', fontSize: '0.85rem' }}
                                                                                    value={cf.label || ''}
                                                                                    onChange={e => {
                                                                                        const val = e.target.value;
                                                                                        setLocalFormLayout(prev => ({
                                                                                            ...prev,
                                                                                            steps: prev.steps.map((s, sIdx) => sIdx === stepIdx ? {
                                                                                                ...s,
                                                                                                fields: s.fields.map((f, fIdx) => fIdx === cfIdx ? { ...f, label: val } : f)
                                                                                            } : s)
                                                                                        }));
                                                                                        setDirty(true);
                                                                                    }}
                                                                                />
                                                                            </div>

                                                                                                                                                         <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                                 <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Tipo de Campo</label>
                                                                                 <select 
                                                                                     className="input premium-input"
                                                                                     style={{ height: '32px', fontSize: '0.85rem', cursor: 'pointer' }}
                                                                                     value={cf.type || 'text'}
                                                                                     onChange={e => {
                                                                                         const val = e.target.value;
                                                                                         setLocalFormLayout(prev => ({
                                                                                             ...prev,
                                                                                             steps: prev.steps.map((s, sIdx) => sIdx === stepIdx ? {
                                                                                                 ...s,
                                                                                                 fields: s.fields.map((f, fIdx) => fIdx === cfIdx ? { ...f, type: val } : f)
                                                                                             } : s)
                                                                                         }));
                                                                                         setDirty(true);
                                                                                     }}
                                                                                 >
                                                                                     <option value="text">Texto Corto</option>
                                                                                     <option value="number">Número</option>
                                                                                     <option value="boolean">Verdadero/Falso (Check)</option>
                                                                                     <option value="select">Lista Desplegable (Dropdown)</option>
                                                                                     <option value="groups">Selección Múltiple (Checkboxes/Botones)</option>
                                                                                     <option value="textarea">Texto Largo (Textarea)</option>
                                                                                     <option value="interes_bar">Barra de Interés</option>
                                                                                     <option value="venta_digital">Venta Digital (Sí/No + Cuál)</option>
                                                                                     <option value="agenda">Calendario de Próxima Visita</option>
                                                                                 </select>
                                                                             </div>

                                                                             {(cf.type === 'select' || cf.type === 'groups') && (
                                                                                 <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                                     <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Origen de Datos</label>
                                                                                     <select 
                                                                                         className="input premium-input"
                                                                                         style={{ height: '32px', fontSize: '0.85rem', cursor: 'pointer' }}
                                                                                         value={cf.source || 'custom'}
                                                                                         onChange={e => {
                                                                                             const val = e.target.value;
                                                                                             setLocalFormLayout(prev => ({
                                                                                                 ...prev,
                                                                                                 steps: prev.steps.map((s, sIdx) => sIdx === stepIdx ? {
                                                                                                     ...s,
                                                                                                     fields: s.fields.map((f, fIdx) => fIdx === cfIdx ? { ...f, source: val === 'custom' ? undefined : val } : f)
                                                                                                 } : s)
                                                                                             }));
                                                                                             setDirty(true);
                                                                                         }}
                                                                                     >
                                                                                         <option value="custom">Opciones Personalizadas (Escritas a mano)</option>
                                                                                         <option value="responsables">Responsables (Usuarios Activos)</option>
                                                                                         <option value="rubros">Rubros creados en la empresa</option>
                                                                                         <option value="estados">Estados de prospectos</option>
                                                                                         <option value="tipos_contacto">Tipos de Contacto (Fijos)</option>
                                                                                         <option value="estilos_contacto">Estilos de Contacto (Fijos)</option>
                                                                                     </select>
                                                                                 </div>
                                                                             )}

                                                                             {(cf.type === 'select' || cf.type === 'groups') && (!cf.source || cf.source === 'custom') ? (
                                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Opciones Personalizadas (separadas por coma)</label>
                                                                                    <input 
                                                                                        type="text"
                                                                                        className="input premium-input"
                                                                                        style={{ height: '32px', fontSize: '0.85rem' }}
                                                                                        placeholder="Ej: Opción A, Opción B"
                                                                                        value={cf.options_raw !== undefined ? cf.options_raw : (cf.options ? cf.options.join(', ') : '')}
                                                                                        onChange={e => {
                                                                                            const raw = e.target.value;
                                                                                            const parsed = raw.split(',').map(s => s.trim()).filter(Boolean);
                                                                                            setLocalFormLayout(prev => ({
                                                                                                ...prev,
                                                                                                steps: prev.steps.map((s, sIdx) => sIdx === stepIdx ? {
                                                                                                    ...s,
                                                                                                    fields: s.fields.map((f, fIdx) => fIdx === cfIdx ? { ...f, options: parsed, options_raw: raw } : f)
                                                                                                } : s)
                                                                                            }));
                                                                                            setDirty(true);
                                                                                        }}
                                                                                        onBlur={() => {
                                                                                            setLocalFormLayout(prev => ({
                                                                                                ...prev,
                                                                                                steps: prev.steps.map((s, sIdx) => sIdx === stepIdx ? {
                                                                                                    ...s,
                                                                                                    fields: s.fields.map((f, fIdx) => fIdx === cfIdx ? { ...f, options_raw: undefined } : f)
                                                                                                } : s)
                                                                                            }));
                                                                                        }}
                                                                                    />
                                                                                </div>
                                                                            ) : (cf.type !== 'select' && cf.type !== 'groups' && cf.type !== 'boolean' && cf.type !== 'interes_bar' && cf.type !== 'venta_digital') && (
                                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Marcador (Placeholder)</label>
                                                                                    <input 
                                                                                        type="text"
                                                                                        className="input premium-input"
                                                                                        style={{ height: '32px', fontSize: '0.85rem' }}
                                                                                        placeholder="Ej: Completar..."
                                                                                        value={cf.placeholder || ''}
                                                                                        onChange={e => {
                                                                                            const val = e.target.value;
                                                                                            setLocalFormLayout(prev => ({
                                                                                                ...prev,
                                                                                                steps: prev.steps.map((s, sIdx) => sIdx === stepIdx ? {
                                                                                                    ...s,
                                                                                                    fields: s.fields.map((f, fIdx) => fIdx === cfIdx ? { ...f, placeholder: val } : f)
                                                                                                } : s)
                                                                                            }));
                                                                                            setDirty(true);
                                                                                        }}
                                                                                    />
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })
                                                    )}
                                                </div>
                                            </div>
                                        ))}

                                        <div style={{ display: 'flex', gap: '12px' }}>
                                            <button 
                                                className="btn-secundario" 
                                                style={{ height: '36px', padding: '0 16px' }}
                                                type="button"
                                                onClick={() => {
                                                    setLocalFormLayout(prev => ({
                                                        ...prev,
                                                        steps: [...prev.steps, { id: prev.steps.length + 1, title: `Paso ${prev.steps.length + 1}`, fields: [] }]
                                                    }));
                                                    setDirty(true);
                                                }}
                                            >
                                                <Plus size={14} style={{ marginRight: 6 }} /> Agregar Nueva Pantalla
                                            </button>
                                        </div>

                                        {/* Campos No Colocados (Disponibles) */}
                                        {(() => {
                                            const placedKeys = new Set(localFormLayout.steps.flatMap(s => s.fields.map(f => f.key)));
                                            const availableFields = [
                                                { key: 'nombre_local', label: 'Nombre del Local', type: 'text', isStandard: true },
                                                { key: 'direccion', label: 'Dirección', type: 'text', isStandard: true },
                                                { key: 'nombre', label: 'Nombre del Contacto', type: 'text', isStandard: true },
                                                { key: 'telefono', label: 'Teléfono', type: 'text', isStandard: true },
                                                { key: 'mail', label: 'Mail', type: 'email', isStandard: true },
                                                { key: 'cuit', label: 'CUIT', type: 'text', isStandard: true },
                                                { key: 'horarios_atencion', label: 'Horarios de Atención', type: 'text', isStandard: true },
                                                { key: 'estilo_contacto', label: 'Estilo de Contacto', type: 'select', isStandard: true },
                                                { key: 'tipo_contacto', label: 'Tipo de Contacto', type: 'select', isStandard: true },
                                                { key: 'responsable', label: 'Responsable', type: 'select', isStandard: true },
                                                { key: 'rubro', label: 'Rubro', type: 'select', isStandard: true },
                                                { key: 'estado', label: 'Estado', type: 'select', isStandard: true },
                                                { key: 'interes', label: 'Nivel de Interés', type: 'interes_bar', isStandard: true },
                                                { key: 'venta_digital', label: '¿Venta Digital?', type: 'venta_digital', isStandard: true },
                                                { key: 'grupos', label: 'Grupos / Etiquetas', type: 'grupos', isStandard: true },
                                                { key: 'situacion', label: 'Situación', type: 'situacion', isStandard: true },
                                                { key: 'fecha_proximo_contacto', label: 'Próxima Visita (Fecha)', type: 'agenda', isStandard: true },
                                                { key: 'notas', label: 'Notas', type: 'textarea', isStandard: true },
                                                ...localCustomFields.map(f => ({ key: f.key, label: f.label, type: f.type, isStandard: false }))
                                            ].filter(f => !placedKeys.has(f.key));

                                            if (availableFields.length === 0) return null;

                                            return (
                                                <div style={{ marginTop: '16px', padding: '16px', background: 'rgba(var(--accent-rgb), 0.03)', border: '1px dashed var(--border)', borderRadius: '12px' }}>
                                                    <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', fontWeight: 700 }}>📥 Campos Disponibles No Asignados ({availableFields.length})</h4>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                                        {availableFields.map(cf => (
                                                            <div key={cf.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.8rem' }}>
                                                                <span>{cf.label}</span>
                                                                <select 
                                                                    style={{ height: '22px', fontSize: '0.75rem', padding: '0 4px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer' }}
                                                                    value=""
                                                                    onChange={e => {
                                                                        const targetIdx = Number(e.target.value);
                                                                        setLocalFormLayout(prev => {
                                                                            const updated = [...prev.steps];
                                                                            updated[targetIdx].fields.push(cf);
                                                                            return { ...prev, steps: updated };
                                                                        });
                                                                        setDirty(true);
                                                                    }}
                                                                >
                                                                    <option value="" disabled>Añadir a...</option>
                                                                    {localFormLayout.steps.map((_, idx) => (
                                                                        <option key={idx} value={idx}>Paso {idx + 1}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'personalizacion' && (
                        <div className="personalizacion-management" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <div className="glass-card" style={{ padding: '24px', borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
                                <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>🎨 Personalización Visual y Marca Blanca</h3>
                                <p className="muted" style={{ margin: 0, fontSize: '0.85rem', marginBottom: '24px' }}>
                                    Configurá los colores corporativos, logos e identidad de tu empresa para white-labelizar todo el CRM de forma automática.
                                </p>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                    {/* 1. Selector de Color */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>Color de Acento Corporativo</label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                            <input 
                                                type="color" 
                                                style={{ width: '60px', height: '42px', border: 'none', borderRadius: '8px', padding: 0, cursor: 'pointer', background: 'transparent' }} 
                                                value={localBrandColor} 
                                                onChange={e => { setLocalBrandColor(e.target.value); setDirty(true); }} 
                                            />
                                            <input 
                                                type="text" 
                                                className="input premium-input" 
                                                style={{ width: '120px', height: '42px', textTransform: 'uppercase', textAlign: 'center' }} 
                                                value={localBrandColor} 
                                                onChange={e => { setLocalBrandColor(e.target.value); setDirty(true); }} 
                                            />
                                        </div>
                                        
                                        {/* Recomendados */}
                                        <div style={{ marginTop: '8px' }}>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Paletas Recomendadas:</span>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                                {[
                                                    { name: 'PickingUp Violeta', color: '#7c3aded' },
                                                    { name: 'Azul Eléctrico', color: '#3b82f6' },
                                                    { name: 'Esmeralda Natural', color: '#10b981' },
                                                    { name: 'Oro Oscuro', color: '#d97706' },
                                                    { name: 'Rojo Carmesí', color: '#ef4444' },
                                                    { name: 'Gris Grafito', color: '#4b5563' }
                                                ].map(preset => (
                                                    <button
                                                        key={preset.color}
                                                        type="button"
                                                        onClick={() => { setLocalBrandColor(preset.color); setDirty(true); }}
                                                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', border: '1px solid var(--border)', borderRadius: '20px', background: 'var(--bg)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                                                    >
                                                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: preset.color, display: 'inline-block' }}></span>
                                                        {preset.name}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <hr style={{ border: 0, borderTop: '1px solid var(--border)', margin: '8px 0' }} />

                                    {/* 2. Logo URL */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>URL del Logo de la Empresa</label>
                                        <input 
                                            type="text" 
                                            placeholder="https://ejemplo.com/mi-logo.png" 
                                            className="input premium-input" 
                                            style={{ height: '42px' }} 
                                            value={localLogoUrl} 
                                            onChange={e => { setLocalLogoUrl(e.target.value); setDirty(true); }} 
                                        />
                                        <p className="muted" style={{ margin: 0, fontSize: '0.75rem' }}>Ingresá una URL de imagen con fondo transparente.</p>
                                        
                                        {localLogoUrl && (
                                            <div style={{ marginTop: '8px', padding: '12px', background: 'var(--bg)', borderRadius: '8px', border: '1px solid var(--border)', display: 'inline-flex', alignItems: 'center', gap: '12px', maxWidth: '300px' }}>
                                                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Previsualización:</span>
                                                <img src={localLogoUrl} alt="Logo" style={{ maxHeight: '36px', maxWidth: '140px', objectFit: 'contain' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                            </div>
                                        )}
                                    </div>

                                    <hr style={{ border: 0, borderTop: '1px solid var(--border)', margin: '8px 0' }} />

                                    {/* 3. Nombre Comercial */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>Nombre Personalizado del CRM</label>
                                        <input 
                                            type="text" 
                                            placeholder="PickingUp CRM" 
                                            className="input premium-input" 
                                            style={{ height: '42px', maxWidth: '350px' }} 
                                            value={localSystemName} 
                                            onChange={e => { setLocalSystemName(e.target.value); setDirty(true); }} 
                                        />
                                        <p className="muted" style={{ margin: 0, fontSize: '0.75rem' }}>Personaliza el nombre de la plataforma en la barra lateral.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* POPUP: EDITAR USUARIO */}
            <AnimatePresence>
                {isUserModalOpen && selectedUser && (
                    <div className="modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={() => setIsUserModalOpen(false)}>
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="modal-content glass-card" style={{ width: '90%', maxWidth: '400px', padding: '24px' }} onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><Edit2 size={18}/> Asignar Rol</h3>
                                <button onClick={() => setIsUserModalOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20}/></button>
                            </div>
                            <p className="muted" style={{ marginBottom: 20, fontSize: '0.9rem' }}>Actualizar credenciales para <strong>{selectedUser.nombre}</strong></p>
                            
                            <form onSubmit={handleSaveUser}>
                                <div style={{ marginBottom: 16 }}>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 8, color: 'var(--text-muted)' }}>Rol Dinámico</label>
                                    <select className="input premium-input" style={{ width: '100%', appearance: 'none' }} value={editUserForm.role} onChange={e => setEditUserForm(p => ({...p, role: e.target.value}))}>
                                        <option value="">Seleccionar rol...</option>
                                        {rolesDinamicos.map(r => (
                                            <option key={r.nombre} value={r.nombre}>{r.nombre.toUpperCase()}</option>
                                        ))}
                                    </select>
                                </div>
                                <div style={{ marginBottom: 24 }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '0.9rem', fontWeight: 500 }}>
                                        <input type="checkbox" style={{ width: 18, height: 18, accentColor: 'var(--accent)' }} checked={editUserForm.activo} onChange={e => setEditUserForm(p => ({...p, activo: e.target.checked}))} />
                                        Acceso de Usuario Activo
                                    </label>
                                </div>
                                <div style={{ display: 'flex', gap: 12 }}>
                                    <button type="button" className="btn-secundario" onClick={() => setIsUserModalOpen(false)} style={{ flex: 1 }}>Cancelar</button>
                                    <button type="submit" className="btn-primario" disabled={saving} style={{ flex: 1 }}>{saving ? 'Guardando...' : 'Confirmar'}</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* POPUP: CREAR ROL */}
            <AnimatePresence>
                {isRoleModalOpen && (
                    <div className="modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={() => setIsRoleModalOpen(false)}>
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="modal-content glass-card" style={{ width: '90%', maxWidth: '400px', padding: '24px' }} onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><Plus size={18}/> Crear Nuevo Rol</h3>
                                <button onClick={() => setIsRoleModalOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20}/></button>
                            </div>
                            
                            <form onSubmit={handleCreateRole}>
                                <div style={{ marginBottom: 16 }}>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 8, color: 'var(--text-muted)' }}>Identificador del Rol</label>
                                    <input required type="text" className="input premium-input" placeholder="Ej: analista_datos, repositor..." style={{ width: '100%' }} value={newRoleForm.nombre} onChange={e => setNewRoleForm(p => ({...p, nombre: e.target.value}))} />
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: 4 }}>Se guardará en minúsculas.</span>
                                </div>
                                <div style={{ marginBottom: 24 }}>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 8, color: 'var(--text-muted)' }}>Etiqueta de Color</label>
                                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                        <input type="color" style={{ width: 40, height: 40, padding: 0, border: 'none', borderRadius: 8, cursor: 'pointer' }} value={newRoleForm.color_hex} onChange={e => setNewRoleForm(p => ({...p, color_hex: e.target.value}))} />
                                        <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{newRoleForm.color_hex}</span>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 12 }}>
                                    <button type="button" className="btn-secundario" onClick={() => setIsRoleModalOpen(false)} style={{ flex: 1 }}>Cancelar</button>
                                    <button type="submit" className="btn-primario" disabled={saving} style={{ flex: 1 }}>{saving ? 'Creando...' : 'Crear Rol'}</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Sticky Bottom Bar for Save Modulos */}
            <AnimatePresence>
                {dirty && (activeTab === 'modulos' || activeTab === 'categorias' || activeTab === 'campos') && (
                    <motion.div initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }} className="sticky-save-bar">
                        <div className="save-bar-content glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderRadius: '16px', border: '1px solid var(--accent)', boxShadow: '0 20px 40px rgba(124, 58, 237, 0.2)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ background: 'var(--accent)', borderRadius: '50%', padding: 6, display: 'flex', color: 'white' }}><Save size={16} /></div>
                                <div className="hide-mobile">
                                    <strong style={{ display: 'block', fontSize: '0.95rem' }}>Cambios sin guardar</strong>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <button className="btn-secundario" onClick={() => fetchCoreData()} disabled={saving} style={{ padding: '6px 12px', fontSize: '0.85rem' }}>Deshacer</button>
                                <button className="btn-primario" onClick={handleSavePermisos} disabled={saving} style={{ padding: '6px 16px', fontSize: '0.85rem' }}>{saving ? 'Aplicando...' : 'Guardar'}</button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style>{`
                .permisos-cards-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                    gap: 16px;
                }
                .permiso-card { position: relative; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
                .permiso-card.disabled { opacity: 0.65; filter: grayscale(0.5); }
                .permiso-card:hover { border-color: var(--accent); box-shadow: 0 5px 20px rgba(0,0,0,0.05); }
                .modern-switch { width: 40px; height: 22px; border-radius: 11px; background: var(--border); position: relative; transition: background 0.3s; }
                .modern-switch.active { background: var(--accent); }
                .modern-switch-knob { position: absolute; top: 2px; left: 2px; width: 18px; height: 18px; background: white; border-radius: 50%; transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 2px 5px rgba(0,0,0,0.2); }
                .modern-switch.active .modern-switch-knob { left: 20px; }
                .role-chip { border-radius: 16px; font-weight: 600; display: inline-flex; alignItems: center; gap: 4px; border: 1px solid var(--border); background: var(--bg); color: var(--text-muted); cursor: pointer; transition: all 0.2s; text-transform: capitalize; }
                .role-chip:hover:not(:disabled) { border-color: var(--chip-color); background: var(--bg-hover); }
                .role-chip.selected { background: var(--chip-color); color: white; border-color: var(--chip-color); box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
                .role-chip:disabled { opacity: 0.5; cursor: not-allowed; }
                .sticky-save-bar { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); width: 90%; max-width: 600px; z-index: 1000; }
                .danger-hover:hover { background: rgba(239, 68, 68, 0.1); color: #ef4444; border-color: rgba(239, 68, 68, 0.3); }
                
                @media (max-width: 768px) {
                    .permisos-cards-grid { grid-template-columns: 1fr; }
                    .sticky-save-bar { width: calc(100% - 32px); bottom: 16px; }
                    .hide-mobile { display: none; }
                }
            `}</style>
        </div>
    );
}
