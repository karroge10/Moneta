import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { Category } from '@/types/dashboard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';


export async function GET(request: NextRequest) {
  try {
    const user = await requireCurrentUser();

    const [standardCategories, categoryUsageCounts] = await Promise.all([
      db.category.findMany({
        orderBy: {
          name: 'asc',
        },
      }),
      db.transaction.groupBy({
        by: ['categoryId'],
        where: {
          userId: user.id,
          investmentAssetId: null,
          categoryId: {
            not: null,
          },
        },
        _count: {
          categoryId: true,
        },
      }),
    ]);
    
    
    const usageMap = new Map<number, number>();
    categoryUsageCounts.forEach((item) => {
      if (item.categoryId) {
        usageMap.set(item.categoryId, item._count.categoryId);
      }
    });
    
    
    const categories: (Category & { usageCount: number; type?: string | null })[] = standardCategories.map((cat: { id: number; name: string; icon: string; color: string; type: string | null }) => ({
      id: cat.id.toString(),
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      type: cat.type || null,
      usageCount: usageMap.get(cat.id) || 0,
    }));

    
    
    categories.sort((a, b) => {
      if (b.usageCount !== a.usageCount) {
        return b.usageCount - a.usageCount;
      }
      return a.name.localeCompare(b.name);
    });
    
    
    const sortedCategories: (Category & { type?: string | null })[] = categories.map(({ usageCount, ...cat }) => cat);
    
    return NextResponse.json({ categories: sortedCategories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}




