export interface TenantConfig {
    app: {
        name: string;
        shortName: string;
        productName: string;
        logoUrl: string;
    };
    ai: {
        name: string;
        role: string;
    };
    theme: {
        colors: {
            primary: string;
            primaryLight: string;
            primaryDark: string;
            accent: string;
        };
    };
    sidebarGroups?: string[];
    pageGroups?: Record<string, string>;
}

export const defaultTenantConfig: TenantConfig = {
    app: {
        name: "InsideUp CRM",
        shortName: "InsideUp",
        productName: "App Rosa", 
        logoUrl: "/inside-logo.png", 
    },
    ai: {
        name: "CoqueBot",
        role: "tu copiloto de ventas",
    },
    theme: {
        colors: {
            primary: "#8b5cf6",      
            primaryLight: "#a78bfa", 
            primaryDark: "#7c3aed",  
            accent: "#d946ef",       
        }
    },
    sidebarGroups: [
        'Activaciones',
        'Operaciones',
        'Planificación',
        'Mapas',
        'Listados',
        'Administrativo'
    ],
    pageGroups: {}
};

let currentConfig: TenantConfig = { ...defaultTenantConfig };

type Listener = (config: TenantConfig) => void;
const listeners: Listener[] = [];

export const TenantStore = {
    getConfig: () => currentConfig,
    setConfig: (newConfig: Partial<TenantConfig> | null) => {
        if (!newConfig) {
            currentConfig = { ...defaultTenantConfig };
        } else {
            // Merge deep
            currentConfig = {
                app: { ...defaultTenantConfig.app, ...newConfig.app },
                ai: { ...defaultTenantConfig.ai, ...newConfig.ai },
                theme: {
                    colors: { ...defaultTenantConfig.theme?.colors, ...newConfig.theme?.colors }
                },
                sidebarGroups: newConfig.sidebarGroups || defaultTenantConfig.sidebarGroups,
                pageGroups: newConfig.pageGroups || defaultTenantConfig.pageGroups
            };
        }
        listeners.forEach(l => l(currentConfig));
        injectTenantTheme(currentConfig);
    },
    subscribe: (listener: Listener) => {
        listeners.push(listener);
        return () => {
            const index = listeners.indexOf(listener);
            if (index > -1) listeners.splice(index, 1);
        };
    }
};

/**
 * Inyecta las variables CSS del tenant en el documento.
 */
export function injectTenantTheme(config: TenantConfig = currentConfig) {
    const root = document.documentElement;
    const colors = config?.theme?.colors || defaultTenantConfig.theme.colors;
    const appName = config?.app?.name || defaultTenantConfig.app.name;

    root.style.setProperty('--color-primary', colors.primary);
    root.style.setProperty('--color-primary-light', colors.primaryLight);
    root.style.setProperty('--color-primary-dark', colors.primaryDark);
    root.style.setProperty('--color-accent', colors.accent);
    document.title = appName;
}

// Para compatibilidad hacia atrás durante la migración, exportamos un proxy o referenciamos directamente a la función si se usa estáticamente, pero es mejor que los archivos usen TenantStore.getConfig()
// export const tenantConfig = currentConfig; (no es reactivo, lo sacamos para obligar refactor)

