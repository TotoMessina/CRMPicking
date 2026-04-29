import { Step } from 'react-joyride';

export interface CoqueTutorial {
    id: string;
    steps: Step[];
    groupToOpen?: string;
}

export const COQUE_TUTORIALS: CoqueTutorial[] = [
    {
        id: 'crear_cliente',
        groupToOpen: 'Activaciones',
        steps: [
            {
                target: '#nav-item-clientes',
                content: '¡Primero vamos a la sección de Clientes! 👥',
                placement: 'right',
            },
            {
                target: '#btn-nuevo-cliente',
                content: '¡Y ahora hacé clic acá en el botón de "+" para cargar uno nuevo! ➕',
                placement: 'top',
            },
            {
                target: 'body',
                content: 'Se va a abrir un formulario. Llená los datos, pineá la ubicación y ¡listo! 📍',
                placement: 'center',
            }
        ]
    },
    {
        id: 'modo_ruta',
        groupToOpen: 'Activaciones',
        steps: [
            {
                target: '#nav-item-ruta-de-hoy',
                content: 'Hacé clic acá para ver tu listado de visitas del día. 🚶‍♂️',
                placement: 'right',
            },
            {
                target: '.sidebar-ruta-btn',
                content: 'O podés activar el "Modo Ruta" acá abajo para que el sistema te siga con el GPS. 🛰️',
                placement: 'right',
            }
        ]
    },
    {
        id: 'tablero_tareas',
        groupToOpen: 'Planificación',
        steps: [
            {
                target: '#nav-item-tablero-tareas',
                content: 'Acá tenés tu tablero de tareas. ¡Vaciá tu cabeza acá para no olvidarte de nada! 📝',
                placement: 'right',
            }
        ]
    },
    {
        id: 'mapa_global',
        groupToOpen: 'Mapas',
        steps: [
            {
                target: '#nav-item-mapa-global',
                content: 'En esta sección podés ver a todos tus clientes geolocalizados en el mapa. 🗺️',
                placement: 'right',
            }
        ]
    }
];
