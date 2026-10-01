import { auth } from '@clerk/nextjs/server';
import { Prisma } from '@prisma/client';
import { db } from './db';
import { UnauthorizedError } from './api-errors';


export async function getCurrentUser() {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    return null;
  }

  const user = await db.user.findUnique({
    where: { clerkUserId },
  });

  if (user) {
    return user;
  }

  await createUserIfMissing(clerkUserId);
  return db.user.findUnique({
    where: { clerkUserId },
  });
}


export async function requireCurrentUser() {
  const user = await getCurrentUser();

  if (!user) {
    throw new UnauthorizedError('Unauthorized: User not authenticated');
  }

  return user;
}


export async function requireCurrentUserWithLanguage() {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    throw new UnauthorizedError('Unauthorized: User not authenticated');
  }

  const existingUser = await db.user.findUnique({
    where: { clerkUserId },
    include: { language: true },
  });

  if (existingUser) {
    return existingUser;
  }

  await createUserIfMissing(clerkUserId);
  const user = await db.user.findUnique({
    where: { clerkUserId },
    include: { language: true },
  });

  if (!user) {
    throw new UnauthorizedError('Unauthorized: Failed to create or find user');
  }

  return user;
}


/**
 * Creates the local user row (with default language, currency and notification settings) for a
 * Clerk user seen for the first time. A concurrent request creating the same user is not an error.
 */
async function createUserIfMissing(clerkUserId: string): Promise<void> {
  const [englishLanguage, usdCurrency] = await Promise.all([
    db.language.findFirst({ where: { alias: 'en' }, select: { id: true } }),
    db.currency.findFirst({ where: { alias: 'USD' }, select: { id: true } }),
  ]);

  try {
    await db.user.create({
      data: {
        clerkUserId,
        languageId: englishLanguage?.id ?? null,
        currencyId: usdCurrency?.id ?? null,
        dataSharingEnabled: false,
        notificationSettings: {
          create: {
            pushNotifications: true,
            upcomingBills: true,
            upcomingIncome: true,
            investments: true,
            goals: true,
            promotionalEmail: true,
            aiInsights: true,
          },
        },
      },
    });
  } catch (error: unknown) {
    // Another request created the user simultaneously.
    const isDuplicate = error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
    if (!isDuplicate) {
      throw error;
    }
  }
}
