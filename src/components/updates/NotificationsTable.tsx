'use client';

import Card from '@/components/ui/Card';
import { NotificationEntry } from '@/types/dashboard';
import { Trash, InfoCircle } from 'iconoir-react';

interface NotificationsTableProps {
  notifications: NotificationEntry[];
  title: string;
  onDelete?: (id: string) => void;
  showDeleteIcon?: boolean;
  showInfoText?: boolean;
  useFullHeight?: boolean;
}

export default function NotificationsTable({ 
  notifications, 
  title, 
  onDelete, 
  showDeleteIcon = false,
  showInfoText = false,
  useFullHeight = false
}: NotificationsTableProps) {
  // Calculate max height to show exactly 4 rows
  // Each row: ~48px (py-3 = 12px top + 12px bottom + text ~24px)
  // 4 rows: 4 * 48px = 192px
  // For full height tables (when parent has h-full), use flex-1 instead
  const maxHeight = useFullHeight ? undefined : '192px';
  
  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(id);
  };

  return (
    <Card title={title} showActions={false} className="flex flex-col h-full">
      <div className="mt-2 flex flex-col flex-1 min-h-0">
        <div className="overflow-hidden">
          <table className="w-full table-fixed">
            <colgroup>
              <col style={{ width: showDeleteIcon ? '20%' : '25%' }} />
              <col style={{ width: showDeleteIcon ? '20%' : '25%' }} />
              <col style={{ width: showDeleteIcon ? '20%' : '25%' }} />
              <col style={{ width: showDeleteIcon ? '30%' : '25%' }} />
              {showDeleteIcon && <col style={{ width: '10%' }} />}
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
                  Type
                </th>
                <th 
                  className="text-center text-helper font-semibold py-3 px-2"
                  style={{ 
                    backgroundColor: '#202020',
                    borderRadius: showDeleteIcon ? '0' : '0 10px 10px 0'
                  }}
                >
                  Text
                </th>
                {showDeleteIcon && (
                  <th 
                    className="text-center text-helper font-semibold py-3 px-2"
                    style={{ 
                      backgroundColor: '#202020',
                      borderRadius: '0 10px 10px 0'
                    }}
                  >
                  </th>
                )}
              </tr>
            </thead>
          </table>
        </div>
        <div 
          className={`overflow-y-auto custom-scrollbar pr-2 ${useFullHeight ? 'flex-1' : ''}`}
          style={maxHeight ? { maxHeight } : (useFullHeight ? { flex: 1, minHeight: 0 } : {})}
        >
          <table className="w-full table-fixed">
            <colgroup>
              <col style={{ width: showDeleteIcon ? '20%' : '25%' }} />
              <col style={{ width: showDeleteIcon ? '20%' : '25%' }} />
              <col style={{ width: showDeleteIcon ? '20%' : '25%' }} />
              <col style={{ width: showDeleteIcon ? '30%' : '25%' }} />
              {showDeleteIcon && <col style={{ width: '10%' }} />}
            </colgroup>
            <tbody>
              {notifications.map((notification) => (
                <tr
                  key={notification.id}
                  className="border-b hover:opacity-80 transition-opacity"
                  style={{ borderColor: 'rgba(231, 228, 228, 0.05)' }}
                >
                  <td className="text-body text-center py-3 px-2">{notification.date}</td>
                  <td className="text-body text-center py-3 px-2">{notification.time}</td>
                  <td className="text-body text-center py-3 px-2">{notification.type}</td>
                  <td className="text-body text-center py-3 px-2">{notification.text}</td>
                  {showDeleteIcon && (
                    <td className="text-center py-3 px-2">
                      <button
                        onClick={(e) => handleDelete(notification.id, e)}
                        className="hover:opacity-70 transition-opacity cursor-pointer"
                        aria-label="Delete notification"
                      >
                        <Trash width={16} height={16} strokeWidth={1.5} style={{ color: '#B9B9B9' }} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {showInfoText && (
          <div className="flex items-center gap-2 px-4 pt-4 pb-2">
            <InfoCircle 
              width={16} 
              height={16} 
              strokeWidth={1.5} 
              style={{ color: 'var(--accent-purple)' }}
            />
            <span className="text-body" style={{ color: '#B9B9B9' }}>
              Deleted notifications are stored in the system for 30 days before being erased permanently.
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}
