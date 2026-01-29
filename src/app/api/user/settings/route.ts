import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { requireCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * GET /api/user/settings
 * Get current user's settings and option lists for language/currency
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

    const [taxRateRows, languages, currencies, clerkUser] = await Promise.all([
      db.$queryRaw<[{ incomeTaxRate: number | null }]>`
        SELECT "incomeTaxRate" FROM "User" WHERE id = ${user.id}
      `,
      db.language.findMany({ orderBy: { name: 'asc' } }),
      db.currency.findMany({ orderBy: { name: 'asc' } }),
      currentUser(),
    ]);
    const incomeTaxRate = taxRateRows[0]?.incomeTaxRate ?? null;
    const email = clerkUser?.primaryEmailAddress?.emailAddress ?? null;

    const u = userWithRelations as typeof userWithRelations & {
      dateOfBirth?: Date | null;
      country?: string | null;
      city?: string | null;
      profession?: string | null;
      dataSharingEnabled?: boolean | null;
    };

    return NextResponse.json({
      firstName: userWithRelations.firstName,
      lastName: userWithRelations.lastName,
      userName: userWithRelations.userName,
      email,
      dateOfBirth: u.dateOfBirth ? u.dateOfBirth.toISOString().slice(0, 10) : null,
      country: u.country ?? null,
      city: u.city ?? null,
      profession: u.profession ?? null,
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
      incomeTaxRate,
      dataSharingEnabled: u.dataSharingEnabled ?? true,
      languages: languages.map((l) => ({ id: l.id, name: l.name, alias: l.alias })),
      currencies: currencies.map((c) => ({ id: c.id, name: c.name, symbol: c.symbol, alias: c.alias })),
    });
  } catch (error) {
    console.error('Error fetching user settings:', error);
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch user settings' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/user/settings
 * Update current user's settings
 * Body: { firstName?, lastName?, userName?, dateOfBirth?, country?, city?, languageId?, currencyId?, defaultPage?, incomeTaxRate?, dataSharingEnabled? }
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const body = await request.json();

    const updateData: {
      firstName?: string | null;
      lastName?: string | null;
      userName?: string | null;
      dateOfBirth?: Date | null;
      country?: string | null;
      city?: string | null;
      profession?: string | null;
      languageId?: number | null;
      currencyId?: number | null;
      defaultPage?: string;
      incomeTaxRate?: number | null;
      dataSharingEnabled?: boolean | null;
    } = {};

    if (body.firstName !== undefined) {
      updateData.firstName = body.firstName === '' ? null : String(body.firstName);
    }
    if (body.lastName !== undefined) {
      updateData.lastName = body.lastName === '' ? null : String(body.lastName);
    }
    if (body.userName !== undefined) {
      const userName = body.userName === '' ? null : String(body.userName).trim();
      if (userName !== null && userName.length > 0) {
        const existing = await db.user.findFirst({
          where: { userName, id: { not: user.id } },
        });
        if (existing) {
          return NextResponse.json(
            { error: 'Username is already taken' },
            { status: 400 }
          );
        }
      }
      updateData.userName = userName;
    }
    if (body.dateOfBirth !== undefined) {
      if (body.dateOfBirth === null || body.dateOfBirth === '') {
        updateData.dateOfBirth = null;
      } else {
        const d = new Date(body.dateOfBirth);
        if (Number.isNaN(d.getTime())) {
          return NextResponse.json(
            { error: 'Invalid date of birth' },
            { status: 400 }
          );
        }
        updateData.dateOfBirth = d;
      }
    }
    if (body.country !== undefined) {
      updateData.country = body.country === '' ? null : String(body.country);
    }
    if (body.city !== undefined) {
      updateData.city = body.city === '' ? null : String(body.city);
    }
    if (body.profession !== undefined) {
      updateData.profession = body.profession === '' ? null : String(body.profession);
    }

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

    if (body.defaultPage !== undefined) {
      updateData.defaultPage = body.defaultPage;
    }

    if (body.incomeTaxRate !== undefined) {
      if (body.incomeTaxRate === null) {
        updateData.incomeTaxRate = null;
      } else {
        const rate = Number(body.incomeTaxRate);
        if (Number.isNaN(rate) || rate < 0 || rate > 100) {
          return NextResponse.json(
            { error: 'Income tax rate must be between 0 and 100' },
            { status: 400 }
          );
        }
        updateData.incomeTaxRate = rate;
      }
    }

    if (body.dataSharingEnabled !== undefined) {
      updateData.dataSharingEnabled = Boolean(body.dataSharingEnabled);
    }

    if (Object.keys(updateData).length > 0) {
      await db.user.update({
        where: { id: user.id },
        data: updateData,
        include: { language: true, currency: true },
      });
    }

    const updatedUser = await db.user.findUnique({
      where: { id: user.id },
      include: { language: true, currency: true },
    });

    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const u = updatedUser as typeof updatedUser & {
      dateOfBirth?: Date | null;
      dataSharingEnabled?: boolean | null;
    };

    return NextResponse.json({
      message: 'Settings updated successfully',
      settings: {
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        userName: updatedUser.userName,
        dateOfBirth: u.dateOfBirth ? u.dateOfBirth.toISOString().slice(0, 10) : null,
        country: (updatedUser as { country?: string | null }).country ?? null,
        city: (updatedUser as { city?: string | null }).city ?? null,
        profession: (updatedUser as { profession?: string | null }).profession ?? null,
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
        incomeTaxRate: (updatedUser as { incomeTaxRate?: number | null }).incomeTaxRate ?? null,
        dataSharingEnabled: u.dataSharingEnabled ?? true,
      },
    });
  } catch (error) {
    console.error('Error updating user settings:', error);
    const message =
      error instanceof Error && process.env.NODE_ENV === 'development'
        ? error.message
        : 'Failed to update user settings';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

