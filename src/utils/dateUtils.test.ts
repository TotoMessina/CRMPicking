import { describe, it, expect } from 'vitest';
import { calculatePresetDates, formatToLocal, getRangeLabel } from './dateUtils';

describe('dateUtils', () => {
    describe('calculatePresetDates', () => {
        it('should return null for custom preset', () => {
            expect(calculatePresetDates('custom')).toBeNull();
        });

        it('should return 7 days range correctly', () => {
            const range = calculatePresetDates('7d');
            expect(range).not.toBeNull();
            if (range) {
                const start = new Date(range.from);
                const end = new Date(range.to);
                const diffTime = Math.abs(end.getTime() - start.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                expect(diffDays).toBe(6); // 7 elements including both ends
            }
        });
    });

    describe('formatToLocal', () => {
        it('should format ISO string correctly', () => {
            expect(formatToLocal('2023-10-25')).toBe('25/10/2023');
        });

        it('should return empty string for invalid date', () => {
            expect(formatToLocal('invalid')).toBe('');
        });

        it('should return empty string for null', () => {
            expect(formatToLocal(null)).toBe('');
        });
    });

    describe('getRangeLabel', () => {
        it('should return correct label for 30d', () => {
            expect(getRangeLabel('30d')).toBe('Últimos 30 días');
        });

        it('should return fallback for unknown preset', () => {
            expect(getRangeLabel('unknown')).toBe('Rango de fechas');
        });
    });
});
