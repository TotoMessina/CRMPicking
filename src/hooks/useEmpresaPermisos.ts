import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase, authClient } from '../lib/supabase';
import toast from 'react-hot-toast';
import { ALL_PAGES, GROUPS } from '../constants/pages';
import { applyBrandingToDOM } from './useBranding';
import type {
    CrmRole,
    UsuarioEmpresa,
    AutomationRule,
    BrandingConfig,
    FormLayout,
} from '../types/permisos';

// ─────────────────────────────────────────────────────────────────────────────
// Constante: Layout de formulario predeterminado del sistema
// ─────────────────────────────────────────────────────────────────────────────
export const DEFAULT_FORM_LAYOUT: FormLayout = {
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
                { key: 'responsable', label: 'Responsable', type: 'select', isStandard: true },
            ],
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
                { key: 'situacion', label: 'Situación', type: 'situacion', isStandard: true },
            ],
        },
        {
            id: 3,
            title: '3. Agenda y Notas',
            fields: [
                { key: 'fecha_proximo_contacto', label: 'Próxima Visita', type: 'agenda', isStandard: true },
                { key: 'notas', label: 'Notas', type: 'textarea', isStandard: true },
            ],
        },
    ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Fallback de roles si la tabla aún no fue creada en la DB
// ─────────────────────────────────────────────────────────────────────────────
const FALLBACK_ROLES: CrmRole[] = [
    { nombre: 'admin',      color_hex: '#ef4444' },
    { nombre: 'supervisor', color_hex: '#f59e0b' },
    { nombre: 'activador',  color_hex: '#3b82f6' },
    { nombre: 'empleado',   color_hex: '#10b981' },
];

interface UseEmpresaPermisosProps {
    branding: BrandingConfig;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook: useEmpresaPermisos
// Gestiona toda la lógica de red (fetch + save) para la pantalla Centro de Accesos.
// Separa completamente Supabase de la capa de presentación.
// ─────────────────────────────────────────────────────────────────────────────
export function useEmpresaPermisos({ branding }: UseEmpresaPermisosProps) {
    // ── Empresa ──────────────────────────────────────────────────────────────
    const [empresas, setEmpresas] = useState<any[]>([]);
    const [selectedEmpresa, setSelectedEmpresa] = useState<any>(null);

    // ── Permisos de páginas ───────────────────────────────────────────────────
    const [permisos, setPermisos] = useState<Record<string, { habilitada: boolean; roles: Set<string> }>>({});

    // ── Roles y Usuarios ──────────────────────────────────────────────────────
    const [rolesDinamicos, setRolesDinamicos] = useState<CrmRole[]>([]);
    const [usuariosEmpresa, setUsuariosEmpresa] = useState<UsuarioEmpresa[]>([]);

    // ── Configuración de Categorías ───────────────────────────────────────────
    const [localSidebarGroups, setLocalSidebarGroups] = useState<string[]>([]);
    const [localPageGroups, setLocalPageGroups] = useState<Record<string, string>>({});

    // ── Campos Personalizados ─────────────────────────────────────────────────
    const [localCustomFields, setLocalCustomFields] = useState<any[]>([]);
    const [localFormLayout, setLocalFormLayout] = useState<FormLayout | null>(null);

    // ── Automatizaciones ──────────────────────────────────────────────────────
    const [localAutomations, setLocalAutomations] = useState<AutomationRule[]>([]);
    
    // ── Listados Maestros (Rubros) ────────────────────────────────────────────
    const [localRubros, setLocalRubros] = useState<string[]>([]);

    // ── UI State ──────────────────────────────────────────────────────────────
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);

    // ── Modales ───────────────────────────────────────────────────────────────
    const [selectedUser, setSelectedUser] = useState<UsuarioEmpresa | null>(null);
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [editUserForm, setEditUserForm] = useState({ role: '', activo: true });
    const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
    const [newRoleForm, setNewRoleForm] = useState({ nombre: '', color_hex: '#0c0c0c' });
    const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
    const [createUserForm, setCreateUserForm] = useState({ nombre: '', email: '', role: '', password: '' });

    // ── Cargar lista de empresas (solo al montar) ─────────────────────────────
    useEffect(() => {
        const fetchEmpresas = async () => {
            const { data } = await supabase.from('empresas').select('id, nombre, config').order('nombre');
            setEmpresas(data || []);
            if (data && data.length > 0) setSelectedEmpresa(data[0]);
        };
        fetchEmpresas();
    }, []);

    // ── Resolver layout del formulario desde config ────────────────────────────
    function resolveFormLayout(rawLayout: any, customFields: any[]): FormLayout {
        let layout: FormLayout | null = null;

        if (rawLayout && Array.isArray(rawLayout)) {
            layout = { steps: rawLayout };
        } else if (rawLayout && rawLayout.steps) {
            layout = rawLayout;
        }

        if (!layout || !layout.steps || layout.steps.length === 0) {
            const base: FormLayout = JSON.parse(JSON.stringify(DEFAULT_FORM_LAYOUT));
            customFields.forEach(cf => {
                if (!base.steps[0].fields.some(f => f.key === cf.key)) {
                    base.steps[0].fields.push({
                        key: cf.key, label: cf.label, type: cf.type,
                        options: cf.options, placeholder: cf.placeholder, isStandard: false,
                    });
                }
            });
            return base;
        }

        layout.steps.forEach((s, idx) => {
            if (!s.id) s.id = idx + 1;
        });
        return layout;
    }

    // ── Cargar todos los datos de la empresa seleccionada ─────────────────────
    const fetchCoreData = useCallback(async () => {
        if (!selectedEmpresa) return;
        setLoading(true);

        try {
            // 1. Permisos de páginas
            const { data: permData } = await supabase
                .from('empresa_permisos_pagina')
                .select('*')
                .eq('empresa_id', selectedEmpresa.id);

            const map: Record<string, { habilitada: boolean; roles: Set<string> }> = {};
            (permData || []).forEach((row: any) => {
                map[row.pagina] = { habilitada: row.habilitada, roles: new Set(row.roles_permitidos || []) };
            });
            ALL_PAGES.filter(p => p.to).forEach(p => {
                if (!map[p.to!]) map[p.to!] = { habilitada: false, roles: new Set() };
            });
            setPermisos(map);
            setDirty(false);

            // 2. Roles Dinámicos
            const { data: rolesData, error: rolesError } = await (supabase as any)
                .from('crm_roles')
                .select('*')
                .or(`empresa_id.eq.${selectedEmpresa.id},empresa_id.is.null`)
                .order('created_at', { ascending: true });

            if (!rolesError) {
                const disabledRoles = selectedEmpresa.config?.disabledRoles || [];
                const activeRoles = (rolesData || []).filter((r: any) => 
                    !disabledRoles.includes(r.nombre.toLowerCase())
                );
                setRolesDinamicos(activeRoles);
            } else {
                console.error('Error cargando crm_roles (Ignorar si la tabla no existe aún)', rolesError);
                const disabledRoles = selectedEmpresa.config?.disabledRoles || [];
                const activeRoles = FALLBACK_ROLES.filter(r => 
                    !disabledRoles.includes(r.nombre.toLowerCase())
                );
                setRolesDinamicos(activeRoles);
            }

            // 3. Usuarios de la Empresa (Filtrado multi-tenant)
            const { data: relData } = await supabase
                .from('empresa_usuario')
                .select(`
                    role,
                    user:usuarios!fk_empresa_usuario_usuarios (
                        id, nombre, email, activo, avatar_emoji
                    )
                `)
                .eq('empresa_id', selectedEmpresa.id);

            const formattedUsers = (relData || [])
                .filter((row: any) => row.user)
                .map((row: any) => ({
                    id: row.user.id,
                    nombre: row.user.nombre,
                    email: row.user.email,
                    role: row.role, // Rol específico en esta empresa
                    activo: row.user.activo,
                    avatar_emoji: row.user.avatar_emoji
                }))
                .sort((a, b) => a.nombre.localeCompare(b.nombre));

            setUsuariosEmpresa(formattedUsers as UsuarioEmpresa[]);

            // 4. Configuración de Categorías
            setLocalSidebarGroups(selectedEmpresa?.config?.sidebarGroups || GROUPS);
            setLocalPageGroups(selectedEmpresa?.config?.pageGroups || {});

            // 5. Campos Personalizados
            const customFields = selectedEmpresa?.config?.customFields || [];
            setLocalCustomFields(customFields);

            // 6. Layout del Formulario
            setLocalFormLayout(resolveFormLayout(selectedEmpresa?.config?.formLayout, customFields));

            // 7. Automatizaciones
            setLocalAutomations(selectedEmpresa?.config?.automations || []);

            // 8. Rubros
            setLocalRubros(selectedEmpresa?.config?.rubros || []);

        } catch (error) {
            toast.error('Error al sincronizar datos');
        } finally {
            setLoading(false);
        }
    }, [selectedEmpresa]);

    useEffect(() => {
        fetchCoreData();
    }, [fetchCoreData]);

    // ── Guardar permisos + configuración completa ─────────────────────────────
    const handleSavePermisos = async (isDemoMode: boolean) => {
        if (!selectedEmpresa || isDemoMode) return;
        setSaving(true);

        // 1. Upsert permisos de páginas
        const rows = ALL_PAGES.filter(p => p.to).map(p => ({
            empresa_id: selectedEmpresa.id,
            pagina: p.to!,
            habilitada: permisos[p.to!]?.habilitada ?? false,
            roles_permitidos: Array.from(permisos[p.to!]?.roles || []),
            updated_at: new Date().toISOString(),
        }));

        const { error: permError } = await (supabase as any)
            .from('empresa_permisos_pagina')
            .upsert(rows, { onConflict: 'empresa_id,pagina' });

        if (permError) {
            toast.error('Error al guardar permisos');
            setSaving(false);
            return;
        }

        // 2. Guardar config completa (branding + layout + automatizaciones)
        const updatedConfig = {
            ...(selectedEmpresa.config || {}),
            sidebarGroups: localSidebarGroups,
            pageGroups: localPageGroups,
            customFields: localCustomFields,
            formLayout: localFormLayout,
            rubros: localRubros,
            brandColor:       branding.brandColor,
            logoUrl:          branding.logoUrl,
            systemName:       branding.systemName,
            bgColor:          branding.bgColor,
            bgElevatedColor:  branding.bgElevatedColor,
            textColor:        branding.textColor,
            textMutedColor:   branding.textMutedColor,
            borderColor:      branding.borderColor,
            borderRadius:     branding.borderRadius,
            fontFamily:       branding.fontFamily,
            shadowStyle:      branding.shadowStyle,
            automations:      localAutomations,
        };

        const { error: configError } = await (supabase as any).rpc('update_empresa_config', {
            p_empresa_id: selectedEmpresa.id,
            p_config: updatedConfig,
        });

        if (configError) {
            toast.error('Error al guardar configuración');
        } else {
            toast.success('Permisos y configuración guardados');
            applyBrandingToDOM(branding);

            setEmpresas(prev => prev.map(emp =>
                emp.id === selectedEmpresa.id ? { ...emp, config: updatedConfig } : emp
            ));
            setSelectedEmpresa((prev: any) => ({ ...prev, config: updatedConfig }));
            setDirty(false);
            window.dispatchEvent(new CustomEvent('permissions-updated'));
        }
        setSaving(false);
    };

    // ── Guardar rol de usuario ─────────────────────────────────────────────────
    const handleSaveUser = async (e: React.FormEvent, isDemoMode: boolean) => {
        e.preventDefault();
        if (!selectedUser || isDemoMode || !selectedEmpresa) return;
        setSaving(true);
        try {
            // 1. Actualizar rol específico en la relación de la empresa
            const { error: relError } = await supabase
                .from('empresa_usuario')
                .update({ role: editUserForm.role })
                .eq('empresa_id', selectedEmpresa.id)
                .eq('usuario_email', selectedUser.email);
            
            if (relError) throw relError;

            // 2. Actualizar estado activo global (opcional, pero mantenido del comportamiento original)
            const { error: userError } = await supabase
                .from('usuarios')
                .update({ activo: editUserForm.activo })
                .eq('id', selectedUser.id);

            if (userError) throw userError;

            toast.success('Rol de usuario actualizado');
            setIsUserModalOpen(false);
            fetchCoreData();
        } catch {
            toast.error('Error actualizando usuario');
        } finally {
            setSaving(false);
        }
    };

    // ── Eliminar / Desvincular usuario de la empresa ────────────────────────────
    const handleDeleteUser = async (userEmail: string, isDemoMode: boolean) => {
        if (!selectedEmpresa) return;
        if (isDemoMode) {
            toast.error('Acción no permitida en el modo Demo.');
            return;
        }

        const confirm = window.confirm(`¿Estás seguro de que deseas eliminar el acceso de "${userEmail}" a esta empresa?\n\nEsta acción revoca todos sus privilegios inmediatamente.`);
        if (!confirm) return;

        setSaving(true);
        try {
            const { error } = await supabase
                .from('empresa_usuario')
                .delete()
                .eq('empresa_id', selectedEmpresa.id)
                .eq('usuario_email', userEmail);

            if (error) throw error;

            toast.success('Usuario desvinculado exitosamente de la empresa.', { icon: '🗑️' });
            fetchCoreData();
        } catch (err) {
            console.error('Error deleting user:', err);
            toast.error('Ocurrió un error al desvincular el usuario.');
        } finally {
            setSaving(false);
        }
    };

    // ── Crear nuevo rol ────────────────────────────────────────────────────────
    const handleCreateRole = async (e: React.FormEvent, isDemoMode: boolean) => {
        e.preventDefault();
        if (isDemoMode) return;
        setSaving(true);
        try {
            const { error } = await (supabase as any).from('crm_roles').insert([{
                empresa_id: selectedEmpresa.id,
                nombre: newRoleForm.nombre.trim().toLowerCase(),
                color_hex: newRoleForm.color_hex,
            }]);
            if (error) throw error;
            toast.success('Rol creado exitosamente');
            setIsRoleModalOpen(false);
            setNewRoleForm({ nombre: '', color_hex: '#0c0c0c' });
            fetchCoreData();
        } catch {
            toast.error('Ocurrió un error al crear el rol');
        } finally {
            setSaving(false);
        }
    };

    // ── Eliminar rol dinámico o desactivar base ──────────────────────────────────
    const handleDeleteRole = async (roleName: string, isDemoMode: boolean) => {
        if (!selectedEmpresa) return;
        if (isDemoMode) {
            toast.error('Acción no permitida en el modo Demo.');
            return;
        }

        const normalizedRole = roleName.trim().toLowerCase();

        // Bloqueo de seguridad definitivo
        if (normalizedRole === 'admin') {
            toast.error('Por seguridad estructural, el rol primordial "ADMIN" no puede ser eliminado.');
            return;
        }

        // Verificar si hay usuarios usándolo actualmente
        const usersUsingRole = usuariosEmpresa.filter(u => u.role?.toLowerCase() === normalizedRole);
        if (usersUsingRole.length > 0) {
            toast.error(`No podés eliminar el rol "${roleName.toUpperCase()}" porque hay ${usersUsingRole.length} usuario(s) utilizándolo. Reasígnale otro rol a esos usuarios primero.`);
            return;
        }

        // Identificar si es un rol del sistema base (empresa_id = null)
        const targetRoleObj = rolesDinamicos.find(r => r.nombre.toLowerCase() === normalizedRole);
        const isSystemBaseRole = !targetRoleObj || !targetRoleObj.empresa_id;

        const confirmMsg = isSystemBaseRole 
            ? `¿Estás seguro de que deseas remover el rol base "${roleName.toUpperCase()}" para tu empresa?\n\nDejará de aparecer en el listado de creación de usuarios.`
            : `¿Estás seguro de que deseas eliminar definitivamente el rol dinámico "${roleName.toUpperCase()}"?\n\nEsta acción no se puede deshacer.`;

        const confirm = window.confirm(confirmMsg);
        if (!confirm) return;

        setSaving(true);
        try {
            if (isSystemBaseRole) {
                // Caso A: Desactivar rol base a nivel de configuración de empresa (Soft-Delete Multi-tenant)
                const currentConfig = selectedEmpresa.config || {};
                const disabledRoles = Array.isArray(currentConfig.disabledRoles) ? [...currentConfig.disabledRoles] : [];
                
                if (!disabledRoles.includes(normalizedRole)) {
                    disabledRoles.push(normalizedRole);
                }

                const updatedConfig = { ...currentConfig, disabledRoles };

                const { error: configError } = await (supabase as any).rpc('update_empresa_config', {
                    p_empresa_id: selectedEmpresa.id,
                    p_config: updatedConfig,
                });

                if (configError) throw configError;

                // Actualizar memoria de React
                setEmpresas(prev => prev.map(emp =>
                    emp.id === selectedEmpresa.id ? { ...emp, config: updatedConfig } : emp
                ));
                setSelectedEmpresa((prev: any) => ({ ...prev, config: updatedConfig }));
                toast.success(`Rol base "${roleName.toUpperCase()}" removido de tu empresa.`, { icon: '🗑️' });
            } else {
                // Caso B: Eliminar fila real de crm_roles
                const { error } = await supabase
                    .from('crm_roles')
                    .delete()
                    .eq('empresa_id', selectedEmpresa.id)
                    .eq('nombre', normalizedRole);

                if (error) throw error;

                toast.success(`Rol personalizado "${roleName.toUpperCase()}" eliminado correctamente.`, { icon: '🗑️' });
            }

            fetchCoreData();
        } catch (err) {
            console.error('Error deleting role:', err);
            toast.error('Ocurrió un error al procesar la eliminación del rol.');
        } finally {
            setSaving(false);
        }
    };
    
    // ── Crear nuevo usuario (Flujo 100% DB Seguro: Anti-429 y Aislado) ──────────
    const handleCreateUser = async (userData: { nombre: string; email: string; role: string; password?: string }, isDemoMode: boolean) => {
        if (!selectedEmpresa) throw new Error('No hay una empresa activa seleccionada.');
        if (isDemoMode) throw new Error('Acción no permitida en el modo Demo.');
        
        const password = userData.password || 'Inside' + Math.random().toString(36).slice(-6) + '!'; 

        // Invocar la RPC todo-en-uno que crea el usuario en Auth+Identities e ignora límites de API (429)
        const { data: newUserId, error: rpcError } = await supabase.rpc('admin_create_user', {
            p_email: userData.email.trim(),
            p_password: password,
            p_nombre: userData.nombre.trim(),
            p_role: userData.role.trim().toLowerCase(),
            p_empresa_id: selectedEmpresa.id
        });

        if (rpcError) {
            if (rpcError.message?.includes('does not exist')) {
                throw new Error('La función maestra de creación no existe en la DB. Reinstala "admin_create_user" en tu SQL Editor.');
            }
            throw rpcError;
        }
        
        return { id: newUserId || null, password };
    };

    // ── Páginas agrupadas por categoría (memoizado) ───────────────────────────
    const groupedPages = useMemo(() => {
        const groups: Record<string, any[]> = {};
        const categories = localSidebarGroups.length > 0 ? localSidebarGroups : GROUPS;
        categories.forEach(g => { groups[g] = []; });
        ALL_PAGES.forEach(p => {
            const currentGroup = localPageGroups[p.to!] || p.group;
            if (groups[currentGroup]) {
                groups[currentGroup].push(p);
            } else {
                if (!groups['Otros']) groups['Otros'] = [];
                groups['Otros'].push(p);
            }
        });
        return groups;
    }, [localSidebarGroups, localPageGroups]);

    return {
        // Empresa
        empresas, selectedEmpresa, setSelectedEmpresa,
        // Permisos
        permisos, setPermisos,
        // Roles y Usuarios
        rolesDinamicos, usuariosEmpresa,
        // Categorías
        localSidebarGroups, setLocalSidebarGroups,
        localPageGroups, setLocalPageGroups,
        // Campos
        localCustomFields, setLocalCustomFields,
        localFormLayout, setLocalFormLayout,
        // Automatizaciones
        localAutomations, setLocalAutomations,
        // Rubros
        localRubros, setLocalRubros,
        // UI
        loading, saving, dirty, setDirty,
        // Helpers
        fetchCoreData, groupedPages,
        // Handlers
        handleSavePermisos, handleSaveUser, handleDeleteUser, handleCreateRole, handleDeleteRole, handleCreateUser,
        // Modales
        selectedUser, setSelectedUser,
        isUserModalOpen, setIsUserModalOpen,
        editUserForm, setEditUserForm,
        isRoleModalOpen, setIsRoleModalOpen,
        newRoleForm, setNewRoleForm,
        isCreateUserModalOpen, setIsCreateUserModalOpen,
        createUserForm, setCreateUserForm,
    };
}
