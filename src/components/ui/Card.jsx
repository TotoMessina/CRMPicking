import clsx from 'clsx';

export function Card({ children, className, ...props }) {
    return (
        <div className={clsx('card', className)} {...props}>
            {children}
        </div>
    );
}

export function CardHeader({ children, className, ...props }) {
    return (
        <div className={clsx('card-header', className)} {...props}>
            {children}
        </div>
    );
}

export function CardBody({ children, className, ...props }) {
    return (
        <div className={clsx('card-body', className)} {...props}>
            {children}
        </div>
    );
}

export function BentoCard({
    title,
    stat,
    icon,
    desc,
    className,
    isPrimary,
    variant, // enum: 'default', 'gradient-purple', 'gradient-green', 'gradient-blue', 'gradient-orange', 'dark'
    actionIcon,
    children,
    ...props
}) {
    // Generates a dynamic class based on the variant prop
    const variantClass = variant ? `bento-${variant}` : '';

    return (
        <div className={clsx('bento-card', isPrimary && 'card-primary', variantClass, className)} {...props}>
            {icon && <div className={clsx('bento-icon', variant && 'variant-icon')}>{icon}</div>}
            {title && <div className={clsx('bento-title', variant && 'variant-title')}>{title}</div>}

            {/* If simple stat layout */}
            {stat && !desc && <div className={clsx('bento-stat', variant && 'variant-stat')}>{stat}</div>}

            {/* If complex desc layout */}
            {desc && <p className={clsx('bento-desc', variant && 'variant-desc')}>{desc}</p>}

            {children}

            {/* Primary Action Button indicator */}
            {actionIcon && <button className="bento-action-btn">{actionIcon}</button>}
        </div>
    );
}
