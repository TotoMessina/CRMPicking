import React from 'react';
import { motion } from 'framer-motion';

interface Props {
    value: number;
    size?: number;
    strokeWidth?: number;
    color?: string;
    backgroundColor?: string;
    showText?: boolean;
}

export const CircularProgress: React.FC<Props> = ({
    value,
    size = 60,
    strokeWidth = 6,
    color = '#4f46e5',
    backgroundColor = 'rgba(0,0,0,0.1)',
    showText = true
}) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (value / 100) * circumference;

    return (
        <div style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                {/* Background Circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={backgroundColor}
                    strokeWidth={strokeWidth}
                    fill="transparent"
                />
                {/* Progress Circle */}
                <motion.circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={color}
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: offset }}
                    transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
                    strokeLinecap="round"
                />
            </svg>
            {showText && (
                <div style={{ position: 'absolute', fontSize: `${size / 4.5}px`, fontWeight: 800, color: 'var(--text)' }}>
                    {Math.round(value)}%
                </div>
            )}
        </div>
    );
};
