/**
 * Row-by-row check for the Float -> Decimal(19,4) money migration.
 *
 *   npx tsx scripts/verify-money-migration.ts snapshot tmp/money-before.json   (before migrating)
 *   npx tsx scripts/verify-money-migration.ts check    tmp/money-before.json   (after migrating)
 *
 * "check" passes only if every row still exists and every value equals its old value
 * rounded to 4 decimals (after Postgres' 15-significant-digit float cast). Values are read
 * as text so the comparison is exact.
 */
import { config } from 'dotenv';
import { readFileSync, writeFileSync } from 'fs';
import { Prisma, PrismaClient } from '@prisma/client';

config({ path: '.env.local' });
config({ path: '.env' });

const COLUMNS: Array<{ table: string; column: string }> = [
  { table: 'Transaction', column: 'amount' },
  { table: 'Goal', column: 'targetAmount' },
  { table: 'Goal', column: 'currentAmount' },
  { table: 'RecurringTransaction', column: 'amount' },
  { table: 'PortfolioSnapshot', column: 'totalValue' },
  { table: 'PortfolioSnapshot', column: 'totalCost' },
  { table: 'PortfolioSnapshot', column: 'totalPnl' },
];

type Snapshot = Record<string, Record<string, string>>;

const db = new PrismaClient();

async function main() {
  const [mode, file] = process.argv.slice(2);
  if ((mode !== 'snapshot' && mode !== 'check') || !file) {
    console.error('Usage: verify-money-migration.ts snapshot|check <file>');
    process.exit(2);
  }

  const current = await readAll();

  if (mode === 'snapshot') {
    writeFileSync(file, JSON.stringify(current));
    for (const key of Object.keys(current)) {
      console.log(`${key}: ${Object.keys(current[key]).length} rows`);
    }
    return;
  }

  const before: Snapshot = JSON.parse(readFileSync(file, 'utf-8'));
  const failures = compare(before, current);
  if (failures.length > 0) {
    console.error(`FAILED: ${failures.length} mismatches`);
    for (const failure of failures.slice(0, 50)) console.error('  ' + failure);
    process.exit(1);
  }
  console.log('OK: every row present and equal to its old value rounded to 4 decimals');
}

async function readAll(): Promise<Snapshot> {
  const snapshot: Snapshot = {};
  for (const { table, column } of COLUMNS) {
    const rows = await db.$queryRawUnsafe<Array<{ id: number; value: string }>>(
      `SELECT "id", "${column}"::text AS "value" FROM "${table}"`,
    );
    const byId: Record<string, string> = {};
    for (const row of rows) byId[String(row.id)] = row.value;
    snapshot[`${table}.${column}`] = byId;
  }
  return snapshot;
}

function compare(before: Snapshot, after: Snapshot): string[] {
  const failures: string[] = [];
  for (const [key, oldRows] of Object.entries(before)) {
    const newRows = after[key] ?? {};
    const oldCount = Object.keys(oldRows).length;
    const newCount = Object.keys(newRows).length;
    if (oldCount !== newCount) failures.push(`${key}: row count ${oldCount} -> ${newCount}`);

    let oldSum = new Prisma.Decimal(0);
    let newSum = new Prisma.Decimal(0);
    for (const [id, oldValue] of Object.entries(oldRows)) {
      const newValue = newRows[id];
      if (newValue === undefined) {
        failures.push(`${key} id=${id}: row missing`);
        continue;
      }
      // Postgres casts float8 -> numeric with 15 significant digits (the rest is binary
      // noise), then the migration rounds to 4 decimals. Mirror that exactly.
      const expected = new Prisma.Decimal(oldValue).toSignificantDigits(15).toDecimalPlaces(4);
      const actual = new Prisma.Decimal(newValue);
      if (!expected.equals(actual)) failures.push(`${key} id=${id}: ${oldValue} -> ${newValue}`);
      oldSum = oldSum.plus(expected);
      newSum = newSum.plus(actual);
    }
    console.log(`${key}: ${newCount} rows, sum ${oldSum.toFixed(4)} -> ${newSum.toFixed(4)}`);
  }
  return failures;
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
