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

export type AutomationTrigger = 'state_changed' | 'interest_changed';
export type AutomationAction = 'assign_responsible' | 'change_situation' | 'auto_schedule' | 'add_note';

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

export interface EmpresaConfig {
    disabledRoles?: string[];
    sidebarGroups?: string[];
    pageGroups?: { [key: string]: string };
    customFields?: FormField[];
    formLayout?: FormLayout;
    automations?: AutomationRule[];
    rubros?: string[];
    landingPage?: string;
    dashboardWidgets?: {
        [key: string]: boolean;
    };
    theme?: {
        colors?: {
            primary?: string;
            secondary?: string;
            [key: string]: string | undefined;
        };
        [key: string]: any;
    };
    ai?: {
        name?: string;
        avatarUrl?: string;
        [key: string]: any;
    };
    app?: {
        logoUrl?: string;
        shortName?: string;
        [key: string]: any;
    };
    logoUrl?: string;
    systemName?: string;
}
