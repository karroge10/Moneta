'use client';

import React from 'react';
import { getIcon } from '@/lib/iconMapping';

interface AssetLogoProps {
    src?: string;
    size?: number;
    className?: string;
    style?: React.CSSProperties;
}

export default function AssetLogo({ src, size = 20, className = "", style }: AssetLogoProps) {
    if (!src) return null;

    const isUrl = src.startsWith('http') || src.startsWith('/');

    if (isUrl) {
        return (
            <img
                src={src}
                alt="Asset Logo"
                style={{ width: size, height: size, ...style }}
                className={`rounded-full object-contain ${className}`}
                onError={(e) => {
                    // Fallback to a placeholder or icon if image fails
                    (e.target as HTMLImageElement).style.display = 'none';
                }}
            />
        );
    }

    const Icon = getIcon(src);
    return <Icon width={size} height={size} strokeWidth={1.5} className={className} style={style} />;
}
