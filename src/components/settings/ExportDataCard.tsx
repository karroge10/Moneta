'use client';

import { useState } from 'react';
import Card from '@/components/ui/Card';
import { Download } from 'iconoir-react';
import { ToastContainer, type ToastType } from '@/components/ui/Toast';

interface ExportDataCardProps {
  loading?: boolean;
}

export default function ExportDataCard({ loading = false }: ExportDataCardProps) {
  const [exporting, setExporting] = useState(false);

  const handleExport = () => {
    setExporting(true);
    // Simulate export for demonstration
    setTimeout(() => {
      setExporting(false);
      // Let individual toast or handled internally if wanted, 
      // but standard is toast on page. We will just use a simple state change.
    }, 2000);
  };

  if (loading) {
    return (
      <Card title="Export Data" showActions={false}>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="w-6 h-6 rounded shrink-0 animate-pulse" style={{ backgroundColor: '#3a3a3a' }} />
            <div className="h-4 flex-1 max-w-[200px] rounded animate-pulse" style={{ backgroundColor: '#3a3a3a' }} />
            <div className="w-24 h-9 rounded-full shrink-0 animate-pulse" style={{ backgroundColor: '#3a3a3a' }} />
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card title="Export Data" showActions={false}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <div className="shrink-0">
            <Download
              width={24}
              height={24}
              strokeWidth={1.5}
              style={{ color: '#B9B9B9' }}
            />
          </div>
          <p className="flex-1 text-body" style={{ color: '#E7E4E4' }}>
            Download a copy of your data as a CSV file.
          </p>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className={`px-4 py-2 rounded-full text-body font-semibold transition-opacity shrink-0 flex items-center gap-2 ${
              exporting ? 'opacity-60 cursor-not-allowed' : 'hover:opacity-90 cursor-pointer'
            }`}
            style={{ backgroundColor: 'var(--accent-purple)', color: 'var(--text-primary)' }}
          >
            {exporting ? 'Exporting...' : 'Export Data'}
          </button>
        </div>
      </div>
    </Card>
  );
}
