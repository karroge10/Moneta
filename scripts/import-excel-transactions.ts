/**
 * Excel Transaction Importer
 * Imports expense and income transactions from Книга1.xlsx
 * 
 * Usage: npx tsx scripts/import-excel-transactions.ts
 * 
 * This script:
 * 1. Reads expense category totals from July 2023 - September 2024
 * 2. Reads income (GEL) from January 2023 - November 2025
 * 3. Creates transactions with:
 *    - Expenses: "<Month YYYY> <Category> Total" (e.g., "July 2023 Restaurants Total")
 *    - Incomes: "Salary" for each month
 * 4. Uses last day of each month for transaction dates
 * 5. Currency: GEL
 */

import { PrismaClient } from '@prisma/client';
import { resolve } from 'path';
import { config } from 'dotenv';
import { spawn } from 'child_process';

// Load environment variables (try .env.local first, then .env)
config({ path: resolve(process.cwd(), '.env.local') });
if (!process.env.DATABASE_URL) {
  config({ path: resolve(process.cwd(), '.env') });
}

// Ensure DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set. Please create a .env or .env.local file.');
}

const prisma = new PrismaClient();

interface ExcelData {
  expenses: Array<{
    month: string; // Russian month name (e.g., "Июль")
    year: number;
    category: string; // Excel column name (e.g., "Рестораны")
    amount: number;
  }>;
  incomes: Array<{
    month: string; // English format (e.g., "January, 2023")
    year: number;
    monthNum: number; // 1-12
    amount: number; // GEL amount
  }>;
}

// Map Excel Russian category names to English database category names
const CATEGORY_MAPPING: Record<string, string> = {
  'Продукты': 'Groceries',
  'Рестораны': 'Restaurants',
  'Развлечения, Фитнесс': 'Entertainment',
  'Техника': 'Technology',
  'Мебель / посуда': 'Furniture',
  'Одежда': 'Clothes',
  'Транспорт': 'Transportation',
  'Аренда': 'Rent',
  'Интернет': 'Home Internet',
  'Телефон': 'Mobile Data',
  'Электричество': 'Electricity Bill',
  'Вода': 'Water Bill',
  'Газ': 'Heating Bill',
  'Лифт / Уборка и т.д.': 'Elevator & Cleaning Bill',
  'Банк': 'Subscriptions',
  'Другое': 'Other',
  'Налоги в РФ': 'Taxes',
  'Налоги в Грузии': 'Taxes',
};

// Map Russian month names to month numbers
const RUSSIAN_MONTHS: Record<string, number> = {
  'Январь': 1,
  'Февраль': 2,
  'Март': 3,
  'Апрель': 4,
  'Май': 5,
  'Июнь': 6,
  'Июль': 7,
  'Август': 8,
  'Сентябрь': 9,
  'Октябрь': 10,
  'Ноябрь': 11,
  'Декабрь': 12,
};

// Map English month names to month numbers
const ENGLISH_MONTHS: Record<string, number> = {
  'January': 1,
  'February': 2,
  'March': 3,
  'April': 4,
  'May': 5,
  'June': 6,
  'July': 7,
  'August': 8,
  'September': 9,
  'October': 10,
  'November': 11,
  'December': 12,
};

// Get last day of month
function getLastDayOfMonth(year: number, month: number): Date {
  return new Date(year, month, 0); // Day 0 = last day of previous month, so month+1, 0 = last day of month
}

// Format month name for transaction description
function formatMonthName(monthNum: number, year: number): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return `${months[monthNum - 1]} ${year}`;
}

async function readExcelData(): Promise<ExcelData> {
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
    
    # Get expense columns (from Продукты to Налоги в Грузии)
    all_columns = list(df.columns)
    expense_start_idx = all_columns.index('Продукты')
    expense_end_idx = all_columns.index('Всего за месяц')
    expense_columns = all_columns[expense_start_idx:expense_end_idx]
    
    expenses = []
    incomes = []
    
    # Process each row
    for idx, row in df.iterrows():
        # Process expenses (only if Расходы column has a value)
        russian_month = row.get('Расходы')
        if pd.notna(russian_month):
            russian_month = str(russian_month).strip()
            
            # Determine year based on income data if available, otherwise estimate
            income_month_str = str(row.get('Month', ''))
            if income_month_str and income_month_str != 'nan':
                # Format: "January, 2023" or "January,2023"
                parts = income_month_str.replace(',', '').split()
                if len(parts) >= 2:
                    year = int(parts[1])
                else:
                    year = 2023 + (idx // 12)
            else:
                # Estimate year - July 2023 starts at index 0
                year = 2023 + (idx // 12)
            
            # Get month number from Russian name
            month_num = {
                'Январь': 1, 'Февраль': 2, 'Март': 3, 'Апрель': 4,
                'Май': 5, 'Июнь': 6, 'Июль': 7, 'Август': 8,
                'Сентябрь': 9, 'Октябрь': 10, 'Ноябрь': 11, 'Декабрь': 12
            }.get(russian_month, None)
            
            if month_num:
                # Process expense categories
                for col in expense_columns:
                    amount = row.get(col)
                    if pd.notna(amount) and amount != 0:
                        try:
                            amount_float = float(amount)
                            if amount_float > 0:
                                expenses.append({
                                    'month': russian_month,
                                    'year': year,
                                    'category': col,
                                    'amount': amount_float
                                })
                        except (ValueError, TypeError):
                            pass
        
        # Process income (GEL) - process independently, don't require Расходы column
        income_gel = row.get('Earned, GEL')
        income_month_str = row.get('Month', '')
        
        if pd.notna(income_gel) and income_gel != 0 and pd.notna(income_month_str):
            try:
                income_amount = float(income_gel)
                if income_amount > 0:
                    # Parse income month
                    income_month_str = str(income_month_str).strip()
                    if income_month_str and income_month_str != 'nan':
                        # Format: "January, 2023" or "January,2023"
                        parts = income_month_str.replace(',', '').split()
                        if len(parts) >= 2:
                            income_year = int(parts[1])
                            income_month_name = parts[0]
                            income_month_num = {
                                'January': 1, 'February': 2, 'March': 3, 'April': 4,
                                'May': 5, 'June': 6, 'July': 7, 'August': 8,
                                'September': 9, 'October': 10, 'November': 11, 'December': 12
                            }.get(income_month_name, None)
                            
                            if income_month_num:
                                incomes.append({
                                    'month': income_month_str,
                                    'year': income_year,
                                    'monthNum': income_month_num,
                                    'amount': income_amount
                                })
            except (ValueError, TypeError):
                pass
    
    result = {
        'expenses': expenses,
        'incomes': incomes
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

async function importTransactions(userId: number, currencyId: number) {
  console.log('📖 Reading Excel file...\n');
  const excelData = await readExcelData();

  console.log(`Found ${excelData.expenses.length} expense transactions`);
  console.log(`Found ${excelData.incomes.length} income transactions\n`);

  // Get all categories
  const allCategories = await prisma.category.findMany();
  const categoryMap = new Map<string, number>();
  allCategories.forEach((cat) => {
    categoryMap.set(cat.name, cat.id);
  });

  const transactionsToCreate: Array<{
    userId: number;
    type: 'expense' | 'income';
    amount: number;
    description: string;
    date: Date;
    categoryId: number | null;
    currencyId: number;
    source: string;
  }> = [];

  // Process expenses
  console.log('💰 Processing expenses...');
  for (const expense of excelData.expenses) {
    const englishCategory = CATEGORY_MAPPING[expense.category];
    if (!englishCategory) {
      console.warn(`  ⚠️  Unknown category: ${expense.category}`);
      continue;
    }

    const categoryId = categoryMap.get(englishCategory) || null;
    const monthNum = RUSSIAN_MONTHS[expense.month];
    if (!monthNum) {
      console.warn(`  ⚠️  Unknown month: ${expense.month}`);
      continue;
    }

    const date = getLastDayOfMonth(expense.year, monthNum);
    const monthName = formatMonthName(monthNum, expense.year);
    const description = `${monthName} ${englishCategory} Total`;

    transactionsToCreate.push({
      userId,
      type: 'expense',
      amount: expense.amount,
      description,
      date,
      categoryId,
      currencyId,
      source: 'excel_import',
    });
  }

  // Process incomes
  console.log('💵 Processing incomes...');
  for (const income of excelData.incomes) {
    const date = getLastDayOfMonth(income.year, income.monthNum);

    transactionsToCreate.push({
      userId,
      type: 'income',
      amount: income.amount,
      description: 'Salary',
      date,
      categoryId: null,
      currencyId,
      source: 'excel_import',
    });
  }

  console.log(`\n📝 Prepared ${transactionsToCreate.length} transactions for import\n`);

  // Show summary
  const expenseCount = transactionsToCreate.filter((t) => t.type === 'expense').length;
  const incomeCount = transactionsToCreate.filter((t) => t.type === 'income').length;
  const expenseTotal = transactionsToCreate
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  const incomeTotal = transactionsToCreate
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  console.log('📊 Import Summary:');
  console.log('─'.repeat(60));
  console.log(`  Expenses: ${expenseCount} transactions, Total: ${expenseTotal.toFixed(2)} GEL`);
  console.log(`  Incomes:  ${incomeCount} transactions, Total: ${incomeTotal.toFixed(2)} GEL`);
  console.log(`  Net:      ${(incomeTotal - expenseTotal).toFixed(2)} GEL\n`);

  console.log('🚀 Importing transactions...\n');
  
  // Batch insert for performance
  const batchSize = 100;
  for (let i = 0; i < transactionsToCreate.length; i += batchSize) {
    const batch = transactionsToCreate.slice(i, i + batchSize);
    await prisma.transaction.createMany({
      data: batch,
      skipDuplicates: true, // Skip if transaction already exists
    });
    console.log(`  ✓ Imported batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(transactionsToCreate.length / batchSize)}`);
  }
  
  console.log(`\n✅ Successfully imported ${transactionsToCreate.length} transactions!\n`);
}

async function main() {
  try {
    // Get current user (you'll need to provide clerkUserId or userId)
    // For now, we'll get the first user or you can pass it as an argument
    const userIdArg = process.argv[2];
    
    let user;
    if (userIdArg) {
      // Try to find by clerkUserId first, then by id
      user = await prisma.user.findFirst({
        where: {
          OR: [
            { clerkUserId: userIdArg },
            { id: parseInt(userIdArg, 10) || -1 },
          ],
        },
      });
    } else {
      // Get first user
      user = await prisma.user.findFirst();
    }

    if (!user) {
      console.error('❌ No user found. Please provide a userId or clerkUserId as argument.');
      console.error('   Usage: npx tsx scripts/import-excel-transactions.ts [userId|clerkUserId]');
      process.exit(1);
    }

    console.log(`👤 Importing for user: ${user.id} (${user.clerkUserId || 'no clerk ID'})\n`);

    // Get GEL currency
    const gelCurrency = await prisma.currency.findFirst({
      where: { alias: 'GEL' },
    });

    if (!gelCurrency) {
      console.error('❌ GEL currency not found. Please run scripts/ensure-excel-categories.ts first.');
      process.exit(1);
    }

    console.log(`💱 Currency: ${gelCurrency.name} (${gelCurrency.symbol}) - ID: ${gelCurrency.id}\n`);

    await importTransactions(user.id, gelCurrency.id);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

