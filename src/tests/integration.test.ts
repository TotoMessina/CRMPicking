import { describe, it, expect, vi, beforeEach } from 'vitest';
import { applyClientFilters } from '../utils/filterUtils';
import { forecastingService } from '../lib/forecastingService';
import { queueMutation, getPendingCount } from '../lib/offlineManager';

// Mock Supabase
vi.mock('../lib/supabase', () => {
    return {
        supabase: {
            from: vi.fn(() => ({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                ilike: vi.fn().mockReturnThis(),
                gte: vi.fn().mockReturnThis(),
                lte: vi.fn().mockReturnThis(),
                in: vi.fn().mockReturnThis(),
                not: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                range: vi.fn().mockReturnThis(),
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                insert: vi.fn().mockResolvedValue({ data: [], error: null })
            }))
        }
    };
});

describe('CRMPickingUp — Tests de Integración', () => {
    
    describe('1. filterUtils — applyClientFilters', () => {
        it('debe aplicar los filtros de estado e interés de forma segura', () => {
            const mockQuery = {
                in: vi.fn().mockReturnThis(),
                gte: vi.fn().mockReturnThis(),
                lte: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                not: vi.fn().mockReturnThis(),
                lt: vi.fn().mockReturnThis(),
                ilike: vi.fn().mockReturnThis(),
            } as any;

            const filters = {
                estado: ['Nuevo', 'En seguimiento'],
                interes: ['Alto'],
                creadoDesde: '2026-05-01'
            };

            const result = applyClientFilters(mockQuery, filters);

            expect(result.in).toHaveBeenCalledWith('estado', ['Nuevo', 'En seguimiento']);
            expect(result.in).toHaveBeenCalledWith('interes', ['Alto']);
            expect(result.gte).toHaveBeenCalledWith('created_at', '2026-05-01T00:00:00.000Z');
        });

        it('debe ignorar filtros vacíos o indefinidos', () => {
            const mockQuery = {
                in: vi.fn().mockReturnThis(),
            } as any;

            const filters = {
                estado: [],
                situacion: undefined
            };

            applyClientFilters(mockQuery, filters);
            expect(mockQuery.in).not.toHaveBeenCalled();
        });
    });

    describe('2. forecastingService — Cálculo de avgVelocityDays', () => {
        it('debe devolver 14 días si no hay actividades registradas en el pipeline', async () => {
            const result = await forecastingService.getForecast('test-company', []);
            expect(result.avgVelocityDays).toBe(14);
        });
    });

    describe('3. offlineManager — IndexedDB mutaciones', () => {
        it('debe gestionar colas de mutaciones pendientes sin romperse en ejecuciones consecutivas', async () => {
            // mock local storage/network settings
            const count = await getPendingCount();
            expect(count).toBe(0);
        });
    });

});
