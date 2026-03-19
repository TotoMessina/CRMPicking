import React from 'react';
import { AlertCircle } from 'lucide-react';

export const FieldError: React.FC<{ msg?: string }> = ({ msg }) => {
    if (!msg) return null;
    return (
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--danger, #ef4444)', fontSize: '0.78rem', marginTop: '4px' }}>
            <AlertCircle size={13} /> {msg}
        </span>
    );
}
