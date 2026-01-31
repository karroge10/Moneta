'use client';

import { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';

interface TaxSettingsCardProps {
  incomeTaxRate: number | null;
  onUpdate: (incomeTaxRate: number | null) => void;
}

export default function TaxSettingsCard({ incomeTaxRate, onUpdate }: TaxSettingsCardProps) {
  const enabled = incomeTaxRate !== null;
  const [rateInput, setRateInput] = useState(
    incomeTaxRate !== null ? String(incomeTaxRate) : ''
  );

  useEffect(() => {
    if (incomeTaxRate !== null) {
      setRateInput(String(incomeTaxRate));
    } else {
      setRateInput('');
    }
  }, [incomeTaxRate]);

  const handleToggle = () => {
    if (enabled) {
      onUpdate(null);
    } else {
      onUpdate(0);
    }
  };

  const handleBlur = () => {
    if (rateInput === '') {
      if (enabled) {
        onUpdate(0);
        setRateInput('0');
      }
      return;
    }
    const num = Number(rateInput);
    if (Number.isNaN(num) || num < 0) {
      onUpdate(0);
      setRateInput('0');
    } else if (num > 100) {
      onUpdate(100);
      setRateInput('100');
    } else {
      onUpdate(num);
    }
  };

  return (
    <Card title="Tax Settings" showActions={false}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <span className="text-body" style={{ color: '#E7E4E4' }}>
            Enable tax estimation
          </span>
          <button
            onClick={handleToggle}
            className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer flex-shrink-0 ${
              enabled ? 'bg-[var(--accent-purple)]' : 'bg-[rgba(231,228,228,0.3)]'
            }`}
            aria-label="Toggle tax estimation"
          >
            <div
              className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 ease-in-out ${
                enabled ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {enabled && (
          <div className="flex flex-col gap-2">
            <label htmlFor="income-tax-rate" className="text-body" style={{ color: '#E7E4E4' }}>
              Income tax rate (%)
            </label>
            <input
              id="income-tax-rate"
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={rateInput}
              onChange={(e) => setRateInput(e.target.value)}
              onBlur={handleBlur}
              className="px-4 py-3 rounded-lg text-body w-full max-w-[140px] border border-[#3a3a3a]"
              style={{
                backgroundColor: '#202020',
                color: '#E7E4E4',
              }}
              aria-label="Income tax rate percentage"
            />
            <p className="text-helper" style={{ color: 'rgba(231, 228, 228, 0.7)' }}>
              Enter your estimated income tax rate (0–100%). Used to show estimated tax on the Income page.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
