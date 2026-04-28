import React from 'react';

interface MapStatsBadgeProps {
    inView: number;
    total: number;
    label?: string;
    totalLabel?: string;
    children?: React.ReactNode;
}

/**
 * MapStatsBadge
 * Floating badge for the top right corner of the map.
 * Displays "In View" vs "Total" metrics.
 */
export const MapStatsBadge: React.FC<MapStatsBadgeProps> = ({ inView, total, label = "en zona", totalLabel = "Total", children }) => {
    return (
        <div 
            className="map-glass-badge"
            style={{
                position: 'absolute', top: '20px', right: '20px', zIndex: 1000,
                padding: '12px 18px', borderRadius: '18px',
                display: 'flex', alignItems: 'center', gap: '12px'
            }}
        >
            {children ? children : (
                <>
                    <div className="map-status-dot" style={{ background: '#10b981', boxShadow: '0 0 10px #10b981' }}></div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>{inView} {label}</span>
                        <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>{totalLabel}: {total}</span>
                    </div>
                </>
            )}
        </div>
    );
};
