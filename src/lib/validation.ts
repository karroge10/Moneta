import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AssetType, FrequencyUnit, InvestmentType, PricingMode, TransactionType } from '@prisma/client';
import { parseMoney, parseQuantity } from './money';
import { parseDisplayDate } from './transaction-utils';

/**
 * Request body schemas for write endpoints. They check shape and types only; business rules
 * (ownership, holdings, existence of referenced rows) stay in the routes. Invalid input gives a
 * 400 with a readable message instead of reaching Prisma and failing as a 500.
 */

export type BodyResult<T> = { ok: true; data: T } | { ok: false; response: NextResponse };

const money = z
  .union([z.number(), z.string()])
  .refine((value) => parseMoney(value) !== null, { message: 'must be a finite number' });

const quantity = z
  .union([z.number(), z.string()])
  .refine((value) => parseQuantity(value) !== null, { message: 'must be a finite number' });

const positiveQuantity = quantity.refine((value) => parseQuantity(value)!.gt(0), {
  message: 'must be greater than 0',
});

const dateString = z
  .string()
  .refine((value) => parseDisplayDate(value) !== null, { message: 'must be a valid date' });

const positiveId = z.coerce.number().int().positive();

const nullableText = z.string().nullable().optional();

export const transactionCreateSchema = z.object({
  name: z.string().trim().min(1, 'is required'),
  date: dateString,
  dateRaw: dateString.optional(),
  amount: money,
  category: nullableText,
  currencyId: positiveId.optional(),
  recurring: z
    .object({
      isRecurring: z.boolean().optional(),
      frequencyUnit: z.enum(FrequencyUnit).optional(),
      frequencyInterval: z.number().int().positive().optional(),
      startDate: dateString.optional(),
      endDate: dateString.nullable().optional(),
    })
    .optional(),
});

export const transactionUpdateSchema = z.object({
  id: positiveId,
  name: z.string().trim().min(1, 'is required'),
  date: dateString,
  amount: money,
  category: nullableText,
  currencyId: positiveId.nullable().optional(),
  investmentType: z.enum(InvestmentType).optional(),
  quantity: quantity.optional(),
  pricePerUnit: quantity.optional(),
});

export const recurringCreateSchema = z.object({
  name: z.string().trim().min(1, 'is required'),
  amount: money,
  currencyId: positiveId.optional(),
  category: nullableText,
  type: z.enum(TransactionType),
  startDate: dateString,
  endDate: dateString.nullable().optional(),
  frequencyUnit: z.enum(FrequencyUnit).optional(),
  frequencyInterval: z.number().int().positive().optional(),
  createInitial: z.boolean().optional(),
});

export const recurringUpdateSchema = recurringCreateSchema.partial().extend({
  id: positiveId,
  isActive: z.boolean().optional(),
});

export const goalCreateSchema = z.object({
  name: z.string().trim().min(1, 'is required'),
  targetDate: dateString,
  targetAmount: money,
  currentAmount: money.optional(),
  currencyId: positiveId.nullable().optional(),
});

export const goalUpdateSchema = goalCreateSchema.extend({
  id: positiveId,
  currentAmount: money,
});

export const investmentCreateSchema = z.object({
  assetId: positiveId.nullable().optional(),
  name: z.string().trim().min(1).optional(),
  ticker: z.string().nullable().optional(),
  assetType: z.enum(AssetType).optional(),
  pricingMode: z.enum(PricingMode).optional(),
  investmentType: z.enum(InvestmentType),
  quantity: positiveQuantity,
  pricePerUnit: positiveQuantity,
  date: dateString.optional(),
  currencyId: positiveId.optional(),
  notes: z.string().nullable().optional(),
  coingeckoId: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
});

export const assetUpdateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  ticker: z.string().nullable().optional(),
  manualPrice: quantity.nullable().optional(),
});

export const userSettingsSchema = z.object({
  dateOfBirth: z.union([dateString, z.literal('')]).nullable().optional(),
  country: z.string().nullable().optional(),
  profession: z.string().nullable().optional(),
  languageId: positiveId.nullable().optional(),
  currencyId: positiveId.nullable().optional(),
  incomeTaxRate: z.union([z.number(), z.string()]).nullable().optional(),
  dataSharingEnabled: z.boolean().optional(),
  notificationSettings: z.record(z.string(), z.unknown()).nullable().optional(),
});

/** Reads and validates a JSON body. On failure the result carries a ready 400 response. */
export async function parseJsonBody<T>(request: Request, schema: z.ZodType<T>): Promise<BodyResult<T>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return badRequest('Request body must be valid JSON');
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    const message = describeIssues(result.error);
    return badRequest(message);
  }
  return { ok: true, data: result.data };
}

function describeIssues(error: z.ZodError): string {
  const parts = error.issues.map((issue) => {
    const field = issue.path.join('.');
    return field ? `${field}: ${issue.message}` : issue.message;
  });
  return `Invalid request: ${parts.join('; ')}`;
}

function badRequest(message: string): BodyResult<never> {
  const response = NextResponse.json({ error: message }, { status: 400 });
  return { ok: false, response };
}
