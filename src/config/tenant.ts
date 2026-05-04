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
}

export const defaultTenantConfig: TenantConfig = {
    app: {
        name: "PickingUp CRM",
        shortName: "PickingUp",
        productName: "App Rosa", 
        logoUrl: "/picking-logo.png", 
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
    }
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
                }
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
    root.style.setProperty('--color-primary', config.theme.colors.primary);
    root.style.setProperty('--color-primary-light', config.theme.colors.primaryLight);
    root.style.setProperty('--color-primary-dark', config.theme.colors.primaryDark);
    root.style.setProperty('--color-accent', config.theme.colors.accent);
    document.title = config.app.name;
}

// Para compatibilidad hacia atrás durante la migración, exportamos un proxy o referenciamos directamente a la función si se usa estáticamente, pero es mejor que los archivos usen TenantStore.getConfig()
// export const tenantConfig = currentConfig; (no es reactivo, lo sacamos para obligar refactor)

