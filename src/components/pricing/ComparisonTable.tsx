'use client';

import { Check, Xmark } from 'iconoir-react';
import { comparisonFeatures } from '@/lib/pricingData';

export default function ComparisonTable() {
  const renderCell = (value: string | boolean) => {
    if (typeof value === 'boolean') {
      return (
        <div className="flex items-center justify-center">
          {value ? (
            <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--accent-green)' }}>
              <Check width={16} height={16} strokeWidth={2} style={{ color: '#fff' }} />
            </div>
          ) : (
            <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: '#D93F3F' }}>
              <Xmark width={16} height={16} strokeWidth={2} style={{ color: '#fff' }} />
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="text-center">
        <span className="text-body">{value}</span>
      </div>
    );
  };

  return (
    <div className="card-surface flex flex-col gap-6">
      <h2 className="text-card-header">Features Comparison</h2>
      
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-left text-body font-semibold pb-4 pr-6" style={{ color: 'var(--text-primary)' }}>
                Feature
              </th>
              <th className="text-center text-body font-semibold pb-4 px-4" style={{ color: 'var(--text-primary)' }}>
                Basic Plan
              </th>
              <th className="text-center text-body font-semibold pb-4 px-4" style={{ color: 'var(--text-primary)' }}>
                Premium Plan
              </th>
              <th className="text-center text-body font-semibold pb-4 px-4" style={{ color: 'var(--text-primary)' }}>
                Ultimate Plan
              </th>
            </tr>
          </thead>
          <tbody>
            {comparisonFeatures.map((feature, index) => (
              <tr
                key={index}
                className={index < comparisonFeatures.length - 1 ? 'border-b' : ''}
                style={{ borderColor: '#393939' }}
              >
                <td className="py-4 pr-6">
                  <span className="text-body">{feature.name}</span>
                </td>
                <td className="py-4 px-4">{renderCell(feature.basic)}</td>
                <td className="py-4 px-4">{renderCell(feature.premium)}</td>
                <td className="py-4 px-4">{renderCell(feature.ultimate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

