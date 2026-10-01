'use client';

import { useMutation } from '@tanstack/react-query';
import { Download } from 'iconoir-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';
import { apiFetch } from '@/lib/api-client';
import { formatDate, formatDecimal } from '@/lib/format';

interface ExportDataCardProps {
  loading?: boolean;
}

interface ExportTransactionRow {
  Date: string;
  Name: string;
  Amount: number;
  Currency: string;
  Type: string;
  Category: string;
}

type ExportResult = 'downloaded' | 'empty';

export default function ExportDataCard({ loading = false }: ExportDataCardProps) {
  const exportMutation = useMutation({ mutationFn: exportTransactions });

  if (loading) {
    return (
      <Card title="Export Data" showActions={false} className="h-full">
        <div className="flex items-center gap-4" aria-busy="true">
          <span className="sr-only">Loading</span>
          <Skeleton className="h-4 max-w-md flex-1" />
          <Skeleton className="h-10 w-32 shrink-0 rounded-full" />
        </div>
      </Card>
    );
  }

  return (
    <Card title="Export Data" showActions={false} className="h-full">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-4">
          <Download width={24} height={24} strokeWidth={1.5} className="shrink-0 text-secondary" aria-hidden="true" />
          <p className="flex-1 text-copy text-fg text-pretty">
            Download all your transactions as an Excel file (.xls).
          </p>
          <Button onClick={() => exportMutation.mutate()} loading={exportMutation.isPending} className="shrink-0">
            Export data
          </Button>
        </div>
        <div aria-live="polite">
          {exportMutation.data === 'empty' && (
            <p className="text-ui text-secondary">There are no transactions to export yet.</p>
          )}
          {exportMutation.isError && (
            <p className="text-ui text-negative-fg">Could not export your data. Please try again.</p>
          )}
        </div>
      </div>
    </Card>
  );
}

async function exportTransactions(): Promise<ExportResult> {
  const { data } = await apiFetch<{ data: ExportTransactionRow[] }>('/api/user/export');
  if (!data || data.length === 0) return 'empty';

  const timestamp = formatDate(new Date(), 'input');
  const workbook = buildWorkbookHtml(data);
  downloadFile(workbook, `moneta_export_${timestamp}.xls`, 'application/vnd.ms-excel');
  return 'downloaded';
}

/** Excel opens this HTML table as a worksheet. Every cell is escaped, since names come from user input. */
function buildWorkbookHtml(rows: ExportTransactionRow[]): string {
  const filterRange = `A1:F${rows.length + 1}`;
  const bodyRows = rows.map(renderRow).join('');

  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
<!--[if gte mso 9]><xml>
<x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
<x:Name>Transactions</x:Name>
<x:WorksheetOptions><x:DisplayGridlines/><x:AutoFilter x:Range="${filterRange}"/></x:WorksheetOptions>
</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook>
</xml><![endif]-->
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
<table x:str border=0 cellpadding=0 cellspacing=0>
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
<tbody>${bodyRows}</tbody>
</table>
</body>
</html>`;
}

function renderRow(row: ExportTransactionRow): string {
  const isIncome = row.Type === 'income';
  const amount = formatDecimal(row.Amount, { minDecimals: 2, maxDecimals: 2 });
  const signedAmount = `${isIncome ? '+' : '-'}${amount}`;
  return `<tr>
<td class="date-cell">${escapeHtml(row.Date)}</td>
<td>${escapeHtml(row.Name)}</td>
<td class="${isIncome ? 'income' : 'expense'}">${escapeHtml(signedAmount)}</td>
<td>${escapeHtml(row.Currency)}</td>
<td>${escapeHtml(row.Type)}</td>
<td>${escapeHtml(row.Category)}</td>
</tr>`;
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function downloadFile(contents: string, fileName: string, type: string) {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
