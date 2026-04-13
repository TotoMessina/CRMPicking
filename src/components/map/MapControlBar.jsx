import React from 'react';

/**
 * MapControlBar
 * Reusable bottom control bar for immersive map dashboards.
 * Supports horizontal scrolling on mobile and glassmorphism styling.
 */
export const MapControlBar = ({ children, isMobile }) => {
    return (
        <div style={{
            height: isMobile ? 'auto' : '80px', 
            width: '100%', 
            background: 'var(--bg-elevated)',
            borderTop: '1px solid var(--border)', 
            display: 'flex', 
            alignItems: 'center',
            justifyContent: 'flex-start',
            padding: isMobile ? '12px' : '0 20px', 
            zIndex: 1002,
            overflow: 'hidden'
        }}>
            <div 
                className="bottom-bar-scroll"
                style={{ 
                    display: 'flex', 
                    gap: '12px', 
                    alignItems: 'center', 
                    overflowX: 'auto', 
                    width: '100%',
                    paddingBottom: isMobile ? '4px' : '0',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none'
                }}
            >
                {children}
            </div>
            
            <style tabIndex="-1">{`
                .bottom-bar-scroll::-webkit-scrollbar { display: none; }
            `}</style>
        </div>
    );
};
