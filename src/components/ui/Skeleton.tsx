import clsx from 'clsx';
import { HTMLAttributes } from 'react';

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
    className?: string;
}

export function Skeleton({ className, style, ...props }: SkeletonProps) {
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
