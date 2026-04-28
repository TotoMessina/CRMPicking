import { 
    MapPin, Users, Activity, Map, Settings, Calendar, Clock, 
    ShoppingCart, Truck, Ticket, Star, MessageCircle, LayoutDashboard, Building2, Shield, Database, Route, ClipboardList, Brain, LucideIcon
} from 'lucide-react';

export interface PageItem {
    to?: string;
    icon: LucideIcon;
    label: string;
    group: string;
    adminOnly?: boolean;
    superAdminOnly?: boolean;
    spacer?: boolean;
}

/**
 * MANIFIESTO CENTRAL DE PÁGINAS
 * Esta es la Única Fuente de Verdad para la navegación y los permisos.
 * Cualquier página agregada aquí aparecerá automáticamente en el Panel de Permisos.
 */
export const ALL_PAGES: PageItem[] = [
    // --- Grupo: Activaciones ---
    { to: '/', icon: MapPin, label: 'Inicio', group: 'Activaciones' },
    { to: '/chat', icon: MessageCircle, label: 'Chat Interno', group: 'Activaciones' },
    { to: '/clientes', icon: Activity, label: 'Clientes', group: 'Activaciones' },
    { to: '/pipeline', icon: Activity, label: 'Pipeline', group: 'Activaciones' },
    { to: '/ruta', icon: Route, label: 'Ruta de Hoy', group: 'Activaciones' },
    { to: '/historial', icon: Clock, label: 'Buscador Historial', group: 'Activaciones' },
    { to: '/asignador-rutas', icon: ClipboardList, label: 'Asignador de Rutas', group: 'Activaciones', adminOnly: true },

    // --- Grupo: Operaciones ---
    { to: '/consumidores', icon: Users, label: 'Consumidores', group: 'Operaciones' },
    { to: '/repartidores', icon: Truck, label: 'Repartidores', group: 'Operaciones' },
    { to: '/proveedores', icon: ShoppingCart, label: 'Proveedores', group: 'Operaciones' },

    // --- Grupo: Planificación ---
    { to: '/calendario', icon: Calendar, label: 'Calendario', group: 'Planificación' },
    { to: '/horarios', icon: Clock, label: 'Horarios', group: 'Planificación' },
    { to: '/tablero', icon: LayoutDashboard, label: 'Tablero Tareas', group: 'Planificación' },

    // --- Grupo: Mapas ---
    { to: '/mapa', icon: Map, label: 'Mapa Clientes', group: 'Mapas' },
    { to: '/mapa-repartidores', icon: Map, label: 'Mapa Repartidores', group: 'Mapas' },
    { to: '/mapa-consumidores', icon: Map, label: 'Mapa Consumidores', group: 'Mapas' },
    { to: '/mapa-global', icon: Map, label: 'Mapa Global', group: 'Mapas' },

    // --- Grupo: Listados ---
    { to: '/estadisticas', icon: Activity, label: 'Estadísticas', group: 'Listados' },
    { to: '/tickets', icon: Ticket, label: 'Tickets', group: 'Listados' },

    // --- Grupo: Administrativo ---
    { to: '/usuarios', icon: Users, label: 'Usuarios', group: 'Administrativo' },
    { to: '/empresas', icon: Building2, label: 'Empresas', group: 'Administrativo', adminOnly: true },
    { to: '/super-admin', icon: Shield, label: 'Panel Súper-Admin', group: 'Administrativo', superAdminOnly: true },
    { to: '/permisos-empresa', icon: Shield, label: 'Permisos', group: 'Administrativo' },
    { to: '/actividad-sistema', icon: Database, label: 'Auditoría', group: 'Administrativo' },
    { to: '/ia-interna', icon: Brain, label: 'Radar Predictivo (IA)', group: 'Activaciones' },
    { to: '/swipe-prospecting', icon: Star, label: 'Prospecteo Tinder', group: 'Activaciones' },
    { to: '/configuracion', icon: Settings, label: 'Configuración', group: 'Administrativo' },
];

export const GROUPS = [
    'Activaciones',
    'Operaciones',
    'Planificación',
    'Mapas',
    'Listados',
    'Administrativo'
];
