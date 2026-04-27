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
    const [activeTab, setActiveTab] = useState('modulos'); // 'modulos' | 'usuarios'

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
            const { data } = await supabase.from('empresas').select('id, nombre').order('nombre');
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

        const { error } = await supabase
            .from('empresa_permisos_pagina')
            .upsert(rows, { onConflict: 'empresa_id,pagina' });

        if (error) {
            toast.error('Error al guardar permisos');
        } else {
            toast.success('Permisos actualizados');
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
        GROUPS.forEach(g => { groups[g] = []; });
        ALL_PAGES.forEach(p => {
            if (groups[p.group]) groups[p.group].push(p);
            else {
                if(!groups['Otros']) groups['Otros'] = [];
                groups['Otros'].push(p);
            }
        });
        return groups;
    }, []);

    if (!hasPermission) return null; // Fallback or restricted view

    return (
        <div className="container" style={{ padding: '20px', paddingBottom: '90px' }}>
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
            <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)', marginBottom: '24px', overflowX: 'auto' }}>
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
                {dirty && activeTab === 'modulos' && (
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
