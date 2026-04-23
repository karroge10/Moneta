import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { searchAssets } from '@/lib/assets';
import { requireCurrentUser } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        await requireCurrentUser();
        const searchParams = request.nextUrl.searchParams;
        const query = searchParams.get('query');

        if (!query) {
            return NextResponse.json({ assets: [] });
        }

        const assets = await searchAssets(query);
        return NextResponse.json({ assets });
    } catch (error) {
        console.error('[api/assets] GET error', error);
        return NextResponse.json({ assets: [] }, { status: 401 });
    }
}
