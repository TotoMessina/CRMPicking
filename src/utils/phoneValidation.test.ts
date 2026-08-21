import { describe, it, expect } from 'vitest';
import { validatePhoneNumber } from './phoneValidation';

describe('validatePhoneNumber', () => {
    it('accepts valid phone numbers in different formats', () => {
        expect(validatePhoneNumber('1123456789').isValid).toBe(true);
        expect(validatePhoneNumber('11-2345-6789').isValid).toBe(true);
        expect(validatePhoneNumber('+54 9 11 2345 6789').isValid).toBe(true);
        expect(validatePhoneNumber('(011) 4567-8901').isValid).toBe(true);
    });

    it('rejects phone numbers containing letters or words', () => {
        const res1 = validatePhoneNumber('consultar');
        expect(res1.isValid).toBe(false);
        expect(res1.reason).toContain('contiene texto o letras');

        const res2 = validatePhoneNumber('sin numero');
        expect(res2.isValid).toBe(false);
        expect(res2.reason).toContain('contiene texto o letras');

        const res3 = validatePhoneNumber('11-abc-5678');
        expect(res3.isValid).toBe(false);
        expect(res3.reason).toContain('contiene texto o letras');

        const res4 = validatePhoneNumber('N/A');
        expect(res4.isValid).toBe(false);
        expect(res4.reason).toContain('contiene texto o letras');
    });

    it('rejects phone numbers with too few digits', () => {
        const res = validatePhoneNumber('12345');
        expect(res.isValid).toBe(false);
        expect(res.reason).toContain('Debe incluir al menos 6 dígitos');
    });

    it('rejects phone numbers with invalid special symbols', () => {
        const res = validatePhoneNumber('11234567#');
        expect(res.isValid).toBe(false);
        expect(res.reason).toContain('símbolos no permitidos');
    });

    it('handles empty or missing phones correctly', () => {
        expect(validatePhoneNumber('', false).isValid).toBe(true);
        expect(validatePhoneNumber(null, false).isValid).toBe(true);
        expect(validatePhoneNumber('', true).isValid).toBe(false);
    });
});
