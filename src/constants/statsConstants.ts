/**
 * Constantes para el diseño y configuración de gráficos (Chart.js)
 */

export interface StatsTheme {
    colors: {
        primary: string;
        secondary: string;
        accent: string;
        danger: string;
        info: string;
        slate: string;
        grid: string;
        text: string;
    };
    fontFamily: string;
}

export const STATS_THEME: StatsTheme = {
    colors: {
        primary: '#4f46e5',
        secondary: '#10b981',
        accent: '#f59e0b',
        danger: '#ef4444',
        info: '#3b82f6',
        slate: '#475569',
        grid: 'rgba(255, 255, 255, 0.05)',
        text: '#94a3b8',
    },
    fontFamily: "'Inter', sans-serif",
};

export const COMMON_CHART_OPTIONS: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            labels: {
                color: STATS_THEME.colors.text,
                font: { family: STATS_THEME.fontFamily, size: 12 },
                usePointStyle: true,
                boxWidth: 8,
            }
        },
        tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            titleColor: '#fff',
            bodyColor: '#cbd5e1',
            borderColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1,
            padding: 10,
            cornerRadius: 8,
            displayColors: true,
            usePointStyle: true,
        }
    },
    scales: {
        x: {
            grid: { display: false },
            ticks: { color: STATS_THEME.colors.text, font: { family: STATS_THEME.fontFamily, size: 10 } }
        },
        y: {
            grid: { color: STATS_THEME.colors.grid, borderDash: [4, 4] },
            ticks: { color: STATS_THEME.colors.text, font: { family: STATS_THEME.fontFamily, size: 10 }, beginAtZero: true }
        }
    }
};

export const DOUGHNUT_COLORS: string[] = [
    STATS_THEME.colors.primary, 
    STATS_THEME.colors.secondary, 
    STATS_THEME.colors.accent,
    STATS_THEME.colors.info, 
    STATS_THEME.colors.danger, 
    '#8b5cf6', 
    '#ec4899', 
    '#6366f1'
];

export const STATUS_COLORS: Record<string, string> = {
    "1 - Cliente relevado": STATS_THEME.colors.slate,
    "2 - Local Visitado No Activo": STATS_THEME.colors.danger,
    "3 - Primer Ingreso": STATS_THEME.colors.accent,
    "4 - Local Creado": STATS_THEME.colors.secondary,
    "5 - Local Visitado Activo": STATS_THEME.colors.info,
    "6 - Local No Interesado": "#ef4444",
    "Sin estado": "#cbd5e1"
};
