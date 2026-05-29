import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useClientes, UseClientesParams } from './useClientes';
import { supabase } from '../lib/supabase';

// 1. Fluent chains for mocked queries
const makeMockChain = (resolvedValue: any) => {
    const chain: any = {};
    chain.select = vi.fn().mockReturnValue(chain);
    chain.eq = vi.fn().mockReturnValue(chain);
    chain.in = vi.fn().mockReturnValue(chain);
    chain.order = vi.fn().mockReturnValue(chain);
    chain.range = vi.fn().mockReturnValue(chain);
    chain.then = vi.fn().mockImplementation((onfulfilled) => {
        return Promise.resolve(resolvedValue).then(onfulfilled);
    });
    return chain;
};

const mockEmpresaClienteChain = makeMockChain({
    data: [
        {
            clientes: {
                id: '1',
                nombre: 'Cliente Uno',
                nombre_local: 'Local Uno',
                direccion: 'Calle Falsa 123',
                telefono: '12345678',
                mail: 'uno@test.com',
                cuit: '20-12345678-9',
                lat: -34.6,
                lng: -58.4,
                created_at: '2026-05-01T00:00:00.000Z',
                cliente_grupos: [{ grupos: { id: 'grupo-1', nombre: 'Grupo A' } }]
            },
            estado: 'Nuevo',
            rubro: 'Alimentos',
            responsable: 'Admin',
            situacion: 'Al día',
            notas: 'Alguna nota',
            estilo_contacto: 'Formal',
            interes: 'Alto',
            tipo_contacto: 'Visita',
            venta_digital: true,
            venta_digital_cual: 'WhatsApp',
            fecha_proximo_contacto: '2026-06-01',
            hora_proximo_contacto: '10:00',
            ultima_actividad: '2026-05-28T00:00:00.000Z',
            created_at: '2026-05-01T00:00:00.000Z',
            updated_at: '2026-05-01T00:00:00.000Z',
            metadata: {},
        }
    ],
    count: 1,
    error: null
});

const mockActividadesChain = makeMockChain({
    data: [
        {
            id: 101,
            cliente_id: 1,
            descripcion: 'Visita inicial',
            fecha: '2026-05-28T00:00:00.000Z',
            usuario: 'Admin',
            empresa_id: 'empresa-123'
        }
    ],
    error: null
});

// 2. Setup mock for Supabase
vi.mock('../lib/supabase', () => {
    return {
        supabase: {
            from: vi.fn().mockImplementation((table) => {
                if (table === 'actividades') {
                    return mockActividadesChain;
                }
                return mockEmpresaClienteChain;
            }),
            rpc: vi.fn(),
        }
    };
});

const defaultParams: UseClientesParams = {
    empresaId: 'empresa-123',
    page: 1,
    pageSize: 10,
    isAgendaHoy: false,
    fEstado: [],
    fSituacion: [],
    fTipoContacto: [],
    fResponsable: [],
    fCreadoPor: [],
    fRubro: [],
    fInteres: [],
    fEstilo: [],
    fProximos7: false,
    fVencidos: false,
    fNombre: '',
    fTelefono: '',
    fDireccion: '',
    fCreadoDesde: '',
    fCreadoHasta: '',
    fContactoDesde: '',
    fContactoHasta: '',
    fGrupos: [],
    fMissingCoords: false,
    fMissingContact: false,
    fMissingRubro: false,
    sortBy: 'updated',
};

const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
            },
        },
    });
    return ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
};

describe('useClientes Hook', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe no ejecutarse (quedar deshabilitado) si no hay empresaId', async () => {
        const { result } = renderHook(() => useClientes({ ...defaultParams, empresaId: null }), {
            wrapper: createWrapper(),
        });

        expect(result.current.isSuccess).toBe(false);
        expect(result.current.fetchStatus).toBe('idle');
        expect(supabase.from).not.toHaveBeenCalled();
    });

    it('debe cargar correctamente los clientes y sus actividades (N+1 secuencial)', async () => {
        const { result } = renderHook(() => useClientes(defaultParams), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        
        const data = result.current.data;
        expect(data).toBeDefined();
        expect(data?.clientes).toHaveLength(1);
        expect(data?.clientes[0].nombre).toBe('Cliente Uno');
        expect(data?.clientes[0].grupos).toEqual([{ id: 'grupo-1', nombre: 'Grupo A' }]);
        expect(data?.total).toBe(1);

        // Validamos la consulta de actividades secuencial (N+1)
        expect(supabase.from).toHaveBeenCalledWith('actividades');
        expect(data?.activities['1']).toBeDefined();
        expect(data?.activities['1'][0].descripcion).toBe('Visita inicial');
    });

    it('debe delegar en la RPC "buscar_clientes_empresa" cuando se aplican filtros avanzados (fNombre)', async () => {
        vi.mocked(supabase.rpc).mockResolvedValueOnce({
            data: [
                {
                    cliente_id: '2',
                    nombre: 'Cliente Dos',
                    nombre_local: 'Local Dos',
                    direccion: 'Av 9 de Julio 123',
                    telefono: '87654321',
                    mail: 'dos@test.com',
                    cuit: '20-87654321-9',
                    lat: -34.61,
                    lng: -58.41,
                    c_created_at: '2026-05-02T00:00:00.000Z',
                    ec_created_at: '2026-05-02T00:00:00.000Z',
                    ec_updated_at: '2026-05-02T00:00:00.000Z',
                    estado: 'Nuevo',
                    rubro: 'Servicios',
                    responsable: 'Admin',
                    situacion: 'Al día',
                    notas: 'Sin comentarios',
                    estilo_contacto: 'Informal',
                    interes: 'Medio',
                    tipo_contacto: 'Llamada',
                    venta_digital: false,
                    venta_digital_cual: null,
                    fecha_proximo_contacto: '2026-06-02',
                    hora_proximo_contacto: '11:00',
                    ultima_actividad: '2026-05-29T00:00:00.000Z',
                    metadata: {},
                    grupos: ['Grupo B'],
                    total_count: '1'
                }
            ],
            error: null,
            count: 1,
            status: 200,
            statusText: 'OK'
        } as any);

        const { result } = renderHook(() => useClientes({ ...defaultParams, fNombre: 'Dos' }), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(supabase.rpc).toHaveBeenCalledWith('buscar_clientes_empresa', expect.objectContaining({
            p_empresa_id: 'empresa-123',
            p_nombre: 'Dos'
        }));

        const data = result.current.data;
        expect(data?.clientes).toHaveLength(1);
        expect(data?.clientes[0].nombre).toBe('Cliente Dos');
        expect(data?.total).toBe(1);
    });
});
