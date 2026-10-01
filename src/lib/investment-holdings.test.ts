import { describe, expect, it } from 'vitest';
import { Prisma } from '@prisma/client';
import { aggregateHolding, valueHolding, type HoldingTransaction } from './investment-holdings';

function tx(investmentType: 'buy' | 'sell', quantity: string, price: string | null): HoldingTransaction {
  const convertedPricePerUnit = price === null ? null : new Prisma.Decimal(price);
  return { investmentType, quantity, convertedPricePerUnit };
}

describe('aggregateHolding', () => {
  it('sums buy lots exactly', () => {
    const holding = aggregateHolding([tx('buy', '0.1', '10'), tx('buy', '0.2', '20')]);
    expect(holding.quantity.toString()).toBe('0.3');
    expect(holding.totalCost.toString()).toBe('5');
    expect(holding.realizedPnl.toString()).toBe('0');
    expect(holding.rateMissing).toBe(false);
  });

  it('realizes gains FIFO across lots', () => {
    const holding = aggregateHolding([
      tx('buy', '1', '100'),
      tx('buy', '1', '200'),
      tx('sell', '1.5', '300'),
    ]);
    // 1 @ (300-100) + 0.5 @ (300-200) = 250
    expect(holding.realizedPnl.toString()).toBe('250');
    expect(holding.quantity.toString()).toBe('0.5');
    expect(holding.totalCost.toString()).toBe('100');
    expect(holding.lastPrice?.toString()).toBe('300');
  });

  it('flags a missing FX rate instead of guessing', () => {
    const holding = aggregateHolding([tx('buy', '1', null)]);
    expect(holding.rateMissing).toBe(true);
    expect(holding.lastPrice).toBeNull();
  });

  it('drops fully sold lots', () => {
    const holding = aggregateHolding([tx('buy', '2', '5'), tx('sell', '2', '6')]);
    expect(holding.quantity.isZero()).toBe(true);
    expect(holding.totalCost.isZero()).toBe(true);
    expect(holding.realizedPnl.toString()).toBe('2');
  });
});

describe('valueHolding', () => {
  it('computes value, unrealized pnl and average price', () => {
    const holding = aggregateHolding([tx('buy', '2', '50')]);
    const price = new Prisma.Decimal(75);
    const valuation = valueHolding(holding, price);
    expect(valuation.currentValue.toString()).toBe('150');
    expect(valuation.unrealizedPnl.toString()).toBe('50');
    expect(valuation.unrealizedPnlPercent).toBe(50);
    expect(valuation.avgPrice.toString()).toBe('50');
    expect(valuation.totalPnl.toString()).toBe('50');
  });

  it('returns zero percent when there is no cost', () => {
    const holding = aggregateHolding([]);
    const price = new Prisma.Decimal(10);
    const valuation = valueHolding(holding, price);
    expect(valuation.unrealizedPnlPercent).toBe(0);
    expect(valuation.avgPrice.isZero()).toBe(true);
  });
});
