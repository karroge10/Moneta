/**
 * Workbook Structure Inspector
 * Parses Книга1.xlsx to understand the expense categories and date ranges
 */

import { spawn } from 'child_process';
import { resolve } from 'path';

interface WorkbookInfo {
  expenseColumns: string[];
  incomeColumns: string[];
  monthRange: {
    expenses: { start: string; end: string };
    incomes: { start: string; end: string };
  };
  sampleData: {
    expenseCategories: string[];
    incomeMonths: string[];
  };
}

async function inspectWorkbook(): Promise<WorkbookInfo> {
  return new Promise((resolve, reject) => {
    const pythonScript = `
import pandas as pd
import json
import sys
import io

# Set UTF-8 encoding for stdout
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

try:
    path = 'public/Книга1.xlsx'
    df = pd.read_excel(path, sheet_name=0)
    
    # Get all columns
    all_columns = list(df.columns)
    
    # Expense columns (from Продукты to Налоги в Грузии, excluding control columns)
    expense_start_idx = all_columns.index('Продукты')
    expense_end_idx = all_columns.index('Всего за месяц')
    expense_columns = all_columns[expense_start_idx:expense_end_idx]
    
    # Income columns
    income_columns = ['Month', 'Earned, GEL']
    
    # Get month ranges
    # For expenses, use the Расходы column (Russian month names)
    expense_months = df['Расходы'].dropna().tolist()
    expense_start = expense_months[0] if expense_months else None
    expense_end = expense_months[-1] if expense_months else None
    
    # For incomes, use the Month column (English format)
    income_months = df['Month'].dropna().tolist()
    income_start = income_months[0] if income_months else None
    income_end = income_months[-1] if income_months else None
    
    result = {
        'expenseColumns': expense_columns,
        'incomeColumns': income_columns,
        'monthRange': {
            'expenses': {
                'start': expense_start,
                'end': expense_end
            },
            'incomes': {
                'start': income_start,
                'end': income_end
            }
        },
        'sampleData': {
            'expenseCategories': expense_columns[:5],
            'incomeMonths': income_months[:5]
        }
    }
    
    print(json.dumps(result, ensure_ascii=False))
except Exception as e:
    print(json.dumps({'error': str(e)}), file=sys.stderr)
    sys.exit(1)
`;

    const python = spawn('python', ['-c', pythonScript], {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
    });

    let stdout = '';
    let stderr = '';

    python.stdout.setEncoding('utf8');
    python.stderr.setEncoding('utf8');

    python.stdout.on('data', (data) => {
      stdout += data;
    });

    python.stderr.on('data', (data) => {
      stderr += data;
    });

    python.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Python script failed: ${stderr}`));
        return;
      }

      try {
        const result = JSON.parse(stdout);
        if (result.error) {
          reject(new Error(result.error));
        } else {
          resolve(result);
        }
      } catch (err) {
        reject(new Error(`Failed to parse Python output: ${err}`));
      }
    });
  });
}

async function main() {
  console.log('🔍 Inspecting Книга1.xlsx workbook structure...\n');

  try {
    const info = await inspectWorkbook();

    console.log('📊 EXPENSE COLUMNS (Categories):');
    console.log('─'.repeat(60));
    info.expenseColumns.forEach((col: string, idx: number) => {
      console.log(`  ${idx + 1}. ${col}`);
    });

    console.log('\n💰 INCOME COLUMNS:');
    console.log('─'.repeat(60));
    info.incomeColumns.forEach((col: string, idx: number) => {
      console.log(`  ${idx + 1}. ${col}`);
    });

    console.log('\n📅 DATE RANGES:');
    console.log('─'.repeat(60));
    console.log(`  Expenses: ${info.monthRange.expenses.start} → ${info.monthRange.expenses.end}`);
    console.log(`  Incomes:  ${info.monthRange.incomes.start} → ${info.monthRange.incomes.end}`);

    console.log('\n✅ Decision: Use last day of each month for transaction dates\n');

    console.log('📝 Sample Data:');
    console.log('─'.repeat(60));
    console.log('  First 5 expense categories:', info.sampleData.expenseCategories.join(', '));
    console.log('  First 5 income months:', info.sampleData.incomeMonths.join(', '));

    console.log('\n✅ Workbook audit complete!\n');
    console.log(`Total expense categories: ${info.expenseColumns.length}`);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();

