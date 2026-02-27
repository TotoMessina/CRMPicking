import clsx from 'clsx';

export function Skeleton({ className, style, ...props }) {
    return (
        <div
            className={clsx('skeleton', className)}
            style={{
                borderRadius: 'var(--radius-md)',
                ...style
            }}
            {...props}
        />
    );
}
