// ─────────────────────────────────────────────────────────────────────────────
// Tipos centralizados para la feature de Permisos / Centro de Accesos
// ─────────────────────────────────────────────────────────────────────────────

export interface EmpresaPermiso {
    pagina: string;
    habilitada: boolean;
    roles: Set<string>;
}

export interface CrmRole {
    id?: string;
    nombre: string;
    color_hex: string;
    empresa_id?: string;
}

export interface UsuarioEmpresa {
    id: string;
    nombre: string;
    email: string;
    role?: string;
    activo?: boolean;
    avatar_emoji?: string;
}

export type AutomationTrigger = 'state_changed';
export type AutomationAction = 'assign_responsible' | 'change_situation';

export interface AutomationRule {
    trigger: AutomationTrigger;
    value: string;
    action: AutomationAction;
    target: string;
}

export type ShadowStyle = 'flat' | 'soft' | 'elevated';

export interface BrandingConfig {
    brandColor: string;
    logoUrl: string;
    systemName: string;
    bgColor: string;
    bgElevatedColor: string;
    textColor: string;
    textMutedColor: string;
    borderColor: string;
    borderRadius: string;
    fontFamily: string;
    shadowStyle: ShadowStyle;
}

export interface FormField {
    key: string;
    label: string;
    type: string;
    isStandard?: boolean;
    required?: boolean;
    options?: string[];
    options_raw?: string;
    placeholder?: string;
    source?: string;
}

export interface FormStep {
    id: number;
    title: string;
    fields: FormField[];
}

export interface FormLayout {
    steps: FormStep[];
}

export type TabKey =
    | 'modulos'
    | 'usuarios'
    | 'categorias'
    | 'campos'
    | 'personalizacion'
    | 'automatizaciones';
