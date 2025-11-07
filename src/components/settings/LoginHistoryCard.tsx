'use client';

import Card from '@/components/ui/Card';
import { LoginHistoryEntry } from '@/types/dashboard';

interface LoginHistoryCardProps {
  history: LoginHistoryEntry[];
}

export default function LoginHistoryCard({ history }: LoginHistoryCardProps) {
  // Calculate max height to show exactly 4 rows
  // Each row: ~48px (py-3 = 12px top + 12px bottom + text ~24px)
  // 4 rows: 4 * 48px = 192px
  const maxHeight = '192px';
  
  return (
    <Card title="Login History" showActions={false}>
      <div className="mt-2">
        <div className="overflow-hidden">
          <table className="w-full table-fixed">
            <colgroup>
              <col style={{ width: '25%' }} />
              <col style={{ width: '25%' }} />
              <col style={{ width: '25%' }} />
              <col style={{ width: '25%' }} />
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
                  Date
                </th>
                <th 
                  className="text-center text-helper font-semibold py-3 px-2"
                  style={{ backgroundColor: '#202020' }}
                >
                  Time
                </th>
                <th 
                  className="text-center text-helper font-semibold py-3 px-2"
                  style={{ backgroundColor: '#202020' }}
                >
                  Device
                </th>
                <th 
                  className="text-center text-helper font-semibold py-3 px-2"
                  style={{ 
                    backgroundColor: '#202020',
                    borderRadius: '0 10px 10px 0'
                  }}
                >
                  Location
                </th>
              </tr>
            </thead>
          </table>
        </div>
        <div className="overflow-y-auto custom-scrollbar pr-2" style={{ maxHeight }}>
          <table className="w-full table-fixed">
            <colgroup>
              <col style={{ width: '25%' }} />
              <col style={{ width: '25%' }} />
              <col style={{ width: '25%' }} />
              <col style={{ width: '25%' }} />
            </colgroup>
            <tbody>
              {history.map((entry, index) => (
                <tr
                  key={index}
                  className="border-b hover:opacity-80 transition-opacity"
                  style={{ borderColor: 'rgba(231, 228, 228, 0.05)' }}
                >
                  <td className="text-body text-center py-3 px-2">{entry.date}</td>
                  <td className="text-body text-center py-3 px-2">{entry.time}</td>
                  <td className="text-body text-center py-3 px-2">{entry.device}</td>
                  <td className="text-body text-center py-3 px-2">{entry.location}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
}

