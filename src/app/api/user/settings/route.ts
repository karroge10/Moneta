import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * GET /api/user/settings
 * Get current user's settings
 */
export async function GET() {
  try {
    const user = await requireCurrentUser();

    const userWithRelations = await db.user.findUnique({
      where: { id: user.id },
      include: {
        language: true,
        currency: true,
      },
    });

    if (!userWithRelations) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      language: userWithRelations.language
        ? {
            id: userWithRelations.language.id,
            name: userWithRelations.language.name,
            alias: userWithRelations.language.alias,
          }
        : null,
      currency: userWithRelations.currency
        ? {
            id: userWithRelations.currency.id,
            name: userWithRelations.currency.name,
            symbol: userWithRelations.currency.symbol,
            alias: userWithRelations.currency.alias,
          }
        : null,
      defaultPage: userWithRelations.defaultPage,
      plan: userWithRelations.plan,
    });
  } catch (error) {
    console.error('Error fetching user settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user settings' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/user/settings
 * Update current user's settings
 * Body: { languageId?: number, currencyId?: number, defaultPage?: string }
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const body = await request.json();

    const updateData: {
      languageId?: number;
      currencyId?: number;
      defaultPage?: string;
    } = {};

    // Validate and set languageId
    if (body.languageId !== undefined) {
      if (body.languageId === null) {
        updateData.languageId = null;
      } else {
        const language = await db.language.findUnique({
          where: { id: body.languageId },
        });
        if (!language) {
          return NextResponse.json(
            { error: `Language with ID ${body.languageId} not found` },
            { status: 400 }
          );
        }
        updateData.languageId = body.languageId;
      }
    }

    // Validate and set currencyId
    if (body.currencyId !== undefined) {
      if (body.currencyId === null) {
        updateData.currencyId = null;
      } else {
        const currency = await db.currency.findUnique({
          where: { id: body.currencyId },
        });
        if (!currency) {
          return NextResponse.json(
            { error: `Currency with ID ${body.currencyId} not found` },
            { status: 400 }
          );
        }
        updateData.currencyId = body.currencyId;
      }
    }

    // Set defaultPage if provided
    if (body.defaultPage !== undefined) {
      updateData.defaultPage = body.defaultPage;
    }

    // Update user
    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: updateData,
      include: {
        language: true,
        currency: true,
      },
    });

    return NextResponse.json({
      message: 'Settings updated successfully',
      settings: {
        language: updatedUser.language
          ? {
              id: updatedUser.language.id,
              name: updatedUser.language.name,
              alias: updatedUser.language.alias,
            }
          : null,
        currency: updatedUser.currency
          ? {
              id: updatedUser.currency.id,
              name: updatedUser.currency.name,
              symbol: updatedUser.currency.symbol,
              alias: updatedUser.currency.alias,
            }
          : null,
        defaultPage: updatedUser.defaultPage,
        plan: updatedUser.plan,
      },
    });
  } catch (error) {
    console.error('Error updating user settings:', error);
    return NextResponse.json(
      { error: 'Failed to update user settings' },
      { status: 500 }
    );
  }
}

