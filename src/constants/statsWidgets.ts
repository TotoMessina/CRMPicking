// ==========================================
// REGISTRO DE WIDGETS DEL DASHBOARD
// Catálogo central de todos los widgets disponibles
// ==========================================

export interface WidgetDefinition {
    id: string;
    label: string;
    description: string;
    icon: string;
    defaultOrder: number;
    defaultVisible: boolean;
    /** Si es 'full', ocupa todo el ancho (col-12). Si es 'half', col-6. Si es 'third', col-4. */
    size: 'full' | 'half' | 'third';
}

export interface WidgetLayout {
    id: string;
    visible: boolean;
    order: number;
    size?: 'full' | 'half' | 'third';
}

export const WIDGET_CATALOG: WidgetDefinition[] = [
    {
        id: 'predictive_insights',
        label: 'Insights Predictivos',
        description: 'Churn, salud de la base, proyecciones',
        icon: '🔮',
        defaultOrder: 0,
        defaultVisible: true,
        size: 'full',
    },
    {
        id: 'kpi_cards',
        label: 'KPIs Clave',
        description: 'Clientes activos, agenda, vencidos, actividades',
        icon: '📊',
        defaultOrder: 1,
        defaultVisible: true,
        size: 'full',
    },
    {
        id: 'growth_chart',
        label: 'Crecimiento Diario',
        description: 'Alta de locales por día en el período',
        icon: '📈',
        defaultOrder: 2,
        defaultVisible: true,
        size: 'half',
    },
    {
        id: 'consumidores_chart',
        label: 'Evolución Consumidores',
        description: 'Nuevos consumidores registrados por día',
        icon: '🛒',
        defaultOrder: 3,
        defaultVisible: true,
        size: 'half',
    },
    {
        id: 'repartidores_chart',
        label: 'Evolución Repartidores',
        description: 'Nuevos repartidores registrados por día',
        icon: '🚚',
        defaultOrder: 4,
        defaultVisible: true,
        size: 'half',
    },
    {
        id: 'rubros_donut',
        label: 'Distribución Rubros',
        description: 'Proporción de clientes por rubro',
        icon: '🎯',
        defaultOrder: 5,
        defaultVisible: true,
        size: 'half',
    },
    {
        id: 'estados_donut',
        label: 'Distribución Estados',
        description: 'Proporción de clientes por estado',
        icon: '🏷️',
        defaultOrder: 6,
        defaultVisible: true,
        size: 'half',
    },
    {
        id: 'creadores_donut',
        label: 'Altas por Activador',
        description: 'Clientes creados por cada activador',
        icon: '⚡',
        defaultOrder: 7,
        defaultVisible: true,
        size: 'half',
    },
    {
        id: 'integrity_audit',
        label: 'Auditoría de Integridad',
        description: 'Sin geocoordenadas, contacto o rubro',
        icon: '🛡️',
        defaultOrder: 8,
        defaultVisible: true,
        size: 'full',
    },
    {
        id: 'geo_heatmap',
        label: 'Densidad Geográfica',
        description: 'Mapa de calor de clientes en el territorio',
        icon: '🗺️',
        defaultOrder: 9,
        defaultVisible: true,
        size: 'full',
    },
    {
        id: 'situacion_chart',
        label: 'Situación Estado 5',
        description: 'Distribución operativa de locales activos',
        icon: '📍',
        defaultOrder: 10,
        defaultVisible: true,
        size: 'full',
    },
    {
        id: 'rubros_estado5',
        label: 'Rubros por Situación',
        description: 'Rubros de locales en estado activo',
        icon: '🔍',
        defaultOrder: 11,
        defaultVisible: true,
        size: 'full',
    },
];

/** Genera el layout por defecto a partir del catálogo */
export const DEFAULT_LAYOUT: WidgetLayout[] = WIDGET_CATALOG.map(w => ({
    id: w.id,
    visible: w.defaultVisible,
    order: w.defaultOrder,
    size: w.size,
}));

/** Obtiene la definición de un widget por su id */
export const getWidgetDef = (id: string): WidgetDefinition | undefined =>
    WIDGET_CATALOG.find(w => w.id === id);
