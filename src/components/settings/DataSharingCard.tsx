'use client';

import { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import { InfoCircle } from 'iconoir-react';

interface DataSharingCardProps {
  isEnabled?: boolean;
  onToggle?: (enabled: boolean) => void;
  loading?: boolean;
}

export default function DataSharingCard({ isEnabled = true, onToggle, loading = false }: DataSharingCardProps) {
  const [enabled, setEnabled] = useState(isEnabled);
  useEffect(() => {
    setEnabled(isEnabled);
  }, [isEnabled]);

  const handleToggle = () => {
    const newValue = !enabled;
    setEnabled(newValue);
    onToggle?.(newValue);
  };

  if (loading) {
    return (
      <Card title="Data Sharing" showActions={false}>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="w-6 h-6 rounded shrink-0 animate-pulse" style={{ backgroundColor: '#3a3a3a' }} />
            <div className="h-4 flex-1 max-w-full rounded animate-pulse" style={{ backgroundColor: '#3a3a3a' }} />
            <div className="relative w-12 h-6 rounded-full shrink-0 animate-pulse" style={{ backgroundColor: '#3a3a3a' }} />
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card title="Data Sharing" showActions={false}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <div className="shrink-0">
            <InfoCircle
              width={24}
              height={24}
              strokeWidth={1.5}
              style={{ color: '#B9B9B9' }}
            />
          </div>
          <p className="flex-1 text-body" style={{ color: '#E7E4E4' }}>
            Help us improve by allowing your anonymized data to be used for statistical and demographic insights.
          </p>
          <button
            type="button"
            onClick={handleToggle}
            className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer shrink-0 ${
              enabled ? 'bg-[var(--accent-purple)]' : 'bg-[rgba(231,228,228,0.3)]'
            }`}
            aria-label={enabled ? 'Disable data sharing' : 'Enable data sharing'}
          >
            <div
              className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 ease-in-out ${
                enabled ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>
    </Card>
  );
}



