import React, { createContext, useContext, useState, useRef, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle } from 'lucide-react';
import { Button } from '../components/ui/Button';

interface ConfirmOptions {
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'primary';
}

interface ConfirmContextType {
    confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export function ConfirmProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<{
        isOpen: boolean;
        title?: string;
        message: string;
        confirmText?: string;
        cancelText?: string;
        variant?: 'danger' | 'warning' | 'primary';
    }>({
        isOpen: false,
        message: '',
    });

    const resolverRef = useRef<((value: boolean) => void) | null>(null);

    const confirm = (options: ConfirmOptions): Promise<boolean> => {
        return new Promise<boolean>((resolve) => {
            setState({
                isOpen: true,
                title: options.title || 'Confirmar acción',
                message: options.message,
                confirmText: options.confirmText || 'Aceptar',
                cancelText: options.cancelText || 'Cancelar',
                variant: options.variant || 'danger',
            });
            resolverRef.current = resolve;
        });
    };

    const handleClose = (value: boolean) => {
        setState((prev) => ({ ...prev, isOpen: false }));
        if (resolverRef.current) {
            resolverRef.current(value);
            resolverRef.current = null;
        }
    };

    const confirmColor = state.variant === 'danger'
        ? { bg: '#fee2e2', color: '#991b1b', border: '#fecaca' }
        : state.variant === 'warning'
        ? { bg: '#fef3c7', color: '#92400e', border: '#fde68a' }
        : { bg: 'var(--color-primary-light, #e0f2fe)', color: 'var(--color-primary, #0284c7)', border: 'var(--color-primary-border, #bae6fd)' };

    return (
        <ConfirmContext.Provider value={{ confirm }}>
            {children}
            {state.isOpen && createPortal(
                <div className="modal is-open" onClick={() => handleClose(false)}>
                    <div className="modal-content" style={{ maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <AlertTriangle size={20} color={state.variant === 'danger' ? '#ef4444' : '#f59e0b'} />
                                <h3 style={{ margin: 0 }}>{state.title}</h3>
                            </div>
                            <button className="modal-close" type="button" onClick={() => handleClose(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <p style={{ margin: '0 0 24px 0', color: 'var(--text-muted, #64748b)', fontSize: '0.95rem', lineHeight: '1.5' }}>
                            {state.message}
                        </p>
                        <div className="modal-actions" style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <Button variant="secondary" type="button" onClick={() => handleClose(false)}>
                                {state.cancelText}
                            </Button>
                            <button
                                type="button"
                                onClick={() => handleClose(true)}
                                style={{
                                    padding: '8px 16px',
                                    background: confirmColor.bg,
                                    color: confirmColor.color,
                                    border: `1px solid ${confirmColor.border}`,
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontWeight: '500',
                                }}
                            >
                                {state.confirmText}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </ConfirmContext.Provider>
    );
}

export function useConfirm() {
    const context = useContext(ConfirmContext);
    if (!context) {
        throw new Error('useConfirm must be used within a ConfirmProvider');
    }
    return context.confirm;
}
