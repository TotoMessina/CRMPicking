import L from 'leaflet';

// Colors of colors by state for AsignadorRutas
export const ESTADOS_COLORES: Record<string, { badge: string; badgeBg: string; pin: string }> = {
    'Pendiente': { badge: '#f59e0b', badgeBg: 'rgba(245,158,11,0.15)', pin: '#f59e0b' },
    'Visitado':  { badge: '#10b981', badgeBg: 'rgba(16,185,129,0.15)', pin: '#10b981' },
    'Ausente':   { badge: '#ef4444', badgeBg: 'rgba(239,68,68,0.12)', pin: '#ef4444' },
    'Cancelado': { badge: '#64748b', badgeBg: 'rgba(100,116,139,0.12)', pin: '#64748b' },
};

/**
 * Generates a premium numbered pin icon
 */
export const makeNumberedIcon = (num: number, color: string, done: boolean, isRisk: boolean): L.DivIcon => {
    return L.divIcon({
        className: '',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
        html: `<div style="
            width:32px;height:32px;border-radius:50% 50% 50% 0;
            transform:rotate(-45deg);
            background:${done ? '#64748b' : color};
            border: 2.5px solid ${isRisk ? '#f87171' : 'white'};
            box-shadow: 0 4px 10px rgba(0,0,0,0.3);
            display:flex;align-items:center;justify-content:center;
        ">
            <span style="transform:rotate(45deg);color:white;font-weight:900;font-size:12px;">${num}</span>
        </div>`
    });
};

/**
 * Generates a simple small numbered black circle icon for scheduled routes
 */
export const makeSimpleNumberedIcon = (num: number): L.DivIcon => {
    return L.divIcon({
        className: 'custom-marker scheduled',
        html: `<div style="background: #0c0c0c; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; color: white; font-size: 8px; font-weight: 800; box-shadow: var(--shadow-md);">${num}</div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7]
    });
};

/**
 * Generates an icon with a ping animation for the current selected candidate
 */
export const makeCurrentClientIcon = (): L.DivIcon => {
    return L.divIcon({
        className: 'custom-marker current',
        html: `<div style="position: relative; width: 24px; height: 24px;"><div style="position: absolute; inset: 0; background: #0c0c0c; border-radius: 50%; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite; opacity: 0.75;"></div><div style="position: relative; background: #0c0c0c; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 15px rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; color: white;"><span style="font-size: 10px; font-weight: 900;">★</span></div></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });
};

/**
 * Calculates the Haversine distance between two coordinates in kilometers
 */
export const getDistance = (
    lat1: number | undefined,
    lon1: number | undefined,
    lat2: number | undefined,
    lon2: number | undefined
): number => {
    if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) return 0;
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};
