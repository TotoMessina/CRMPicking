/**
 * Listado oficial de rubros y estados de contacto de la aplicación para el módulo de llamadas y clientes.
 */

export const RUBROS_APP = [
    'Accesorios',
    'Almacén',
    'Artesanía',
    'Artículos de Limpieza',
    'Autoservicios',
    'Carnicería',
    'Computación',
    'Cotillón',
    'Dietética',
    'Gastronomía',
    'Heladería',
    'Juguetería',
    'Kiosco',
    'Kiosco con Almacén',
    'Kiosco Librería',
    'Librería',
    'Pañalera',
    'Pastelería',
    'Papelera',
    'Perfumería',
    'Verdulería',
    'Vinoteca',
    'Sin comercio',
] as const;

export type RubroApp = typeof RUBROS_APP[number];

export const ESTADOS_CONTACTO = [
    'Contacto Latente',
    'Primer ingreso',
    'Usuario con tienda no configurada',
    'Usuario con tienda configurada',
] as const;

export type EstadoContacto = typeof ESTADOS_CONTACTO[number];
