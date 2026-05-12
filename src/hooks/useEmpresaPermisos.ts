import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
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
                setRolesDinamicos(rolesData || []);
            } else {
                console.error('Error cargando crm_roles (Ignorar si la tabla no existe aún)', rolesError);
                setRolesDinamicos(FALLBACK_ROLES);
            }

            // 3. Usuarios
            const { data: usersData } = await supabase
                .from('usuarios')
                .select('*')
                .order('nombre', { ascending: true });
            setUsuariosEmpresa((usersData || []) as UsuarioEmpresa[]);

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
        if (!selectedUser || isDemoMode) return;
        setSaving(true);
        try {
            const { error } = await supabase
                .from('usuarios')
                .update({ role: editUserForm.role, activo: editUserForm.activo })
                .eq('id', selectedUser.id);
            if (error) throw error;
            toast.success('Rol de usuario actualizado');
            setIsUserModalOpen(false);
            fetchCoreData();
        } catch {
            toast.error('Error actualizando usuario');
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
        handleSavePermisos, handleSaveUser, handleCreateRole,
        // Modales
        selectedUser, setSelectedUser,
        isUserModalOpen, setIsUserModalOpen,
        editUserForm, setEditUserForm,
        isRoleModalOpen, setIsRoleModalOpen,
        newRoleForm, setNewRoleForm,
    };
}
