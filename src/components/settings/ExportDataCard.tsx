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

  const handleExport = async () => {
    try {
      setExporting(true);
      const response = await fetch('/api/user/export');
      
      if (!response.ok) {
        throw new Error('Export failed');
      }

      const { data } = await response.json();
      
      if (!data || data.length === 0) {
          alert('No transactions found to export.');
          return;
      }

      // Generate "Beautiful" Excel-compatible HTML/XML
      const timestamp = new Date().toISOString().split('T')[0];
      const fileName = `moneta_export_${timestamp}.xls`;

      // Calculate the range for AutoFilter (e.g., A1:F100)
      const lastRow = data.length + 1;
      const filterRange = `A1:F${lastRow}`;

      let xml = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
          <!--[if gte mso 9]>
          <xml>
            <x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
              <x:Name>Transactions</x:Name>
              <x:WorksheetOptions>
                <x:DisplayGridlines/>
                <x:AutoFilter x:Range="${filterRange}"/>
              </x:WorksheetOptions>
            </x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook>
          </xml>
          <![endif]-->
          <style>
            table { border-collapse: collapse; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
            th { background-color: #AC66DA; color: #FFFFFF; font-weight: bold; border: 1px solid #3a3a3a; padding: 10px 8px; text-align: left; }
            td { border: 1px solid #e0e0e0; padding: 6px 8px; color: #282828; }
            .income { color: #2E7D32; font-weight: 500; }
            .expense { color: #C62828; }
            .date-cell { color: #666666; width: 100px; }
          </style>
        </head>
        <body>
          <table x:str border=0 cellpadding=0 cellspacing=0 style='border-collapse: collapse;'>
            <thead>
              <tr x:autofilter="all">
                <th style="width: 100px;">Date</th>
                <th style="width: 350px;">Transaction</th>
                <th style="width: 100px;">Amount</th>
                <th style="width: 80px;">Currency</th>
                <th style="width: 80px;">Type</th>
                <th style="width: 180px;">Category</th>
              </tr>
            </thead>
            <tbody>
              ${data.map((row: any) => `
                <tr>
                  <td class="date-cell">${row.Date}</td>
                  <td>${row.Name}</td>
                  <td class="${row.Type === 'income' ? 'income' : 'expense'}">
                    ${row.Type === 'income' ? '+' : '-'}${row.Amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td>${row.Currency}</td>
                  <td>${row.Type}</td>
                  <td>${row.Category}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
        </html>
      `;

      const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export data. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <Card title="Export Data" showActions={false}>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="w-6 h-6 rounded shrink-0 animate-pulse" style={{ backgroundColor: '#3a3a3a' }} />
            <div className="flex-1 min-w-0">
              <div className="h-4 w-full max-w-md rounded animate-pulse" style={{ backgroundColor: '#3a3a3a' }} />
            </div>
            <div className="h-10 px-6 min-w-[7.5rem] rounded-full shrink-0 animate-pulse" style={{ backgroundColor: '#3a3a3a' }} />
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
