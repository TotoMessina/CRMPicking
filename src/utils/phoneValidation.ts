export interface PhoneValidationResult {
    isValid: boolean;
    cleanPhone: string | null;
    reason?: string;
}

/**
 * Validates whether a given phone number input is a valid phone format or invalid text.
 * 
 * Rules:
 * 1. If phone contains alphabetic letters (a-z, A-Z, accents) like "consultar", "sin numero", "abc", etc., it's INVALID TEXT.
 * 2. If phone contains invalid non-phone symbols (e.g. %, $, @, !, ?), it's INVALID.
 * 3. Stripping standard phone formatting symbols (+, -, (, ), ., space) must leave at least 6 digits.
 */
export function validatePhoneNumber(rawPhone: any, isRequired = false): PhoneValidationResult {
    if (rawPhone === undefined || rawPhone === null) {
        if (isRequired) {
            return {
                isValid: false,
                cleanPhone: null,
                reason: 'El número de teléfono es requerido y está ausente.'
            };
        }
        return { isValid: true, cleanPhone: null };
    }

    const strPhone = String(rawPhone).trim();

    if (strPhone === '') {
        if (isRequired) {
            return {
                isValid: false,
                cleanPhone: null,
                reason: 'El número de teléfono está vacío.'
            };
        }
        return { isValid: true, cleanPhone: null };
    }

    // 1. Detect letters in text (e.g. "consultar", "sin número", "abc", "llamar a Pedro")
    const letterMatch = strPhone.match(/[a-zA-ZáéíóúÁÉÍÓÚñÑ]+/g);
    if (letterMatch && letterMatch.length > 0) {
        const detectedText = letterMatch.join(' ');
        return {
            isValid: false,
            cleanPhone: strPhone,
            reason: `El teléfono "${strPhone}" contiene texto o letras ("${detectedText}") y no es un número de teléfono válido.`
        };
    }

    // 2. Strip standard formatting characters (+, -, (, ), ., space)
    const digitsOnly = strPhone.replace(/\D/g, '');

    if (digitsOnly.length === 0) {
        return {
            isValid: false,
            cleanPhone: strPhone,
            reason: `El campo teléfono "${strPhone}" no contiene dígitos numéricos.`
        };
    }

    // 3. Check for forbidden non-phone symbols
    const invalidSymbols = strPhone.replace(/[0-9\s\+\-\(\)\.]/g, '');
    if (invalidSymbols.length > 0) {
        return {
            isValid: false,
            cleanPhone: strPhone,
            reason: `El teléfono "${strPhone}" contiene caracteres o símbolos no permitidos ("${invalidSymbols}").`
        };
    }

    // 4. Minimum digits requirement (at least 6 digits for valid phone/cell number)
    if (digitsOnly.length < 6) {
        return {
            isValid: false,
            cleanPhone: strPhone,
            reason: `El teléfono "${strPhone}" solo tiene ${digitsOnly.length} dígito(s). Debe incluir al menos 6 dígitos.`
        };
    }

    return {
        isValid: true,
        cleanPhone: strPhone
    };
}
