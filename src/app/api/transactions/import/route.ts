import { NextRequest, NextResponse } from 'next/server';
import { UploadedTransaction } from '@/types/dashboard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const inMemoryImports: UploadedTransaction[] = [];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const transactions = body?.transactions;

    if (!Array.isArray(transactions)) {
      return NextResponse.json(
        { error: 'transactions must be an array' },
        { status: 400 },
      );
    }

    const sanitized: UploadedTransaction[] = transactions
      .map((item: UploadedTransaction) => ({
        date: item.date,
        description: item.description,
        translatedDescription: item.translatedDescription ?? item.description,
        amount: Number(item.amount) || 0,
        category: item.category ?? null,
        confidence: typeof item.confidence === 'number' ? item.confidence : 0,
      }))
      .filter(item => Boolean(item.description) && Boolean(item.date));

    if (!sanitized.length) {
      return NextResponse.json(
        { error: 'No valid transactions provided.' },
        { status: 422 },
      );
    }

    inMemoryImports.unshift(...sanitized);

    console.info('[transactions/import] persisted transactions', sanitized.length);

    return NextResponse.json({ ok: true, transactions: sanitized });
  } catch (error) {
    console.error('[transactions/import] error', error);
    return NextResponse.json(
      { error: 'Unable to import transactions.' },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const page = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10));
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(searchParams.get('pageSize') ?? '12', 10)));
  const search = (searchParams.get('search') ?? '').toLowerCase();
  const category = searchParams.get('category');

  const filtered = inMemoryImports.filter(item => {
    const matchesCategory = !category || item.category === category;
    const matchesSearch =
      !search ||
      item.description.toLowerCase().includes(search) ||
      item.translatedDescription.toLowerCase().includes(search) ||
      (item.category ?? '').toLowerCase().includes(search);
    return matchesCategory && matchesSearch;
  });

  const total = filtered.length;
  const startIndex = (page - 1) * pageSize;
  const pageItems = filtered.slice(startIndex, startIndex + pageSize);

  return NextResponse.json({
    transactions: pageItems,
    total,
    page,
    pageSize,
  });
}

