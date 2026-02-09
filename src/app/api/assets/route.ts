import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { searchAssets } from '@/lib/assets';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query');

    if (!query) {
        return NextResponse.json({ assets: [] });
    }

    const assets = await searchAssets(query);
    return NextResponse.json({ assets });
}
