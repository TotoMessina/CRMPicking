import { ALL_PAGES } from '../constants/pages';
import type { Empresa, PaginasPermitidas } from '../contexts/AuthContext';

/**
 * Normaliza una ruta a su clave base en ALL_PAGES.
 * Por ejemplo, /dashboard mapea a /, y subrutas como /configuracion/pipeline a /configuracion.
 */
export function normalizePath(path: string): string {
    if (!path) return '/';
    if (path === '/dashboard') return '/';
    if (path.startsWith('/configuracion/')) return '/configuracion';
    return path;
}

/**
 * Determina si una ruta está permitida para el usuario en la empresa activa.
 */
export function isPathAllowed(
    rawPath: string,
    role: string | null,
    empresaActiva: Empresa | null,
    paginasPermitidas: PaginasPermitidas | null
): boolean {
    const isSuperAdmin = role === 'super-admin';
    if (isSuperAdmin) return true;

    const path = normalizePath(rawPath);
    const pageItem = ALL_PAGES.find(p => p.to === path);

    // Si la página solo es para super admin, denegar
    if (pageItem?.superAdminOnly) return false;

    const effectiveRole = (empresaActiva?.role_en_empresa?.toLowerCase() || role?.toLowerCase() || 'user') as string;
    const isAdmin = effectiveRole === 'admin' || effectiveRole === 'super-admin';

    // Si la página es adminOnly y el usuario no es admin
    if (pageItem?.adminOnly && !isAdmin) return false;

    // SAFE ESCAPES: Evitar lockouts absolutos para los administradores locales
    if (isAdmin && (path === '/permisos-empresa' || path === '/configuracion' || path === '/' || path === '/usuarios')) {
        return true;
    }

    // Si la empresa tiene configuración explícita de páginas permitidas
    if (paginasPermitidas && Object.keys(paginasPermitidas).length > 0) {
        const allowedRoles = paginasPermitidas[path];
        if (!allowedRoles || allowedRoles.length === 0) {
            return false;
        }
        return allowedRoles.some(r => r && r.toLowerCase() === effectiveRole.toLowerCase());
    }

    // Fallback si la empresa aún no configuró permisos de página
    const isActivador = effectiveRole.includes('activador');
    if (isActivador) {
        const activadorRoutes = new Set([
            '/', '/clientes', '/calendario', '/mapa', '/configuracion',
            '/chat', '/tablero', '/historial', '/ruta', '/inventario-marketing'
        ]);
        return activadorRoutes.has(path);
    }

    return (!pageItem?.adminOnly && !pageItem?.superAdminOnly) || isAdmin;
}

/**
 * Obtiene la ruta de aterrizaje inicial (landing page) correspondiente al usuario.
 * 1. Prioriza la landingPage personalizada de la empresa (si está permitida para su rol).
 * 2. Si no o si es '/', comprueba si '/' (Inicio) está permitido para su rol.
 * 3. Si '/' NO está permitido para su rol, busca la primera página permitida en ALL_PAGES.
 * 4. Si no tiene ninguna permitida, retorna null.
 */
export function getLandingPageRoute(
    role: string | null,
    empresaActiva: Empresa | null,
    paginasPermitidas: PaginasPermitidas | null
): string | null {
    // 1. Landing page configurada en la empresa (distinta de '/')
    const configuredLanding = empresaActiva?.config?.landingPage;
    if (configuredLanding && configuredLanding !== '/' && isPathAllowed(configuredLanding, role, empresaActiva, paginasPermitidas)) {
        return configuredLanding;
    }

    // 2. Pantalla de Inicio estándar ('/')
    if (isPathAllowed('/', role, empresaActiva, paginasPermitidas)) {
        return '/';
    }

    // 3. Primer módulo permitido disponible según el manifiesto central de páginas
    const firstAllowed = ALL_PAGES.find(p => p.to && isPathAllowed(p.to, role, empresaActiva, paginasPermitidas));
    return firstAllowed?.to || null;
}
