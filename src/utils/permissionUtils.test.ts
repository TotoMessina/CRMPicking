import { describe, it, expect } from 'vitest';
import { isPathAllowed, getLandingPageRoute, normalizePath } from './permissionUtils';
import type { Empresa } from '../contexts/AuthContext';

describe('permissionUtils', () => {
    describe('normalizePath', () => {
        it('normaliza /dashboard hacia /', () => {
            expect(normalizePath('/dashboard')).toBe('/');
        });

        it('normaliza subrutas de configuración', () => {
            expect(normalizePath('/configuracion/pipeline')).toBe('/configuracion');
        });

        it('mantiene rutas estándar', () => {
            expect(normalizePath('/clientes')).toBe('/clientes');
            expect(normalizePath('/ruta')).toBe('/ruta');
        });
    });

    describe('isPathAllowed', () => {
        const mockEmpresa: Empresa = {
            id: 'emp-1',
            nombre: 'Empresa Test',
            role_en_empresa: 'repartidor',
            config: {}
        };

        it('permite acceso total a super-admin', () => {
            expect(isPathAllowed('/', 'super-admin', null, null)).toBe(true);
            expect(isPathAllowed('/super-admin', 'super-admin', null, null)).toBe(true);
            expect(isPathAllowed('/ruta', 'super-admin', null, null)).toBe(true);
        });

        it('bloquea páginas de super-admin a usuarios que no son super-admin', () => {
            expect(isPathAllowed('/super-admin', 'admin', mockEmpresa, null)).toBe(false);
            expect(isPathAllowed('/super-admin', 'user', mockEmpresa, null)).toBe(false);
        });

        it('aplica safe escapes para admin local de empresa', () => {
            const adminEmpresa: Empresa = { ...mockEmpresa, role_en_empresa: 'admin' };
            const emptyPermisos = { '/': [], '/permisos-empresa': [] };
            expect(isPathAllowed('/', 'admin', adminEmpresa, emptyPermisos)).toBe(true);
            expect(isPathAllowed('/permisos-empresa', 'admin', adminEmpresa, emptyPermisos)).toBe(true);
            expect(isPathAllowed('/configuracion', 'admin', adminEmpresa, emptyPermisos)).toBe(true);
            expect(isPathAllowed('/usuarios', 'admin', adminEmpresa, emptyPermisos)).toBe(true);
        });

        it('deniega acceso a / (Inicio) si el rol no lo tiene asignado en paginasPermitidas', () => {
            const repartidorEmpresa: Empresa = { ...mockEmpresa, role_en_empresa: 'repartidor' };
            const permisos = {
                '/': ['admin', 'supervisor'], // 'repartidor' NO está aquí
                '/ruta': ['repartidor', 'admin'],
                '/horarios': ['repartidor'],
            };

            expect(isPathAllowed('/', 'user', repartidorEmpresa, permisos)).toBe(false);
            expect(isPathAllowed('/dashboard', 'user', repartidorEmpresa, permisos)).toBe(false);
            expect(isPathAllowed('/ruta', 'user', repartidorEmpresa, permisos)).toBe(true);
            expect(isPathAllowed('/horarios', 'user', repartidorEmpresa, permisos)).toBe(true);
        });

        it('compara roles de forma insensible a mayúsculas y minúsculas', () => {
            const repartidorEmpresa: Empresa = { ...mockEmpresa, role_en_empresa: 'repartidor' };
            const permisos = {
                '/ruta': ['Repartidor'], // Con mayúscula en BD
            };
            expect(isPathAllowed('/ruta', 'user', repartidorEmpresa, permisos)).toBe(true);
        });
    });

    describe('getLandingPageRoute', () => {
        it('redirige al primer módulo permitido si el rol NO tiene asignado el Inicio (/)', () => {
            const repartidorEmpresa: Empresa = {
                id: 'emp-1',
                nombre: 'Empresa Test',
                role_en_empresa: 'repartidor',
                config: { landingPage: '/' }
            };

            const permisos = {
                '/': ['admin'], // Sin repartidor
                '/ruta': ['repartidor'],
                '/horarios': ['repartidor'],
            };

            const landing = getLandingPageRoute('user', repartidorEmpresa, permisos);
            // Debe retornar '/ruta' (primer módulo permitido), NUNCA '/'
            expect(landing).toBe('/ruta');
        });

        it('retorna / si el rol sí tiene asignado el Inicio', () => {
            const adminEmpresa: Empresa = {
                id: 'emp-1',
                nombre: 'Empresa Test',
                role_en_empresa: 'supervisor',
                config: { landingPage: '/' }
            };

            const permisos = {
                '/': ['admin', 'supervisor'],
                '/ruta': ['admin', 'supervisor'],
            };

            const landing = getLandingPageRoute('user', adminEmpresa, permisos);
            expect(landing).toBe('/');
        });

        it('respeta landingPage personalizada si el rol tiene acceso a ella', () => {
            const userEmpresa: Empresa = {
                id: 'emp-1',
                nombre: 'Empresa Test',
                role_en_empresa: 'vendedor',
                config: { landingPage: '/clientes' }
            };

            const permisos = {
                '/': ['admin'],
                '/clientes': ['vendedor', 'admin'],
            };

            const landing = getLandingPageRoute('user', userEmpresa, permisos);
            expect(landing).toBe('/clientes');
        });

        it('ignora landingPage personalizada si el rol no tiene acceso a ella y busca la primera permitida', () => {
            const userEmpresa: Empresa = {
                id: 'emp-1',
                nombre: 'Empresa Test',
                role_en_empresa: 'repartidor',
                config: { landingPage: '/clientes' } // Configurada a /clientes, pero repartidor no la tiene
            };

            const permisos = {
                '/': ['admin'],
                '/clientes': ['admin'],
                '/ruta': ['repartidor'],
            };

            const landing = getLandingPageRoute('user', userEmpresa, permisos);
            expect(landing).toBe('/ruta');
        });

        it('retorna null si el rol no tiene ningún módulo permitido', () => {
            const lockedEmpresa: Empresa = {
                id: 'emp-1',
                nombre: 'Empresa Test',
                role_en_empresa: 'visitante',
                config: {}
            };

            const permisos = {
                '/': ['admin'],
                '/ruta': ['admin'],
            };

            const landing = getLandingPageRoute('user', lockedEmpresa, permisos);
            expect(landing).toBeNull();
        });
    });
});
