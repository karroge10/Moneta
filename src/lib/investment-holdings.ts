import { Prisma, type InvestmentType } from '@prisma/client';
import { sumMoney, type MoneyValue } from './money';

/**
 * Pure FIFO aggregation of investment transactions into a holding, in exact Decimal maths.
 * Prices are already converted to the target currency; a null price means its FX rate was
 * missing, which makes the cost basis unknown, so the holding is flagged rather than guessed.
 */

export type HoldingTransaction = {
  investmentType: InvestmentType | null;
  quantity: MoneyValue | null;
  /** Price per unit in the target currency, or null when the FX rate was missing. */
  convertedPricePerUnit: Prisma.Decimal | null;
};

export type Holding = {
  quantity: Prisma.Decimal;
  totalCost: Prisma.Decimal;
  realizedPnl: Prisma.Decimal;
  /** Converted price of the latest transaction, used as the manual fallback price. */
  lastPrice: Prisma.Decimal | null;
  rateMissing: boolean;
};

export type HoldingValuation = {
  currentValue: Prisma.Decimal;
  unrealizedPnl: Prisma.Decimal;
  unrealizedPnlPercent: number;
  avgPrice: Prisma.Decimal;
  totalPnl: Prisma.Decimal;
};

type BuyLot = { qty: Prisma.Decimal; costPerUnit: Prisma.Decimal };

/** Quantities below this are treated as an empty lot (float dust from older data). */
const LOT_EPSILON = new Prisma.Decimal('0.00000001');

/** Transactions must be sorted by date ascending. */
export function aggregateHolding(transactions: HoldingTransaction[]): Holding {
  const lots: BuyLot[] = [];
  let realizedPnl = new Prisma.Decimal(0);
  let lastPrice: Prisma.Decimal | null = null;
  let rateMissing = false;

  for (const t of transactions) {
    const qty = new Prisma.Decimal(t.quantity ?? 0);
    const price = t.convertedPricePerUnit;
    if (price === null) rateMissing = true;
    const knownPrice = price ?? new Prisma.Decimal(0);
    lastPrice = price;

    if (t.investmentType === 'buy') {
      lots.push({ qty, costPerUnit: knownPrice });
    } else if (t.investmentType === 'sell') {
      realizedPnl = realizedPnl.plus(sellFromLots(lots, qty, knownPrice));
    }
  }

  const quantities = lots.map((l) => l.qty);
  const costs = lots.map((l) => l.qty.mul(l.costPerUnit));
  return {
    quantity: sumMoney(quantities),
    totalCost: sumMoney(costs),
    realizedPnl,
    lastPrice,
    rateMissing,
  };
}

export function valueHolding(holding: Holding, currentPrice: Prisma.Decimal): HoldingValuation {
  const currentValue = holding.quantity.mul(currentPrice);
  const unrealizedPnl = currentValue.minus(holding.totalCost);
  const hasCost = holding.totalCost.gt(0);
  const pnlRatio = hasCost ? unrealizedPnl.div(holding.totalCost) : new Prisma.Decimal(0);
  const hasQuantity = holding.quantity.gt(0);
  const avgPrice = hasQuantity ? holding.totalCost.div(holding.quantity) : new Prisma.Decimal(0);
  return {
    currentValue,
    unrealizedPnl,
    unrealizedPnlPercent: pnlRatio.mul(100).toNumber(),
    avgPrice,
    totalPnl: holding.realizedPnl.plus(unrealizedPnl),
  };
}

/** Consumes lots FIFO and returns the realized gain of the sale. */
function sellFromLots(lots: BuyLot[], sellQty: Prisma.Decimal, sellPrice: Prisma.Decimal): Prisma.Decimal {
  let remaining = sellQty;
  let gain = new Prisma.Decimal(0);
  while (remaining.gt(0) && lots.length > 0) {
    const lot = lots[0];
    const taken = Prisma.Decimal.min(remaining, lot.qty);
    const priceDiff = sellPrice.minus(lot.costPerUnit);
    gain = gain.plus(taken.mul(priceDiff));
    lot.qty = lot.qty.minus(taken);
    remaining = remaining.minus(taken);
    if (lot.qty.lte(LOT_EPSILON)) lots.shift();
  }
  return gain;
}
