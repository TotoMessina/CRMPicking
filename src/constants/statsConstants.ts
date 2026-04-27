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
        primary: '#0c0c0c',
        secondary: '#10b981',
        accent: '#f59e0b',
        danger: '#ef4444',
        info: '#0c0c0c',
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
    layout: { padding: { top: 24 } },
    scales: {
        x: {
            grid: { display: false },
            ticks: { color: STATS_THEME.colors.text, font: { family: STATS_THEME.fontFamily, size: 10 } },
            border: { display: false }
        },
        y: {
            grid: { display: false },
            ticks: { display: false },
            border: { display: false }
        }
    }
};

export const barValueLabelPlugin: any = {
    id: 'barValueLabel',
    afterDatasetsDraw(chart: any) {
        if (chart.config.type !== 'bar') return;
        const { ctx, data } = chart;
        
        ctx.save();
        chart.getDatasetMeta(0).data.forEach((bar: any, index: number) => {
            const value = data.datasets[0].data[index];
            if (!value) return;
            
            ctx.font = 'bold 12px "Inter", "system-ui", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            const txt = value.toString();
            const barHeight = bar.base - bar.y;
            const isTallEnough = barHeight > 24;
            
            const x = bar.x;
            const y = isTallEnough ? bar.y + 14 : bar.y - 12;
            
            const paddingX = 6;
            const paddingY = 4;
            const textWidth = ctx.measureText(txt).width;
            
            // Extract bar color safely
            let rawColor = data.datasets[0].backgroundColor;
            if (Array.isArray(rawColor)) rawColor = rawColor[index] || rawColor[0];
            const fallbackColor = typeof rawColor === 'string' ? rawColor : '#0c0c0c';
            
            const hexToRgb = (hex: string) => {
                if (!hex.startsWith('#')) return '12, 12, 12';
                return `${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)}`;
            };
            
            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(x - (textWidth / 2) - paddingX, y - paddingY - 6, textWidth + (paddingX * 2), 12 + (paddingY * 2), 6);
            } else {
                ctx.rect(x - (textWidth / 2) - paddingX, y - paddingY - 6, textWidth + (paddingX * 2), 12 + (paddingY * 2));
            }
            
            ctx.fillStyle = isTallEnough ? 'rgba(255, 255, 255, 0.25)' : `rgba(${hexToRgb(fallbackColor)}, 0.15)`;
            ctx.fill();
            
            ctx.fillStyle = isTallEnough ? '#ffffff' : fallbackColor;
            ctx.fillText(txt, x, y);
        });
        ctx.restore();
    }
};

export const DOUGHNUT_COLORS: string[] = [
    STATS_THEME.colors.primary, 
    STATS_THEME.colors.secondary, 
    STATS_THEME.colors.accent,
    STATS_THEME.colors.info, 
    STATS_THEME.colors.danger, 
    '#1a1a1a', 
    '#ec4899', 
    '#334155'
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
