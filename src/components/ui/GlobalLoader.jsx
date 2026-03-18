import React from 'react';
import { ShieldCheck } from 'lucide-react';

export function GlobalLoader() {
    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--bg)',
            zIndex: 9999,
            transition: 'opacity 0.3s ease'
        }}>
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '24px',
                padding: '40px',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: 'var(--bg-elevated)',
                boxShadow: 'var(--shadow-lg)',
                border: '1px solid var(--border)',
                maxWidth: '320px',
                width: '90%',
                position: 'relative',
                overflow: 'hidden'
            }}>
                {/* Icono con pulso */}
                <div style={{
                    color: 'var(--accent)',
                    animation: 'pulse-glow 2s infinite ease-in-out',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <ShieldCheck size={48} strokeWidth={1.5} />
                </div>

                {/* Texto con Shimmer */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px'
                }}>
                    <span style={{
                        fontSize: '1rem',
                        fontWeight: 600,
                        color: 'var(--text)',
                        background: 'linear-gradient(90deg, var(--text) 0%, var(--accent) 50%, var(--text) 100%)',
                        backgroundSize: '200% auto',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        animation: 'shimmer-text 3s infinite linear'
                    }}>
                        PickingUp CRM
                    </span>
                    <span style={{
                        fontSize: '0.8rem',
                        color: 'var(--text-muted)',
                        fontWeight: 400
                    }}>
                        Iniciando entorno seguro...
                    </span>
                </div>

                {/* Barra de progreso minimalista */}
                <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '3px',
                    backgroundColor: 'var(--accent-soft)',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        position: 'absolute',
                        height: '100%',
                        backgroundColor: 'var(--accent)',
                        width: '35%',
                        animation: 'progress-indeterminate 2.5s infinite cubic-bezier(0.1, 0.5, 0.5, 1)'
                    }} />
                </div>
            </div>
        </div>
    );
}
