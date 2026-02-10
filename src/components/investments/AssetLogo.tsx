'use client';

import React from 'react';
import { getIcon } from '@/lib/iconMapping';

interface AssetLogoProps {
    src?: string;
    size?: number;
    className?: string;
    style?: React.CSSProperties;
    fallback?: string;
}

export default function AssetLogo({ src, size = 20, className = "", style, fallback }: AssetLogoProps) {
    const [error, setError] = React.useState(false);

    if (!src) return null;

    const isUrl = src.startsWith('http') || src.startsWith('/');

    if (isUrl && !error) {
        return (
            <img
                src={src}
                alt="Asset Logo"
                style={{ width: size, height: size, ...style }}
                className={`rounded-full object-contain ${className}`}
                onError={() => setError(true)}
            />
        );
    }

    const Icon = getIcon(error && fallback ? fallback : src);
    return <Icon width={size} height={size} strokeWidth={1.5} className={className} style={style} />;
}
