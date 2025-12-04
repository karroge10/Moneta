import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { Category } from '@/types/dashboard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET - Fetch all categories (standard and custom)
export async function GET(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    
    // Fetch all standard categories (no filtering by type - client will filter)
    const standardCategories = await db.category.findMany({
      orderBy: {
        name: 'asc',
      },
    });
    
    // Fetch user's custom categories
    const customCategories = await db.categoriesCustom.findMany({
      where: {
        userId: user.id,
      },
      include: {
        category: true, // Include linked standard category if exists
      },
      orderBy: {
        name: 'asc',
      },
    });
    
    // Count transaction usage per category for this user
    const categoryUsageCounts = await db.transaction.groupBy({
      by: ['categoryId'],
      where: {
        userId: user.id,
        categoryId: {
          not: null,
        },
      },
      _count: {
        categoryId: true,
      },
    });
    
    // Create a map of categoryId -> usage count
    const usageMap = new Map<number, number>();
    categoryUsageCounts.forEach((item) => {
      if (item.categoryId) {
        usageMap.set(item.categoryId, item._count.categoryId);
      }
    });
    
    // Transform standard categories with usage counts and type
    const categories: (Category & { usageCount: number; type?: string | null })[] = standardCategories.map((cat: { id: number; name: string; icon: string; color: string; type: string | null }) => ({
      id: cat.id.toString(),
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      type: cat.type || null,
      usageCount: usageMap.get(cat.id) || 0,
    }));
    
    // Add custom categories (use standard category icon/color if linked, otherwise use custom)
    customCategories.forEach((customCat: { id: number; name: string; icon: string | null; color: string | null; category: { icon: string; color: string } | null; categoryId: number | null }) => {
      const existingIndex = categories.findIndex((c: Category) => c.name === customCat.name);
      if (existingIndex >= 0) {
        // Update existing category with custom icon/color if provided
        if (customCat.icon) categories[existingIndex].icon = customCat.icon;
        if (customCat.color) categories[existingIndex].color = customCat.color;
        // If custom category is linked to a standard category, use that usage count
        if (customCat.categoryId) {
          categories[existingIndex].usageCount = usageMap.get(customCat.categoryId) || 0;
        }
      } else {
        // Add new custom category
        const usageCount = customCat.categoryId ? (usageMap.get(customCat.categoryId) || 0) : 0;
        categories.push({
          id: customCat.id.toString(),
          name: customCat.name,
          icon: customCat.icon || customCat.category?.icon || 'HelpCircle',
          color: customCat.color || customCat.category?.color || '#AC66DA',
          usageCount,
        });
      }
    });
    
    // Sort by usage count (descending), then alphabetically by name
    categories.sort((a, b) => {
      if (b.usageCount !== a.usageCount) {
        return b.usageCount - a.usageCount;
      }
      return a.name.localeCompare(b.name);
    });
    
    // Remove usageCount from final response (it was only for sorting), but keep type
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




