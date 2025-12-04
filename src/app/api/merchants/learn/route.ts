/**
 * API endpoint to learn merchant-to-category mappings from user corrections
 * Called when user manually corrects a category during import or edits a transaction
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { normalizeMerchantName, extractMerchantFromDescription } from '@/lib/merchant';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const body = await request.json();
    
    const { description, categoryId } = body as {
      description: string;
      categoryId: number;
    };

    if (!description || !categoryId) {
      return NextResponse.json(
        { error: 'description and categoryId are required' },
        { status: 400 },
      );
    }

    // Verify category exists
    const category = await db.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 },
      );
    }

    // Extract and normalize merchant name
    // Description should already be in English (translatedDescription) when called from import flow
    // But handle both cases: if it's still in original language, try to extract anyway
    const merchantName = extractMerchantFromDescription(description);
    const normalizedMerchant = normalizeMerchantName(merchantName);

    if (!normalizedMerchant || normalizedMerchant.length < 2) {
      console.warn('[merchants/learn] Could not extract merchant name', {
        description,
        extracted: merchantName,
        normalized: normalizedMerchant,
      });
      return NextResponse.json(
        { error: 'Could not extract merchant name from description' },
        { status: 400 },
      );
    }

    // Upsert merchant mapping (create or increment matchCount)
    const merchant = await db.merchant.upsert({
      where: {
        userId_namePattern: {
          userId: user.id,
          namePattern: normalizedMerchant,
        },
      },
      update: {
        categoryId,
        matchCount: { increment: 1 },
        updatedAt: new Date(),
      },
      create: {
        userId: user.id,
        namePattern: normalizedMerchant,
        categoryId,
        matchCount: 1,
      },
    });

    return NextResponse.json({
      ok: true,
      merchant: {
        id: merchant.id,
        namePattern: merchant.namePattern,
        categoryId: merchant.categoryId,
        matchCount: merchant.matchCount,
      },
    });
  } catch (error) {
    console.error('[merchants/learn] error', error);
    
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      );
    }

    return NextResponse.json(
      { error: 'Unable to learn merchant mapping.' },
      { status: 500 },
    );
  }
}


