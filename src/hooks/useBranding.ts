import { useState } from 'react';
import type { BrandingConfig, ShadowStyle } from '../types/permisos';

// ─────────────────────────────────────────────────────────────────────────────
// Valores por defecto del sistema
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_BRANDING: BrandingConfig = {
    brandColor: '#7c3aded',
    logoUrl: '',
    systemName: 'PickingUp CRM',
    bgColor: '',
    bgElevatedColor: '',
    textColor: '',
    textMutedColor: '',
    borderColor: '',
    borderRadius: '16px',
    fontFamily: 'Outfit',
    shadowStyle: 'soft',
};

// ─────────────────────────────────────────────────────────────────────────────
// Función pura de inyección de variables CSS en el documento raíz.
// Se exporta separadamente para ser reutilizada en AppShell.jsx sin importar
// el hook completo (que tiene estado y solo puede usarse en componentes).
// ─────────────────────────────────────────────────────────────────────────────
export function applyBrandingToDOM(config: Partial<BrandingConfig>): void {
    const root = document.documentElement;

    // Accent
    if (config.brandColor) root.style.setProperty('--accent', config.brandColor);

    // Background
    if (config.bgColor) {
        root.style.setProperty('--bg', config.bgColor);
    } else {
        root.style.removeProperty('--bg');
    }

    // Elevated panels
    if (config.bgElevatedColor) {
        root.style.setProperty('--bg-elevated', config.bgElevatedColor);
        root.style.setProperty('--card', config.bgElevatedColor);
        root.style.setProperty('--bg-card', config.bgElevatedColor);
        root.style.setProperty('--dash-card', config.bgElevatedColor);
    } else {
        root.style.removeProperty('--bg-elevated');
        root.style.removeProperty('--card');
        root.style.removeProperty('--bg-card');
        root.style.removeProperty('--dash-card');
    }

    // Text
    if (config.textColor) {
        root.style.setProperty('--text', config.textColor);
        root.style.setProperty('--dash-text', config.textColor);
    } else {
        root.style.removeProperty('--text');
        root.style.removeProperty('--dash-text');
    }

    // Text muted
    if (config.textMutedColor) {
        root.style.setProperty('--text-muted', config.textMutedColor);
        root.style.setProperty('--dash-muted', config.textMutedColor);
    } else {
        root.style.removeProperty('--text-muted');
        root.style.removeProperty('--dash-muted');
    }

    // Borders
    if (config.borderColor) {
        root.style.setProperty('--border', config.borderColor);
        root.style.setProperty('--dash-border', config.borderColor);
    } else {
        root.style.removeProperty('--border');
        root.style.removeProperty('--dash-border');
    }

    // Border radius (proportional scale)
    if (config.borderRadius) {
        root.style.setProperty('--radius-lg', config.borderRadius);
        root.style.setProperty('--radius-md', `calc(${config.borderRadius} * 0.75)`);
        root.style.setProperty('--radius-sm', `calc(${config.borderRadius} * 0.5)`);
    } else {
        root.style.removeProperty('--radius-lg');
        root.style.removeProperty('--radius-md');
        root.style.removeProperty('--radius-sm');
    }

    // Google Fonts (dynamic head injection)
    if (config.fontFamily) {
        const fontId = 'dynamic-google-font';
        let link = document.getElementById(fontId) as HTMLLinkElement | null;
        if (!link) {
            link = document.createElement('link') as HTMLLinkElement;
            link.id = fontId;
            link.rel = 'stylesheet';
            document.head.appendChild(link);
        }
        link.href = `https://fonts.googleapis.com/css2?family=${config.fontFamily.replace(/ /g, '+')}:wght@300;400;500;600;700;800&display=swap`;
        root.style.setProperty('--font-family', `'${config.fontFamily}'`);
    } else {
        root.style.removeProperty('--font-family');
    }

    // Shadows
    const shadow = config.shadowStyle ?? 'soft';
    if (shadow === 'flat') {
        root.style.setProperty('--shadow-sm', 'none');
        root.style.setProperty('--shadow-md', 'none');
        root.style.setProperty('--shadow-lg', 'none');
    } else if (shadow === 'elevated') {
        root.style.setProperty('--shadow-sm', '0 2px 8px rgba(0, 0, 0, 0.08)');
        root.style.setProperty('--shadow-md', '0 8px 24px rgba(0, 0, 0, 0.12)');
        root.style.setProperty('--shadow-lg', '0 16px 40px rgba(0, 0, 0, 0.16)');
    } else {
        // soft (default)
        root.style.setProperty('--shadow-sm', '0 1px 2px 0 rgba(0, 0, 0, 0.05)');
        root.style.setProperty('--shadow-md', '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)');
        root.style.setProperty('--shadow-lg', '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)');
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook: useBranding
// Gestiona el estado cohesivo de la configuración visual de una empresa.
// ─────────────────────────────────────────────────────────────────────────────
export function useBranding() {
    const [branding, setBranding] = useState<BrandingConfig>(DEFAULT_BRANDING);

    /** Actualiza un campo individual del branding */
    function updateBranding<K extends keyof BrandingConfig>(key: K, value: BrandingConfig[K]) {
        setBranding(prev => ({ ...prev, [key]: value }));
    }

    /** Carga el branding desde la config de una empresa */
    function loadBrandingFromConfig(config: Record<string, any> | null | undefined) {
        setBranding({
            brandColor: config?.brandColor ?? DEFAULT_BRANDING.brandColor,
            logoUrl: config?.logoUrl ?? DEFAULT_BRANDING.logoUrl,
            systemName: config?.systemName ?? DEFAULT_BRANDING.systemName,
            bgColor: config?.bgColor ?? DEFAULT_BRANDING.bgColor,
            bgElevatedColor: config?.bgElevatedColor ?? DEFAULT_BRANDING.bgElevatedColor,
            textColor: config?.textColor ?? DEFAULT_BRANDING.textColor,
            textMutedColor: config?.textMutedColor ?? DEFAULT_BRANDING.textMutedColor,
            borderColor: config?.borderColor ?? DEFAULT_BRANDING.borderColor,
            borderRadius: config?.borderRadius ?? DEFAULT_BRANDING.borderRadius,
            fontFamily: config?.fontFamily ?? DEFAULT_BRANDING.fontFamily,
            shadowStyle: (config?.shadowStyle ?? DEFAULT_BRANDING.shadowStyle) as ShadowStyle,
        });
    }

    return {
        branding,
        setBranding,
        updateBranding,
        loadBrandingFromConfig,
        applyBrandingToDOM,
    };
}
