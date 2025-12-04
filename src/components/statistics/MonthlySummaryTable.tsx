'use client';

import Card from '@/components/ui/Card';
import { formatNumber } from '@/lib/utils';
import { MonthlySummaryRow } from '@/types/dashboard';
import ComingSoonBadge from '@/components/ui/ComingSoonBadge';
import { useCurrency } from '@/hooks/useCurrency';

interface MonthlySummaryTableProps {
  data: MonthlySummaryRow[];
}

export default function MonthlySummaryTable({ data }: MonthlySummaryTableProps) {
  const { currency } = useCurrency();
  // Calculate max height to show exactly 6 rows
  // Each row: ~48px (py-3 = 12px top + 12px bottom + text ~24px)
  // 6 rows: 6 * 48px = 288px
  const maxHeight = '288px';
  const isEmpty = data.length === 0;
  
  return (
    <Card 
      title="Monthly Summary" 
      customHeader={
        isEmpty ? (
          <div className="mb-4 flex items-center gap-3">
            <h2 className="text-card-header">Monthly Summary</h2>
            <ComingSoonBadge />
          </div>
        ) : undefined
      }
      showActions={false}
    >
      {isEmpty ? (
        <div className="flex flex-col flex-1 mt-2 justify-center items-center py-8" style={{ filter: 'blur(2px)' }}>
          <div className="text-body text-center mb-2 opacity-70">Add transactions to see monthly summaries</div>
          <div className="text-helper text-center">Monthly breakdowns will appear here</div>
        </div>
      ) : (
        <div className="mt-2">
          <div className="overflow-hidden">
            <table className="w-full table-fixed">
              <colgroup>
                <col style={{ width: '20%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '20%' }} />
              </colgroup>
              <thead>
                <tr style={{ backgroundColor: '#202020' }}>
                  <th 
                    className="text-center text-helper font-semibold py-3 px-2"
                    style={{ 
                      backgroundColor: '#202020',
                      borderRadius: '10px 0 0 10px'
                    }}
                  >
                    Month
                  </th>
                  <th 
                    className="text-center text-helper font-semibold py-3 px-2"
                    style={{ backgroundColor: '#202020' }}
                  >
                    Income
                  </th>
                  <th 
                    className="text-center text-helper font-semibold py-3 px-2"
                    style={{ backgroundColor: '#202020' }}
                  >
                    Expenses
                  </th>
                  <th 
                    className="text-center text-helper font-semibold py-3 px-2"
                    style={{ backgroundColor: '#202020' }}
                  >
                    Savings
                  </th>
                  <th 
                    className="text-center text-helper font-semibold py-3 px-2"
                    style={{ 
                      backgroundColor: '#202020',
                      borderRadius: '0 10px 10px 0'
                    }}
                  >
                    Top Category
                  </th>
                </tr>
              </thead>
            </table>
          </div>
          <div className="overflow-y-auto custom-scrollbar pr-2" style={{ maxHeight }}>
            <table className="w-full table-fixed">
              <colgroup>
                <col style={{ width: '20%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '20%' }} />
              </colgroup>
              <tbody>
                {data.map((row, index) => (
                  <tr
                    key={index}
                    className="border-b hover:opacity-80 transition-opacity"
                    style={{ borderColor: 'rgba(231, 228, 228, 0.05)' }}
                  >
                  <td className="text-body text-center py-3 px-2">{row.month}</td>
                  <td className="text-body text-center py-3 px-2">{currency.symbol} {formatNumber(row.income)}</td>
                  <td className="text-body text-center py-3 px-2">{currency.symbol} {formatNumber(row.expenses)}</td>
                  <td className="text-body text-center py-3 px-2">{currency.symbol} {formatNumber(row.savings)}</td>
                    <td className="text-body text-center py-3 px-2">
                      {row.topCategory.name} ({row.topCategory.percentage}%)
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Card>
  );
}

