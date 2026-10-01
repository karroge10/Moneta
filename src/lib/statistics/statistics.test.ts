import { describe, expect, it } from 'vitest';
import { Prisma } from '@prisma/client';
import { getAgeGroup } from './age';
import { buildMonthlySummaries, computeTrends, formatMonthLabel } from './monthly-summary';
import { buildAverageExpenses, getIconForCategory } from './category-breakdown';
import { buildSummaryItems } from './summary-items';
import { buildCohortFilters, computePeerMetrics, filterCohort, parseDemographicDimension } from './cohort';

const dec = (v: number | string) => new Prisma.Decimal(v);

describe('getAgeGroup', () => {
  const now = new Date('2026-06-15T00:30:00.000Z');

  it('uses UTC calendar dates for the birthday boundary', () => {
    expect(getAgeGroup(new Date('2001-06-15T00:00:00.000Z'), now)).toBe('25-34');
    expect(getAgeGroup(new Date('2001-06-16T00:00:00.000Z'), now)).toBe('18-24');
  });

  it('returns null for missing or under 18', () => {
    expect(getAgeGroup(null, now)).toBeNull();
    expect(getAgeGroup(new Date('2010-01-01T00:00:00.000Z'), now)).toBeNull();
    expect(getAgeGroup(new Date('1950-01-01T00:00:00.000Z'), now)).toBe('55+');
  });
});

describe('buildMonthlySummaries', () => {
  it('groups by UTC month, newest first, with top category', () => {
    const rows = buildMonthlySummaries([
      { date: new Date('2026-01-31T23:30:00.000Z'), type: 'income', convertedMoney: dec(1000) },
      { date: new Date('2026-01-10T00:00:00.000Z'), type: 'expense', convertedMoney: dec(300), category: { name: 'Rent' } },
      { date: new Date('2026-01-11T00:00:00.000Z'), type: 'expense', convertedMoney: dec(100), category: null },
      { date: new Date('2026-02-01T00:00:00.000Z'), type: 'income', convertedMoney: dec(500) },
      { date: new Date('2026-02-02T00:00:00.000Z'), type: 'expense', convertedMoney: null },
    ]);
    expect(rows).toEqual([
      { month: 'Feb 2026', income: 500, expenses: 0, savings: 500, topCategory: { name: 'N/A', percentage: 0 } },
      { month: 'Jan 2026', income: 1000, expenses: 400, savings: 600, topCategory: { name: 'Rent', percentage: 75 } },
    ]);
  });

  it('keeps only 12 months and sorts across years', () => {
    const txs = Array.from({ length: 14 }, (_, i) => ({
      date: new Date(Date.UTC(2025, i, 5)),
      type: 'income',
      convertedMoney: dec(1),
    }));
    const rows = buildMonthlySummaries(txs);
    expect(rows).toHaveLength(12);
    expect(rows[0].month).toBe('Feb 2026');
    expect(rows[11].month).toBe('Mar 2025');
  });

  it('formatMonthLabel uses UTC', () => {
    expect(formatMonthLabel(new Date('2026-12-31T23:59:59.999Z'))).toBe('Dec 2026');
  });
});

describe('computeTrends', () => {
  it('compares oldest to newest row', () => {
    const base = { savings: 0, topCategory: { name: 'N/A', percentage: 0 } };
    const trends = computeTrends([
      { ...base, month: 'Feb 2026', income: 150, expenses: 50 },
      { ...base, month: 'Jan 2026', income: 100, expenses: 0 },
    ]);
    expect(trends).toEqual({ incomeTrend: 50, expensesTrend: 0 });
    expect(computeTrends([])).toEqual({ incomeTrend: 0, expensesTrend: 0 });
  });
});

describe('buildAverageExpenses', () => {
  it('totals expenses per category, sorted by amount', () => {
    const rows = buildAverageExpenses(
      [
        { type: 'expense', convertedMoney: dec('0.1'), category: { name: 'Groceries' } },
        { type: 'expense', convertedMoney: dec('0.2'), category: { name: 'Groceries' } },
        { type: 'expense', convertedMoney: dec(1), category: { name: 'Rent' } },
        { type: 'income', convertedMoney: dec(99), category: { name: 'Rent' } },
      ],
      1.3,
    );
    expect(rows).toEqual([
      { id: 'Rent', name: 'Rent', amount: 1, percentage: 77, icon: 'City', color: '#AC66DA' },
      { id: 'Groceries', name: 'Groceries', amount: 0.3, percentage: 23, icon: 'Cart', color: '#74C648' },
    ]);
  });

  it('falls back to HelpCircle icon', () => {
    expect(getIconForCategory('Unknown')).toBe('HelpCircle');
    expect(getIconForCategory(null)).toBe('HelpCircle');
  });
});

describe('buildSummaryItems', () => {
  it('formats trends and values', () => {
    const items = buildSummaryItems({
      totalIncome: 100.6,
      totalExpenses: 50,
      incomeSaved: 50.6,
      incomeTrend: 12,
      expensesTrend: -5,
      totalGoals: 2,
      goalsSuccessRate: 50,
      portfolioBalance: 10,
      healthScore: 70,
      healthTrend: 0,
    });
    expect(items[0]).toMatchObject({ value: 101, change: '+12% from beginning' });
    expect(items[1].change).toBe('-5% from beginning');
    expect(items[3].value).toBe('50%');
    expect(items[5]).toMatchObject({ value: '70/100', change: '' });
  });
});

describe('demographic helpers', () => {
  const now = new Date('2026-06-15T00:00:00.000Z');
  const users = [
    { id: 1, dateOfBirth: null, country: 'DE', profession: 'Dev ' },
    { id: 2, dateOfBirth: null, country: 'AT', profession: '' },
    { id: 3, dateOfBirth: null, country: 'DE', profession: null },
  ];

  it('parses the dimension with age as default', () => {
    expect(parseDemographicDimension('country')).toBe('country');
    expect(parseDemographicDimension('bogus')).toBe('age');
    expect(parseDemographicDimension(null)).toBe('age');
  });

  it('filters by trimmed value and builds sorted filters', () => {
    expect(filterCohort(users, 'profession', 'Dev', now).map((u) => u.id)).toEqual([1]);
    expect(filterCohort(users, 'country', '', now)).toEqual([]);
    expect(buildCohortFilters(users)).toEqual({ countries: ['AT', 'DE'], professions: ['Dev '] });
  });

  it('computes peer health score', () => {
    const m = computePeerMetrics({ income: 100, expenses: 80, txCount: 2, goalsTotal: 2, goalsDone: 1, portfolioBalance: 5 });
    expect(m).toEqual({ income: 100, expenses: 80, goalsSuccessRate: 50, portfolioBalance: 5, healthScore: 88 });
    const empty = computePeerMetrics({ income: 0, expenses: 0, txCount: 0, goalsTotal: 0, goalsDone: 0, portfolioBalance: 0 });
    expect(empty.healthScore).toBe(42);
  });
});
