/**
 * Utilidades para manejo de fechas en el CRM
 */

export interface DateRange {
    from: string;
    to: string;
}

export type PresetType = '7d' | '30d' | '60d' | '90d' | '6m' | '1y' | 'custom';

/**
 * Calcula fechas de inicio y fin basadas en un preset (7d, 30d, etc)
 * @param preset - El identificador del rango ('7d', '30d', etc)
 * @returns {DateRange | null} { from, to } en formato YYYY-MM-DD
 */
export const calculatePresetDates = (preset: PresetType | string): DateRange | null => {
    if (!preset || preset === 'custom') return null;
    
    const days: Record<string, number> = { 
        '7d': 7, 
        '30d': 30, 
        '60d': 60, 
        '90d': 90, 
        '6m': 182, 
        '1y': 365 
    };

    const daysCount = days[preset] || 30;

    const end = new Date();
    const start = new Date(end);
    start.setDate(end.getDate() - (daysCount - 1));

    const formatDate = (date: Date): string => {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };

    return {
        from: formatDate(start),
        to: formatDate(end)
    };
};

/**
 * Formatea una fecha ISO a formato local legible
 * @param isoString 
 * @returns {string} dd/mm/yyyy
 */
export const formatToLocal = (isoString: string | null | undefined): string => {
    if (!isoString) return '';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
};

/**
 * Obtiene el label amigable para un rango de fechas
 */
export const getRangeLabel = (preset: PresetType | string): string => {
    const labels: Record<string, string> = {
        '7d': 'Últimos 7 días',
        '30d': 'Últimos 30 días',
        '60d': 'Últimos 60 días',
        '90d': 'Últimos 90 días',
        '6m': 'Últimos 6 meses',
        '1y': 'Último año',
        'custom': 'Rango personalizado'
    };
    return labels[preset] || 'Rango de fechas';
};
