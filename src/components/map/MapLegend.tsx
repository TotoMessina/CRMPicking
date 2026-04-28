import React from 'react';
import { X } from 'lucide-react';

interface MapLegendItem {
    label: string;
    color: string;
}

interface MapLegendProps {
    items: MapLegendItem[];
    isMobile: boolean;
    showMobile: boolean;
    onCloseMobile: () => void;
    title?: string;
}

/**
 * MapLegend
 * Adaptive legend that floats on desktop and appears as a centered modal on mobile.
 */
export const MapLegend: React.FC<MapLegendProps> = ({ 
    items, 
    isMobile, 
    showMobile, 
    onCloseMobile, 
    title = "Referencia" 
}) => {
    if (isMobile && !showMobile) return null;

    return (
        <div style={{
            position: 'absolute', 
            bottom: isMobile ? '50%' : '100px', 
            left: isMobile ? '50%' : '20px',
            transform: isMobile ? 'translate(-50%, 50%)' : 'none',
            zIndex: 1010,
            background: 'var(--bg-glass)', backdropFilter: 'blur(16px)',
            padding: '18px', borderRadius: '24px', border: '1px solid var(--border)',
            width: isMobile ? 'min(320px, 90vw)' : '220px', 
            maxHeight: isMobile ? '60vh' : 'auto',
            overflowY: 'auto',
            display: 'flex', flexWrap: 'wrap', gap: '8px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
            animation: 'fadeIn 0.3s ease'
        }}>
            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontWeight: 800 }}>{title}</span>
                {isMobile && (
                    <button 
                        onClick={onCloseMobile} 
                        style={{ background: 'transparent', border: 'none', color: 'var(--text)' }}
                    >
                        <X size={18} />
                    </button>
                )}
            </div>
            
            {items.map(item => (
                <div
                    key={item.label}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '6px 12px', background: 'var(--bg-elevated)',
                        borderRadius: '12px', border: '1px solid var(--border)',
                        fontSize: '0.8rem', fontWeight: 600, flexShrink: 0
                    }}
                >
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: item.color }}></div>
                    {item.label}
                </div>
            ))}
            
            <style tabIndex={-1}>{`
                @keyframes fadeIn { 
                    from { opacity: 0; transform: ${isMobile ? 'translate(-50%, 60%)' : 'translateY(10px)'}; } 
                    to { opacity: 1; transform: ${isMobile ? 'translate(-50%, 50%)' : 'translateY(0)'}; } 
                }
            `}</style>
        </div>
    );
};
