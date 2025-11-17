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
    
    // Fetch standard categories
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
    
    // Transform standard categories
    const categories: Category[] = standardCategories.map((cat: { id: number; name: string; icon: string; color: string }) => ({
      id: cat.id.toString(),
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
    }));
    
    // Add custom categories (use standard category icon/color if linked, otherwise use custom)
    customCategories.forEach((customCat: { id: number; name: string; icon: string | null; color: string | null; category: { icon: string; color: string } | null }) => {
      const existingIndex = categories.findIndex((c: Category) => c.name === customCat.name);
      if (existingIndex >= 0) {
        // Update existing category with custom icon/color if provided
        if (customCat.icon) categories[existingIndex].icon = customCat.icon;
        if (customCat.color) categories[existingIndex].color = customCat.color;
      } else {
        // Add new custom category
        categories.push({
          id: customCat.id.toString(),
          name: customCat.name,
          icon: customCat.icon || customCat.category?.icon || 'HelpCircle',
          color: customCat.color || customCat.category?.color || '#AC66DA',
        });
      }
    });
    
    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}


