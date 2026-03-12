import React, { forwardRef, ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'text' | 'action' | 'icon';
    isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
    children,
    variant = 'primary',
    className,
    isLoading,
    disabled,
    ...props
}, ref) => {
    const baseClass = 'btn';
    const variantClass = {
        primary: 'btn-primario',
        secondary: 'btn-secundario',
        outline: 'btn-outline',
        danger: 'btn-danger',
        text: 'btn-text',
        action: 'action-btn',
        icon: 'btn-icon',
    }[variant];

    return (
        <button
            ref={ref}
            className={clsx(baseClass, variantClass, className)}
            disabled={isLoading || disabled}
            {...props}
        >
            {isLoading ? <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> : children}
        </button>
    );
});

Button.displayName = 'Button';
