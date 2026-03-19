/**
 * Fuente única de verdad para los strings de estado de clientes.
 *
 * Si el texto de un estado cambia, solo hay que editarlo aquí
 * y el cambio se propaga automáticamente a toda la app.
 */

// ── Identificadores de estado ─────────────────────────────────────────────────
export const ESTADO_RELEVADO          = '1 - Cliente relevado';
export const ESTADO_VISITADO_NO_ACTIVO = '2 - Local Visitado No Activo';
export const ESTADO_PRIMER_INGRESO    = '3 - Primer Ingreso';
export const ESTADO_LOCAL_CREADO      = '4 - Local Creado';
export const ESTADO_ACTIVO            = '5 - Local Visitado Activo';
export const ESTADO_NO_INTERESADO     = '6 - Local No Interesado';

/** Lista ordenada de todos los estados posibles. */
export const ESTADOS_LISTA = [
    ESTADO_RELEVADO,
    ESTADO_VISITADO_NO_ACTIVO,
    ESTADO_PRIMER_INGRESO,
    ESTADO_LOCAL_CREADO,
    ESTADO_ACTIVO,
    ESTADO_NO_INTERESADO,
] as const;

export type EstadoCliente = typeof ESTADOS_LISTA[number];

// ── Predicados de conveniencia ────────────────────────────────────────────────
/** Devuelve true si el estado corresponde a un local creado o activo (4 o 5). */
export const esEstadoFinal = (estado?: string | null): boolean =>
    estado?.startsWith('4') || estado?.startsWith('5') ? true : false;

/** Devuelve true si el estado corresponde a un local activo (5). */
export const esEstadoActivo = (estado?: string | null): boolean =>
    estado?.startsWith('5') ? true : false;

// ── Situaciones ───────────────────────────────────────────────────────────────
export const SITUACION_SIN_COMUNICACION = 'sin comunicacion nueva';
export const SITUACION_EN_PROCESO       = 'en proceso';
export const SITUACION_FUNCIONANDO      = 'en funcionamiento';

export const SITUACIONES_LISTA = [
    SITUACION_SIN_COMUNICACION,
    SITUACION_EN_PROCESO,
    SITUACION_FUNCIONANDO,
] as const;

// ── Estado por defecto al crear un cliente ────────────────────────────────────
export const ESTADO_DEFAULT = ESTADO_RELEVADO;
export const SITUACION_DEFAULT = SITUACION_SIN_COMUNICACION;
