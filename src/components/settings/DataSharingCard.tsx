'use client';

import { useState } from 'react';
import Card from '@/components/ui/Card';
import { InfoCircle } from 'iconoir-react';

interface DataSharingCardProps {
  isEnabled?: boolean;
  onToggle?: (enabled: boolean) => void;
}

export default function DataSharingCard({ isEnabled = true, onToggle }: DataSharingCardProps) {
  const [enabled, setEnabled] = useState(isEnabled);

  const handleToggle = () => {
    const newValue = !enabled;
    setEnabled(newValue);
    onToggle?.(newValue);
  };

  return (
    <Card title="Data Sharing" showActions={false}>
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0">
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
          onClick={handleToggle}
          className="px-4 py-2 rounded-full text-body font-semibold transition-opacity hover:opacity-90 flex-shrink-0"
          style={{ 
            backgroundColor: enabled ? '#282828' : '#282828',
            color: '#E7E4E4'
          }}
        >
          {enabled ? 'Disable' : 'Enable'}
        </button>
      </div>
    </Card>
  );
}

